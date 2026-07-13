/*
  File: js/home.js
  Purpose: Home page — populate city dropdown, featured grid, live count.
  Engine: Vanilla JS. Depends on site.js + cards.js.
*/
(function () {
  var citySel = document.getElementById("qs-city");
  (window.RRE_CONFIG.cities || []).forEach(function (c) {
    var o = document.createElement("option"); o.value = c; o.textContent = c; citySel.appendChild(o);
  });

  loadListings().then(function (all) {
    var live = all.filter(function (l) { return l.status !== "sold"; });
    document.getElementById("stat-count").textContent = live.length;

    var featured = all.filter(function (l) { return l.featured; });
    if (featured.length < 3) featured = all.slice(0, 6);
    featured = featured.slice(0, 6);

    var grid = document.getElementById("featured-grid");
    grid.innerHTML = featured.map(cardHTML).join("");
    // Re-run reveal for freshly injected cards
    grid.querySelectorAll(".reveal").forEach(function (e) { e.classList.add("in"); });
    // Translate freshly injected card buttons to the active language
    if (window.rreApplyLang) window.rreApplyLang(window.rreLang());
  }).catch(function (e) {
    document.getElementById("featured-grid").innerHTML =
      '<p class="muted">Could not load listings. If you opened this file directly, run it through a local server (see README).</p>';
    console.error(e);
  });

  /* ---- Testimonials (hidden until at least one loads) ---- */
  fetch("data/testimonials.json", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      var items = ((j && j.testimonials) || []).slice();
      if (!items.length) return;
      // Show a random 9 so repeat visitors see different stories.
      for (var i = items.length - 1; i > 0; i--) { var k = Math.floor(Math.random() * (i + 1)); var tmp = items[i]; items[i] = items[k]; items[k] = tmp; }
      var grid = document.getElementById("testimonials-grid");
      grid.innerHTML = items.slice(0, 9).map(function (t) {
        var r = Math.max(0, Math.min(5, t.rating == null ? 5 : t.rating));
        var stars = "★".repeat(r) + "☆".repeat(5 - r);
        var initial = (t.name || "?").trim().charAt(0).toUpperCase();
        return '<div class="testi-card reveal in">' +
          '<div class="testi-stars">' + stars + '</div>' +
          '<p class="testi-quote">' + esc(t.quote || "") + '</p>' +
          '<div class="testi-who"><div class="ava">' + esc(initial) + '</div><div><b>' + esc(t.name || "") + '</b>' +
          '<span>' + esc([t.deal, t.city].filter(Boolean).join(" · ")) + '</span></div></div>' +
        '</div>';
      }).join("");
      document.getElementById("testimonials-section").style.display = "";
    })
    .catch(function () { /* no testimonials: leave section hidden */ });

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
})();
