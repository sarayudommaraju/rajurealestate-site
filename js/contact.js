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

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (form._hp && form._hp.value) return; // bot filled honeypot; silently drop
    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = "Sending…";
    var data = Object.fromEntries(new FormData(form).entries());
    data.source = "Contact page";

    fetch("/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
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
      .finally(function () { btn.disabled = false; btn.textContent = "Send enquiry"; });
  });
})();
