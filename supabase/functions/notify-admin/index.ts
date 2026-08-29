import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY")
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL")
const FROM_EMAIL = Deno.env.get("FROM_EMAIL")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

function getMimeType(extension) {
  const ext = extension.toLowerCase()
  if (ext === "png") return "image/png"
  if (ext === "webp") return "image/webp"
  return "image/jpeg"
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
    const { userId, userEmail, avatarChoice, avatarImageBase64, avatarImageType } = await req.json()

    if (!userId || !userEmail || !avatarChoice) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const attachments = []

    // 1. Fetch and attach the user's uploaded profile photo
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("avatar_path")
      .eq("id", userId)
      .single()

    if (profileError) {
      console.error("Profile lookup failed:", profileError.message)
    }

    if (profile?.avatar_path) {
      const { data: fileData, error: downloadError } = await supabaseAdmin
        .storage
        .from("avatars")
        .download(profile.avatar_path)

      if (downloadError) {
        console.error("Photo download failed:", downloadError.message)
      } else {
        const arrayBuffer = await fileData.arrayBuffer()
        const extension = profile.avatar_path.split(".").pop()
        attachments.push({
          content: arrayBufferToBase64(arrayBuffer),
          filename: `profile-photo.${extension}`,
          type: getMimeType(extension),
          disposition: "attachment",
        })
        console.log("Profile photo attached, size:", arrayBuffer.byteLength)
      }
    } else {
      console.log("No avatar_path found on profile for user:", userId)
    }

    // 2. Attach the chosen preset avatar image (sent from the frontend as base64)
    if (avatarImageBase64 && avatarImageType) {
      const ext = avatarImageType.split("/")[1] || "jpg"
      attachments.push({
        content: avatarImageBase64,
        filename: `chosen-avatar.${ext}`,
        type: avatarImageType,
        disposition: "attachment",
      })
      console.log("Preset avatar image attached")
    } else {
      console.log("No preset avatar image received from frontend")
    }

    const emailBody = {
      personalizations: [{ to: [{ email: ADMIN_EMAIL }] }],
      from: { email: FROM_EMAIL },
      subject: "New Personalized Avatar Request",
      content: [
        {
          type: "text/html",
          value: `
            <h2>New personalization request</h2>
            <p><strong>User ID:</strong> ${userId}</p>
            <p><strong>User Email:</strong> ${userEmail}</p>
            <p><strong>Chosen Base Avatar:</strong> ${avatarChoice}</p>
            <p>Attachments: ${attachments.map((a) => a.filename).join(", ") || "none"}</p>
          `,
        },
      ],
      ...(attachments.length > 0 && { attachments }),
    }

    const emailRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailBody),
    })

    if (!emailRes.ok) {
      const errText = await emailRes.text()
      throw new Error(`SendGrid API error: ${errText}`)
    }

    return new Response(JSON.stringify({ success: true, attachmentCount: attachments.length }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    })
  } catch (err) {
    console.error("notify-admin error:", err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    })
  }
})