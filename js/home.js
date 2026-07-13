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
})();
