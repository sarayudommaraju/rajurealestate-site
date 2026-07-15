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
  loadListings().then(function (all) {
    var byCity = {};
    all.forEach(function (l) { (byCity[l.city] = byCity[l.city] || []).push(l); });
    var html = "";
    Object.keys(byCity).sort().forEach(function (city) {
      html += '<h3 style="font-size:1.05rem;margin:18px 0 8px">' + city + '</h3><ul class="amenities">';
      byCity[city].forEach(function (l) {
        var tag = l.status === "sold" ? ' <span class="muted">(sold)</span>' : '';
        html += '<li><svg class="icon" viewBox="0 0 24 24" style="color:var(--brand)"><path d="M9 18l6-6-6-6"/></svg>' +
          '<a href="property.html?id=' + l.id + '">' + l.title + ' — ' + l.locality + tag + '</a></li>';
      });
      html += '</ul>';
    });
    mount.innerHTML = html;
  }).catch(function () {
    mount.innerHTML = '<p class="muted">Could not load listings.</p>';
  });
})();
