/*
  File: functions/api/contact.js
  Purpose: Cloudflare Pages Function. Receives the site's contact/enquiry form
           (POST /api/contact) and emails the lead to you via the Resend API.
  Engine: Cloudflare Pages Functions (Workers runtime, V8). No npm build.
  Platform: Deploys automatically with the site; route = /api/contact.
    Route must NOT be /contact: that collides with contact.html's clean URL.
  Env vars (set in Cloudflare dashboard → Pages project → Settings → Variables):
    RESEND_API_KEY      (required)  Resend API key, e.g. re_xxx
    LEAD_TO_EMAIL       (required)  where leads are delivered, e.g. you@gmail.com
    LEAD_FROM_EMAIL     (optional)  verified sender; default noreply@rajurealestate.com
    TURNSTILE_SECRET_KEY(optional)  when set, the Turnstile token is enforced;
                                    when unset, the form still works unprotected.
  Request contract: same-origin JSON POST, <= 20000 bytes, body must be an object.
  Expected behavior: returns { ok: true } on success (HTTP 200), JSON error otherwise.
  Input handling: every field is control-character stripped (CR/LF included) before
    use, because name/property reach the mail Subject. reply_to is set only when the
    supplied email parses as an address.
  Responses never echo upstream (Resend) error text: that detail goes to the
    Function log only, so a caller cannot probe the mail config by forcing failures.
  Known failure modes:
    - 500 "Email not configured" if RESEND_API_KEY / LEAD_TO_EMAIL are unset.
    - Resend rejects the send until the FROM domain is verified in Resend.
    - 413 on oversize bodies; 415 on a non-JSON Content-Type; 403 on a bad Turnstile token.
  Docs: https://resend.com/docs/api-reference/emails/send-email
        https://developers.cloudflare.com/pages/functions/
        https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
*/

export async function onRequestPost(context) {
  const { request, env } = context;

  // JSON responses carry hardening headers and are never cached (they hold PII).
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: {
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer"
      }
    });

  // Reject anything that isn't a same-origin JSON POST of a sane size.
  if ((request.headers.get("Content-Type") || "").indexOf("application/json") === -1) {
    return json({ ok: false, error: "Invalid request." }, 415);
  }
  const MAX_BYTES = 20000;
  // Content-Length is a hint, not a guarantee: a chunked request omits it and the
  // header check alone would pass with clen=0, then parse an unbounded body. So
  // reject on the declared size when present AND measure what actually arrived.
  const clen = +(request.headers.get("Content-Length") || 0);
  if (clen > MAX_BYTES) return json({ ok: false, error: "Payload too large." }, 413);

  let body;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BYTES) return json({ ok: false, error: "Payload too large." }, 413);
    body = JSON.parse(raw);
  } catch (_) {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  // A JSON body must be an object. `"x"`, `[]` and `null` all parse fine but would
  // make every body.field read below return undefined, or throw on null.
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  // Honeypot: bots fill _hp. Pretend success, send nothing.
  if (body._hp) return json({ ok: true });

  // Cloudflare Turnstile: enforced only when the secret is configured, so the
  // form keeps working until Turnstile is set up. Verifies the client token
  // against Cloudflare and binds it to the caller's IP.
  if (env.TURNSTILE_SECRET_KEY) {
    const token = (body.token || "").toString();
    if (!token) return json({ ok: false, error: "Verification required." }, 403);
    try {
      const fd = new FormData();
      fd.append("secret", env.TURNSTILE_SECRET_KEY);
      fd.append("response", token);
      const ip = request.headers.get("CF-Connecting-IP");
      if (ip) fd.append("remoteip", ip);
      const vr = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: fd });
      const vj = await vr.json();
      if (!vj.success) return json({ ok: false, error: "Verification failed. Please try again." }, 403);
    } catch (_) {
      return json({ ok: false, error: "Could not verify. Please try again." }, 502);
    }
  }

  // Strip CR/LF and other C0 control characters from every field before use.
  // Why: `name` and `property` reach the mail Subject. Resend's JSON API encodes
  // headers correctly today, so this is not exploitable through it, but header
  // injection must be blocked in OUR code rather than trusted to a third party's
  // encoder. Newlines survive .trim() (it only strips leading/trailing), so a
  // mid-string "\nBcc:" would otherwise pass straight through.
  // \n is kept in `message` alone: it is a body field, never a header.
  const clean = (v, max) =>
    String(v == null ? "" : v).replace(/[\x00-\x1F\x7F]/g, " ").trim().slice(0, max);
  const cleanMultiline = (v, max) =>
    String(v == null ? "" : v).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ").trim().slice(0, max);

  const name = clean(body.name, 120);
  const phone = clean(body.phone, 40);
  const email = clean(body.email, 160);
  const city = clean(body.city, 80);
  const message = cleanMultiline(body.message, 4000);
  const property = clean(body.property, 200);
  const source = clean(body.source || "Website", 120);

  if (!name || !phone) {
    return json({ ok: false, error: "Name and phone are required." }, 422);
  }

  // Reject a malformed address rather than handing it to Resend as reply_to.
  // Deliberately permissive: this guards the header, it does not police what a
  // real lead may type. An invalid address drops reply_to; the lead still sends.
  const emailOk = email !== "" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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
  // Reply straight to the lead's email, but only when it parses as an address.
  // A malformed value is dropped rather than forwarded to Resend as a header.
  if (emailOk) payload.reply_to = email;

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
      // Upstream detail goes to the Cloudflare log, NEVER to the caller. Echoing
      // Resend's raw error body let any visitor probe our mail configuration by
      // forcing a failure. Read it in the Pages dashboard under Functions > Logs.
      console.error("Resend rejected the send:", resp.status, await resp.text());
      return json({ ok: false, error: "Could not send right now. Please WhatsApp or call us." }, 502);
    }
    return json({ ok: true });
  } catch (err) {
    console.error("Resend unreachable:", err && err.message);
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
