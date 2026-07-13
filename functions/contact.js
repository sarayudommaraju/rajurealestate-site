/*
  File: functions/contact.js
  Purpose: Cloudflare Pages Function. Receives the site's contact/enquiry form
           (POST /contact) and emails the lead to you via the Resend API.
  Engine: Cloudflare Pages Functions (Workers runtime, V8). No npm build.
  Platform: Deploys automatically with the site; route = /contact.
  Env vars (set in Cloudflare dashboard → Pages project → Settings → Variables):
    RESEND_API_KEY  (required)  Resend API key, e.g. re_xxx
    LEAD_TO_EMAIL   (required)  where leads are delivered, e.g. you@gmail.com
    LEAD_FROM_EMAIL (optional)  verified sender; default noreply@rajurealestate.com
  Expected behavior: returns { ok: true } on success (HTTP 200), JSON error otherwise.
  Known failure modes:
    - 500 "Email not configured" if RESEND_API_KEY / LEAD_TO_EMAIL are unset.
    - Resend rejects the send until the FROM domain is verified in Resend.
  Docs: https://resend.com/docs/api-reference/emails/send-email
        https://developers.cloudflare.com/pages/functions/
*/

export async function onRequestPost(context) {
  const { request, env } = context;

  // Basic CORS/JSON guard. Same-origin form, so keep it simple.
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { "Content-Type": "application/json" }
    });

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  // Honeypot: bots fill _hp. Pretend success, send nothing.
  if (body._hp) return json({ ok: true });

  const name = (body.name || "").toString().trim().slice(0, 120);
  const phone = (body.phone || "").toString().trim().slice(0, 40);
  const email = (body.email || "").toString().trim().slice(0, 160);
  const city = (body.city || "").toString().trim().slice(0, 80);
  const message = (body.message || "").toString().trim().slice(0, 4000);
  const property = (body.property || "").toString().trim().slice(0, 200);
  const source = (body.source || "Website").toString().trim().slice(0, 120);

  if (!name || !phone) {
    return json({ ok: false, error: "Name and phone are required." }, 422);
  }

  if (!env.RESEND_API_KEY || !env.LEAD_TO_EMAIL) {
    // Misconfiguration: surface clearly so it is caught during setup.
    return json({ ok: false, error: "Email not configured on the server." }, 500);
  }

  const from = env.LEAD_FROM_EMAIL || "Raju Real Estate <noreply@rajurealestate.com>";
  const subject = property
    ? `New enquiry: ${property}`
    : `New website enquiry from ${name}`;

  const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
  const rows = [
    ["Name", name],
    ["Phone", phone],
    ["Email", email || "—"],
    ["City", city || "—"],
    ["Property", property || "—"],
    ["Source", source],
    ["Message", message || "—"]
  ].map(([k, v]) => `<tr><td style="padding:6px 12px;font-weight:600;color:#312e81">${k}</td><td style="padding:6px 12px">${esc(v)}</td></tr>`).join("");

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px">
      <h2 style="color:#4338ca;margin:0 0 12px">New lead — Raju Real Estate</h2>
      <table style="border-collapse:collapse;width:100%;font-size:14px">${rows}</table>
      <p style="color:#6b70a0;font-size:12px;margin-top:16px">Sent from rajurealestate.com</p>
    </div>`;

  const text =
    `New lead — Raju Real Estate\n\nName: ${name}\nPhone: ${phone}\nEmail: ${email || "-"}\n` +
    `City: ${city || "-"}\nProperty: ${property || "-"}\nSource: ${source}\nMessage: ${message || "-"}\n`;

  const payload = {
    from,
    to: [env.LEAD_TO_EMAIL],
    subject,
    html,
    text
  };
  // Reply straight to the lead's email if they gave one.
  if (email) payload.reply_to = email;

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const detail = await resp.text();
      return json({ ok: false, error: "Email service rejected the request.", detail }, 502);
    }
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: "Could not reach the email service." }, 502);
  }
}

// Reject non-POST methods cleanly.
export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  return onRequestPost(context);
}
