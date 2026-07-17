/*
  File: js/sitemap-page.js
  Purpose: Builds the grouped-by-city listing links on sitemap.html. Externalised
           from an inline <script> so the site CSP can forbid inline scripts.
  Engine: Vanilla JS. Depends on site.js (loadListings).
*/
(function () {
  if (typeof loadListings !== "function") return;
  var mount = document.getElementById("sitemap-listings");
  if (!mount) return;

  // Escape every data-derived value before it reaches innerHTML, and encode ids
  // used in URLs. listings.json is ours, so this is not a live hole; it keeps one
  // habit across the codebase so a future field can never become the exception.
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  loadListings().then(function (all) {
    var byCity = {};
    all.forEach(function (l) { (byCity[l.city] = byCity[l.city] || []).push(l); });
    var html = "";
    Object.keys(byCity).sort().forEach(function (city) {
      html += '<h3 style="font-size:1.05rem;margin:18px 0 8px">' + esc(city) + '</h3><ul class="amenities">';
      byCity[city].forEach(function (l) {
        var tag = l.status === "sold" ? ' <span class="muted">(sold)</span>' : '';
        html += '<li><svg class="icon" viewBox="0 0 24 24" style="color:var(--brand)"><path d="M9 18l6-6-6-6"/></svg>' +
          '<a href="property.html?id=' + encodeURIComponent(l.id) + '">' + esc(l.title) + ' — ' + esc(l.locality) + tag + '</a></li>';
      });
      html += '</ul>';
    });
    mount.innerHTML = html;
  }).catch(function () {
    mount.innerHTML = '<p class="muted">Could not load listings.</p>';
  });
})();
