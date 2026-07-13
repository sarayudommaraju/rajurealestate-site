/*
  File: js/property.js
  Purpose: Render a single property detail page from ?id=, incl. gallery,
           facts, amenities, Leaflet map, per-listing enquiry + EMI mini-calc.
  Engine: Vanilla JS + Leaflet (global L). Depends on site.js.
  Known failure modes: if ?id is missing/unknown, shows a not-found state.
    Map needs Leaflet loaded (CDN) before this script — script order handles it.
*/
(function () {
  var root = document.getElementById("pd-root");
  var C = window.RRE_CONFIG;
  var id = new URLSearchParams(location.search).get("id");

  loadListings().then(function (all) {
    var l = all.find(function (x) { return x.id === id; });
    if (!l) { notFound(); return; }
    document.title = l.title + " — Raju Real Estate";
    setMeta("description", l.title + " in " + l.locality + ", " + l.city + ". " + formatPrice(l.price) + ".");
    render(l, all);
  }).catch(function (e) {
    root.innerHTML = '<p class="muted" style="padding:60px 0">Could not load this property. Serve over http (see README).</p>';
    console.error(e);
  });

  function notFound() {
    root.innerHTML = '<div style="padding:80px 0;text-align:center"><h1>Property not found</h1><p class="muted">This listing may have been sold or removed.</p><a class="btn btn--primary" href="listings.html">Browse all listings</a></div>';
  }

  function render(l, all) {
    var sm = statusMeta(l.status);
    var imgs = listingImages(l);
    var isPlot = l.type === "plot";

    var facts = [];
    if (!isPlot && l.beds) facts.push(fact(l.beds, "Bedrooms"));
    if (!isPlot && l.baths) facts.push(fact(l.baths, "Bathrooms"));
    facts.push(fact(formatArea(l.areaValue, l.areaUnit), isPlot ? "Plot area" : "Built-up"));
    if (l.plotArea) facts.push(fact(formatArea(l.plotArea, l.plotUnit), "Plot"));
    facts.push(fact(l.facing || "—", "Facing"));
    if (l.parking) facts.push(fact(l.parking, "Parking"));
    if (l.floor) facts.push(fact(l.floor, "Floor"));
    if (l.yearBuilt) facts.push(fact(l.yearBuilt, "Built"));

    var gallery =
      '<figure class="g-main"><img src="' + imgs[0] + '" alt="' + esc(l.title) + '" data-i="0" onerror="' + imgFallback + '"></figure>' +
      imgs.slice(1, 5).map(function (src, i) {
        return '<figure><img src="' + src + '" alt="' + esc(l.title) + ' photo ' + (i + 2) + '" data-i="' + (i + 1) + '" onerror="' + imgFallback + '"></figure>';
      }).join("");

    var landmarks = (l.landmarks || []).map(function (t) {
      return '<li>' + check() + '<span>' + esc(t) + '</span></li>';
    }).join("");

    var amenities = (l.amenities || []).map(function (a) {
      return '<li>' + check() + '<span>' + esc(a) + '</span></li>';
    }).join("");

    var waMsg = "Hi, I'm interested in " + l.ref + " — " + l.title + " (" + formatPrice(l.price) + ") in " + l.locality + ", " + l.city + ".";

    root.innerHTML =
    '<div class="pd-head">' +
      '<div class="pd-crumb"><a href="listings.html">Listings</a> › <a href="listings.html?city=' + encodeURIComponent(l.city) + '">' + esc(l.city) + '</a> › ' + esc(l.locality) + '</div>' +
      '<div class="pd-title-row">' +
        '<div>' +
          '<div class="card-badges" style="position:static;margin-bottom:10px">' +
            '<span class="badge ' + sm.cls + '">' + sm.label + '</span>' +
            '<span class="badge badge--type">' + typeLabel(l.type) + '</span>' +
            (l.featured ? '<span class="badge badge--featured" style="position:static">★ Featured</span>' : '') +
          '</div>' +
          '<h1 style="font-size:2rem;margin:0">' + esc(l.title) + '</h1>' +
          '<div class="card-loc" style="margin-top:8px">' + pin() + esc(l.address) + '</div>' +
        '</div>' +
        '<div style="text-align:right">' +
          '<div class="pd-price">' + formatPrice(l.price) + '</div>' +
          (l.negotiable ? '<div class="muted" style="font-size:.85rem">Negotiable · Ref ' + esc(l.ref) + '</div>' : '<div class="muted" style="font-size:.85rem">Ref ' + esc(l.ref) + '</div>') +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="pd-gallery">' + gallery + '</div>' +

    '<div class="pd-layout">' +
      '<div>' +
        '<div class="pd-facts">' + facts.join("") + '</div>' +

        '<div class="pd-block">' +
          '<h2>Overview</h2>' +
          '<p>' + esc(l.description) + '</p>' +
          (l.vastu ? '<p class="muted"><strong>Vastu:</strong> ' + esc(l.vastu) + (l.furnishing && l.furnishing !== "NA" ? ' · <strong>Furnishing:</strong> ' + esc(l.furnishing) : '') + '</p>' : '') +
        '</div>' +

        (amenities ? '<div class="pd-block"><h2>Amenities</h2><ul class="amenities">' + amenities + '</ul></div>' : '') +

        '<div class="pd-block">' +
          '<h2>Location & landmarks</h2>' +
          (landmarks ? '<ul class="amenities" style="margin-bottom:16px">' + landmarks + '</ul>' : '') +
          '<div id="map"></div>' +
          '<p class="muted" style="margin-top:10px;font-size:.85rem">' + esc(l.address) + '</p>' +
        '</div>' +
      '</div>' +

      '<aside class="pd-aside">' +
        '<div class="agent-card">' +
          '<div class="who"><div class="avatar">R</div><div><b>' + esc((l.agent && l.agent.name) || "Raju") + '</b><div class="muted" style="font-size:.85rem">' + esc((l.agent && l.agent.role) || "Consultant") + '</div></div></div>' +
          '<a class="btn btn--primary btn--block" data-contact="phone" data-keep-text href="#" style="margin-bottom:8px">Call now</a>' +
          '<a class="btn btn--wa btn--block" target="_blank" rel="noopener" href="' + waLink(waMsg) + '">Enquire on WhatsApp</a>' +
        '</div>' +

        '<div class="enquire-card">' +
          '<h3>Enquire about this property</h3>' +
          '<form id="pd-enquiry">' +
            '<input type="hidden" name="property" value="' + esc(l.ref + " — " + l.title) + '">' +
            '<input type="text" name="_hp" style="display:none" tabindex="-1" autocomplete="off">' +
            '<div class="form-field"><input type="text" name="name" placeholder="Your name" required></div>' +
            '<div class="form-field"><input type="tel" name="phone" placeholder="Phone" required></div>' +
            '<div class="form-field"><textarea name="message" placeholder="I would like a site visit / more details…" style="min-height:90px"></textarea></div>' +
            '<button class="btn btn--primary btn--block" type="submit">Send enquiry</button>' +
            '<div class="form-status" id="pd-status"></div>' +
          '</form>' +
        '</div>' +

        '<div class="enquire-card">' +
          '<h3>EMI estimate</h3>' +
          '<div class="form-field"><label>Down payment (%)</label><input type="number" id="emi-down" value="' + C.emi.defaultDownPct + '" min="0" max="90"></div>' +
          '<div class="form-field"><label>Interest rate (% p.a.)</label><input type="number" id="emi-rate" value="' + C.emi.defaultRate + '" step="0.1" min="1"></div>' +
          '<div class="form-field"><label>Tenure (years)</label><input type="number" id="emi-years" value="' + C.emi.defaultTenureYears + '" min="1" max="30"></div>' +
          '<div class="emi-line"><span>Loan amount</span><b id="emi-loan">—</b></div>' +
          '<div class="emi-line"><span>Monthly EMI</span><b id="emi-out" style="color:var(--brand)">—</b></div>' +
          '<p class="form-note">Indicative only. Excludes processing fees and taxes.</p>' +
        '</div>' +
      '</aside>' +
    '</div>';

    initGallery(imgs);
    initMap(l);
    initEMI(l.price);
    initEnquiry(l);
    // shared UI (contact links) re-run since we injected new nodes
    document.querySelectorAll('[data-contact="phone"]').forEach(function (a) { if (a.tagName === "A") a.href = "tel:" + C.phoneDial; });
  }

  function fact(v, label) { return '<div class="fact"><b>' + v + '</b><span>' + label + '</span></div>'; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function check() { return '<svg class="icon" viewBox="0 0 24 24" style="color:var(--ok)"><path d="M20 6L9 17l-5-5"/></svg>'; }
  function pin() { return '<svg class="icon" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>'; }
  function setMeta(name, val) { var m = document.querySelector('meta[name="' + name + '"]'); if (m) m.setAttribute("content", val); }

  /* ---- Leaflet map (OpenStreetMap tiles, free) ---- */
  function initMap(l) {
    var lat = l.lat || C.mapDefault.lat, lng = l.lng || C.mapDefault.lng;
    var map = L.map("map", { scrollWheelZoom: false }).setView([lat, lng], l.lat ? 14 : C.mapDefault.zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    L.marker([lat, lng]).addTo(map).bindPopup("<b>" + esc(l.title) + "</b><br>" + esc(l.locality) + ", " + esc(l.city)).openPopup();
  }

  /* ---- EMI (reducing-balance) ---- */
  function initEMI(price) {
    var down = document.getElementById("emi-down"), rate = document.getElementById("emi-rate"), years = document.getElementById("emi-years");
    function calc() {
      var P = price * (1 - (+down.value || 0) / 100);
      var r = (+rate.value || 0) / 12 / 100;
      var n = (+years.value || 0) * 12;
      document.getElementById("emi-loan").textContent = formatPrice(Math.round(P));
      var emi = (n > 0 && r > 0) ? P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1) : (n > 0 ? P / n : 0);
      document.getElementById("emi-out").textContent = emi ? "₹ " + Math.round(emi).toLocaleString("en-IN") + " /mo" : "—";
    }
    [down, rate, years].forEach(function (i) { i.addEventListener("input", calc); });
    calc();
  }

  /* ---- Gallery lightbox ---- */
  function initGallery(imgs) {
    var lb = document.getElementById("lightbox"), lbImg = document.getElementById("lb-img"), cur = 0;
    document.querySelectorAll(".pd-gallery img").forEach(function (im) {
      im.addEventListener("click", function () { cur = +im.getAttribute("data-i"); show(); lb.classList.add("open"); });
    });
    function show() { lbImg.src = imgs[cur]; lbImg.onerror = function () { this.onerror = null; this.src = "images/placeholder.svg"; }; }
    lb.querySelector(".lb-close").addEventListener("click", function () { lb.classList.remove("open"); });
    lb.querySelector(".lb-next").addEventListener("click", function () { cur = (cur + 1) % imgs.length; show(); });
    lb.querySelector(".lb-prev").addEventListener("click", function () { cur = (cur - 1 + imgs.length) % imgs.length; show(); });
    lb.addEventListener("click", function (e) { if (e.target === lb) lb.classList.remove("open"); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") lb.classList.remove("open");
      if (e.key === "ArrowRight") { cur = (cur + 1) % imgs.length; show(); }
      if (e.key === "ArrowLeft") { cur = (cur - 1 + imgs.length) % imgs.length; show(); }
    });
  }

  /* ---- Per-listing enquiry -> Cloudflare function ---- */
  function initEnquiry(l) {
    var form = document.getElementById("pd-enquiry"), status = document.getElementById("pd-status");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form._hp && form._hp.value) return; // honeypot
      var btn = form.querySelector("button");
      btn.disabled = true; btn.textContent = "Sending…";
      var data = Object.fromEntries(new FormData(form).entries());
      data.source = "Property page: " + l.ref;
      fetch("/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok) { status.className = "form-status ok"; status.textContent = "Thanks. We'll call you shortly about " + l.ref + "."; form.reset(); }
          else { status.className = "form-status err"; status.textContent = (res.j && res.j.error) || "Could not send. Please WhatsApp us instead."; }
        })
        .catch(function () { status.className = "form-status err"; status.textContent = "Network error. Please WhatsApp or call us."; })
        .finally(function () { btn.disabled = false; btn.textContent = "Send enquiry"; });
    });
  }
})();
