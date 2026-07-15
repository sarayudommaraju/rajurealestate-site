/*
  File: js/contact.js
  Purpose: Submit the contact form to the Cloudflare Pages Function at /contact.
  Engine: Vanilla JS. Depends on site.js.
  Behaviour: POST JSON, show inline success/error. Honeypot field blocks bots.
*/
(function () {
  var form = document.getElementById("contact-form");
  var status = document.getElementById("contact-status");
  if (!form) return;

  /* Cloudflare Turnstile: render only when a site key is configured, so the form
     keeps working before Turnstile is set up. Token is captured on solve and
     sent with the POST; the Function verifies it when TURNSTILE_SECRET_KEY is set. */
  var tsToken = "", tsWidgetId = null;
  window.rreTurnstileLoad = function () {
    var key = (window.RRE_CONFIG && window.RRE_CONFIG.turnstileSiteKey) || "";
    var el = document.getElementById("turnstile-widget");
    if (!key || !el || !window.turnstile) return;
    tsWidgetId = window.turnstile.render(el, {
      sitekey: key,
      callback: function (t) { tsToken = t; },
      "expired-callback": function () { tsToken = ""; },
      "error-callback": function () { tsToken = ""; }
    });
  };

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (form._hp && form._hp.value) return; // bot filled honeypot; silently drop
    var btn = form.querySelector('button[type="submit"]');
    var needsToken = !!((window.RRE_CONFIG && window.RRE_CONFIG.turnstileSiteKey));
    if (needsToken && !tsToken) {
      status.className = "form-status err";
      status.textContent = "Please complete the verification checkbox and try again.";
      return;
    }
    btn.disabled = true; btn.textContent = "Sending…";
    var data = Object.fromEntries(new FormData(form).entries());
    data.source = "Contact page";
    if (tsToken) data.token = tsToken;

    fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok) {
          status.className = "form-status ok";
          status.textContent = "Thank you. Your enquiry has reached us, we'll be in touch shortly.";
          form.reset();
          if (window.rreTrack) window.rreTrack("generate_lead", { source: "contact", city: data.city || "" });
        } else {
          status.className = "form-status err";
          status.textContent = (res.j && res.j.error) || "Something went wrong. Please call or WhatsApp us.";
        }
      })
      .catch(function () {
        status.className = "form-status err";
        status.textContent = "Network error. Please call or WhatsApp us directly.";
      })
      .finally(function () {
        btn.disabled = false; btn.textContent = "Send enquiry";
        // Turnstile tokens are single-use: reset so the next submit needs a fresh one.
        if (tsWidgetId !== null && window.turnstile) { try { window.turnstile.reset(tsWidgetId); } catch (e) {} tsToken = ""; }
      });
  });
})();
