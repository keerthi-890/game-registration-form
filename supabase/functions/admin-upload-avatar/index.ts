import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

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
    const { userId, fileBase64 } = await req.json()

    if (!userId || !fileBase64) {
      return new Response(JSON.stringify({ error: "Missing userId or fileBase64" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const fileBytes = base64ToUint8Array(fileBase64)
    const filePath = `${userId}/character.glb`

    const { error: uploadError } = await supabaseAdmin.storage
      .from("avatars")
      .upload(filePath, fileBytes, {
        contentType: "model/gltf-binary",
        upsert: true,
      })

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`)
    }

    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from("avatars")
      .createSignedUrl(filePath, 60 * 60 * 24 * 7) // 7 days

    if (signedError) {
      throw new Error(`Signed URL creation failed: ${signedError.message}`)
    }

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ avatar_3d_url: signedData.signedUrl })
      .eq("id", userId)

    if (updateError) {
      throw new Error(`Profile update failed: ${updateError.message}`)
    }

    return new Response(
      JSON.stringify({ success: true, avatarUrl: signedData.signedUrl }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    )
  } catch (err) {
    console.error("admin-upload-avatar error:", err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    })
  }
})