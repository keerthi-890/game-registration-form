import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const HUGGINGFACE_API_KEY = Deno.env.get("HUGGINGFACE_API_KEY")

// This model classifies images as real photo vs AI-generated/illustration/cartoon
const MODEL_URL = "https://api-inference.huggingface.co/models/umm-maybe/AI-image-detector"

function base64ToUint8Array(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    })
  }

  try {
    const { imageBase64 } = await req.json()

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "Missing imageBase64" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const imageBytes = base64ToUint8Array(imageBase64)

    const hfRes = await fetch(MODEL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/octet-stream",
      },
      body: imageBytes,
    })

    if (!hfRes.ok) {
      const errText = await hfRes.text()
      throw new Error(`Hugging Face API error: ${errText}`)
    }

    const result = await hfRes.json()
    console.log("Classification result:", JSON.stringify(result))

    // Result looks like: [{ label: "human", score: 0.92 }, { label: "artificial", score: 0.08 }]
    const topResult = Array.isArray(result) ? result[0] : null
    const isRealPhoto = topResult?.label?.toLowerCase().includes("human") && topResult?.score > 0.6

    return new Response(
      JSON.stringify({
        isRealPhoto: Boolean(isRealPhoto),
        rawResult: result,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    )
  } catch (err) {
    console.error("verify-real-photo error:", err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    })
  }
})