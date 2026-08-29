import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY")
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL")
const FROM_EMAIL = Deno.env.get("FROM_EMAIL")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

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
    const { userId, userEmail, avatarChoice } = await req.json()

    if (!userId || !userEmail || !avatarChoice) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Look up the user's profile to find their uploaded photo
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("avatar_path")
      .eq("id", userId)
      .single()

    if (profileError) {
      console.error("Profile lookup failed:", profileError)
    }

    let attachments = []

    if (profile?.avatar_path) {
      const { data: fileData, error: downloadError } = await supabaseAdmin
        .storage
        .from("avatars")
        .download(profile.avatar_path)

      if (downloadError) {
        console.error("Photo download failed:", downloadError)
      } else {
        const arrayBuffer = await fileData.arrayBuffer()
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
        )
        const extension = profile.avatar_path.split(".").pop()
        attachments.push({
          content: base64,
          filename: `profile-photo.${extension}`,
          type: extension === "png" ? "image/png" : "image/jpeg",
          disposition: "attachment",
        })
      }
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
            <p>${attachments.length > 0 ? "Their profile photo is attached." : "No profile photo was found for this user."}</p>
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

    return new Response(JSON.stringify({ success: true }), {
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
