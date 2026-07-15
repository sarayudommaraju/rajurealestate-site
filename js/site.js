/*
  File: js/site.js
  Purpose: Shared helpers + shared UI (mobile nav, WhatsApp float, footer contacts,
           GA4 loader, price/area formatting, data loader). Loaded on every page.
  Engine: Vanilla JS. No dependencies.
  Platform: Static site on Cloudflare Pages.
  Known failure modes: fetch of data/listings.json fails if opened via file://
    (browsers block fetch on file://). Always serve over http(s) — see README.
*/
(function () {
  var C = window.RRE_CONFIG || {};

  /* ---------- CSP-safe image fallback (replaces inline onerror=) ----------
     Registered in the capture phase so it catches load failures of any <img>,
     including cards injected after fetch. Avatars fall back to an initial block;
     everything else to the branded placeholder. This lets the CSP forbid inline
     scripts entirely (no 'unsafe-inline' needed in script-src). */
  window.addEventListener("error", function (e) {
    var t = e.target;
    if (!t || t.tagName !== "IMG" || t.getAttribute("data-fellback")) return;
    t.setAttribute("data-fellback", "1");
    var p = t.parentNode;
    if (p && p.classList && p.classList.contains("header-agent")) { p.classList.add("is-fallback"); t.remove(); p.textContent = "R"; return; }
    if (t.classList.contains("avatar")) { t.outerHTML = '<div class="avatar">R</div>'; return; }
    if (t.getAttribute("src") !== "images/placeholder.svg") t.src = "images/placeholder.svg";
  }, true);

  /* ---------- Money: Indian lakh/crore formatting ---------- */
  // Why: Indian buyers read prices in ₹ Cr / ₹ L, not millions.
  window.formatPrice = function (rupees) {
    if (rupees == null || isNaN(rupees)) return "Price on request";
    if (rupees >= 10000000) {
      var cr = rupees / 10000000;
      return "₹ " + trim(cr) + " Cr";
    }
    if (rupees >= 100000) {
      var l = rupees / 100000;
      return "₹ " + trim(l) + " L";
    }
    return "₹ " + Number(rupees).toLocaleString("en-IN");
  };
  function trim(n) {
    // up to 2 decimals, strip trailing zeros
    return parseFloat(n.toFixed(2)).toString();
  }

  window.formatArea = function (val, unit) {
    if (val == null) return "";
    var u = { sqft: "sq.ft", sqyd: "sq.yd", acre: "acre" }[unit] || unit || "";
    return Number(val).toLocaleString("en-IN") + " " + u;
  };

  window.statusMeta = function (status) {
    return {
      sale: { label: "For Sale", cls: "badge--sale" },
      sold: { label: "Sold",     cls: "badge--sold" },
      rent: { label: "For Rent", cls: "badge--rent" }
    }[status] || { label: status, cls: "badge--type" };
  };

  window.typeLabel = function (t) {
    return { plot: "Plot", house: "House", villa: "Villa", apartment: "Apartment", commercial: "Commercial" }[t] || t;
  };

  /* ---------- Data loader (cached) ---------- */
  var _cache = null;
  window.loadListings = function () {
    if (_cache) return Promise.resolve(_cache);
    return fetch("data/listings.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) { _cache = j.listings || []; return _cache; });
  };

  /* ---------- Image path + fallback ---------- */
  window.listingImages = function (l) {
    var imgs = (l.images && l.images.length) ? l.images : [];
    if (!imgs.length) return ["images/placeholder.svg"];
    return imgs.map(function (f) { return "images/listings/" + l.id + "/" + f; });
  };
  // Image load failures are handled by the global capture-phase error listener
  // above (CSP-safe), so no inline onerror attributes are needed anywhere.

  /* ---------- WhatsApp link builder ---------- */
  window.waLink = function (message) {
    var num = C.whatsapp || "";
    var text = encodeURIComponent(message || ("Hi " + (C.brandName || "") + ", I'd like to know more about a property."));
    return "https://wa.me/" + num + "?text=" + text;
  };

  /* ---------- Shared UI injection ---------- */
  function injectShared() {
    // Fill any element with data-contact="phone|email|whatsapp|address|hours"
    document.querySelectorAll("[data-contact]").forEach(function (el) {
      var k = el.getAttribute("data-contact");
      var map = {
        phone: C.phoneDisplay, email: C.email,
        whatsapp: "+" + (C.whatsapp || ""), address: C.addressLine, hours: C.officeHours
      };
      if (el.tagName === "A") {
        if (k === "phone") el.href = "tel:" + (C.phoneDial || "");
        if (k === "email") el.href = "mailto:" + (C.email || "");
        if (k === "whatsapp") el.href = waLink();
      }
      if (!el.hasAttribute("data-keep-text")) el.textContent = map[k] || el.textContent;
    });

    // Floating WhatsApp button (one per page)
    if (!document.querySelector(".wa-float")) {
      var a = document.createElement("a");
      a.className = "wa-float";
      a.href = waLink();
      a.target = "_blank"; a.rel = "noopener";
      a.setAttribute("aria-label", "Chat on WhatsApp");
      a.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-.955zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>';
      document.body.appendChild(a);
    }

    // Header agent avatar (top-right, every page, links to Contact)
    var navCta = document.querySelector(".nav-cta");
    if (navCta && !navCta.querySelector(".header-agent")) {
      var ag = document.createElement("a");
      ag.className = "header-agent";
      ag.href = "contact.html";
      ag.title = "Radhakrishnama Raju — Managing Director";
      ag.setAttribute("aria-label", "Contact Radhakrishnama Raju");
      var agImg = document.createElement("img");
      agImg.src = "images/team/agent-raju.png";
      agImg.alt = "Radhakrishnama Raju";
      ag.appendChild(agImg); // load failure -> global error listener swaps to "R"
      navCta.appendChild(ag); // last child => far right
    }

    // Mobile nav toggle
    var toggle = document.querySelector(".nav-toggle");
    var links = document.querySelector(".nav-links");
    if (toggle && links) {
      toggle.addEventListener("click", function () { links.classList.toggle("open"); });
    }

    // Footer year
    document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  /* ---------- Structured data: RealEstateAgent + WebSite (Google-facing) ---------- */
  function injectSchema() {
    if (document.getElementById("rre-schema-org")) return;
    var org = {
      "@context": "https://schema.org", "@type": "RealEstateAgent",
      "name": C.brandName || "Raju Real Estate",
      "url": "https://rajurealestate.com/",
      "logo": "https://rajurealestate.com/images/og-cover.jpg",
      "image": "https://rajurealestate.com/images/og-cover.jpg",
      "telephone": C.phoneDial || "", "email": C.email || "",
      "areaServed": (C.cities || []).map(function (c) { return { "@type": "City", "name": c }; }),
      "address": { "@type": "PostalAddress", "addressLocality": "Hyderabad", "addressRegion": "Telangana", "addressCountry": "IN" }
    };
    var site = {
      "@context": "https://schema.org", "@type": "WebSite",
      "name": C.brandName || "Raju Real Estate", "url": "https://rajurealestate.com/",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://rajurealestate.com/listings.html?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    };
    var s = document.createElement("script");
    s.type = "application/ld+json"; s.id = "rre-schema-org";
    s.textContent = JSON.stringify([org, site]);
    document.head.appendChild(s);
  }

  /* ---------- Analytics event helper + auto WhatsApp/phone tracking ----------
     Fires to GA4 (gtag) and Meta Pixel (fbq) when either is configured. Key
     conversions map to Meta standard events so ad campaigns can optimise:
     whatsapp/phone clicks -> Contact, form submits -> Lead. Everything else
     goes to a custom event. No-ops silently when neither tag is loaded. */
  var META_STD = { whatsapp_click: "Contact", phone_click: "Contact", generate_lead: "Lead" };
  window.rreTrack = function (name, params) {
    if (typeof window.gtag === "function") window.gtag("event", name, params || {});
    if (typeof window.fbq === "function") {
      if (META_STD[name]) window.fbq("track", META_STD[name], params || {});
      else window.fbq("trackCustom", name, params || {});
    }
  };
  function setupTracking() {
    document.addEventListener("click", function (e) {
      if (!e.target.closest) return;
      var a = e.target.closest('a[href*="wa.me"]');
      if (a) { window.rreTrack("whatsapp_click", { link_url: a.href }); return; }
      var tel = e.target.closest('a[href^="tel:"]');
      if (tel) window.rreTrack("phone_click", { link_url: tel.href });
    });
  }

  /* ---------- Anchor scroll fallback for the Testimonials link ----------
     Native #hash scrolling can fail when the target loads after the click
     (testimonials render async and start hidden). This handles both the
     same-page click and arriving via a cross-page link with the hash set. */
  function smoothScrollTo(el) {
    if (!el) return;
    try { el.scrollIntoView({ behavior: "smooth", block: "start" }); }
    catch (e) { el.scrollIntoView(); }
  }
  function scrollToTestimonials() {
    if (location.hash !== "#testimonials-section") return;
    var el = document.getElementById("testimonials-section");
    if (!el) return;
    var n = 0; // section starts display:none until testimonials load; retry briefly
    (function attempt() {
      var shown = el.offsetParent !== null && getComputedStyle(el).display !== "none";
      if (shown) smoothScrollTo(el);
      else if (n++ < 25) setTimeout(attempt, 120);
    })();
  }
  function setupAnchorScroll() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href$="#testimonials-section"]');
      if (!a) return;
      var el = document.getElementById("testimonials-section");
      if (!el) return; // cross-page link, no section here: let it navigate normally
      e.preventDefault();
      var links = document.querySelector(".nav-links"); if (links) links.classList.remove("open");
      if (history && history.replaceState) history.replaceState(null, "", "#testimonials-section");
      smoothScrollTo(el);
    });
    window.addEventListener("hashchange", scrollToTestimonials);
    if (location.hash === "#testimonials-section") scrollToTestimonials();
  }

  /* ---------- GA4 (only if id present) ---------- */
  function loadGA() {
    if (!C.ga4Id) return;
    var s = document.createElement("script");
    s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + C.ga4Id;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag("js", new Date());
    gtag("config", C.ga4Id);
  }

  /* ---------- Meta (Facebook) Pixel — only if id present ----------
     Standard base snippet. Fires PageView on load; rreTrack() fires Contact
     and Lead conversions for ad optimisation. Leave metaPixelId blank to disable. */
  function loadMetaPixel() {
    if (!C.metaPixelId) return;
    /* eslint-disable */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    /* eslint-enable */
    window.fbq("init", C.metaPixelId);
    window.fbq("track", "PageView");
  }

  /* ---------- Count-up on numeric stats when scrolled into view ---------- */
  function countUp() {
    var els = document.querySelectorAll("[data-count]");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.textContent = e.getAttribute("data-count"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var el = en.target, target = parseFloat(el.getAttribute("data-count")) || 0, start = null, dur = 900;
        function tick(t) {
          if (!start) start = t;
          var p = Math.min((t - start) / dur, 1);
          el.textContent = p < 1 ? Math.round(target * p) : target;
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- Scroll reveal ---------- */
  function reveal() {
    var els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || !els.length) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    els.forEach(function (e) { io.observe(e); });
    // Safety net: never let a missed IntersectionObserver callback leave content
    // permanently invisible. Force-reveal anything still hidden after 2.5s.
    setTimeout(function () { els.forEach(function (e) { e.classList.add("in"); }); }, 2500);
  }

  document.addEventListener("DOMContentLoaded", function () {
    injectShared();
    injectSchema();
    setupTracking();
    setupAnchorScroll();
    loadGA();
    loadMetaPixel();
    countUp();
    reveal();
  });
})();
