/*
  File: js/cards.js
  Purpose: Single source of the listing-card markup, shared by Home and Listings.
  Engine: Vanilla JS. Depends on site.js helpers (formatPrice, statusMeta, etc.).
  Why shared: one card design, edited in one place.
*/
window.cardHTML = function (l) {
  var sm = statusMeta(l.status);
  var thumb = listingImages(l)[0];
  var specs = [];
  if (l.type === "plot") {
    specs.push(specHTML("area", "Plot", formatArea(l.areaValue, l.areaUnit)));
    specs.push(specHTML("compass", "Facing", l.facing));
  } else if (l.type === "commercial") {
    specs.push(specHTML("area", "Built-up", formatArea(l.areaValue, l.areaUnit)));
    if (l.parking) specs.push(specHTML("car", "Parking", l.parking));
  } else {
    if (l.beds) specs.push(specHTML("bed", "Beds", l.beds));
    if (l.baths) specs.push(specHTML("bath", "Baths", l.baths));
    specs.push(specHTML("area", "Area", formatArea(l.areaValue, l.areaUnit)));
  }

  return '' +
  '<article class="card reveal">' +
    '<a class="card-media" href="property.html?id=' + l.id + '" aria-label="' + esc(l.title) + '">' +
      '<img src="' + thumb + '" alt="' + esc(l.title) + '" loading="lazy" onerror="' + imgFallback + '">' +
      '<div class="card-badges">' +
        '<span class="badge ' + sm.cls + '">' + sm.label + '</span>' +
        '<span class="badge badge--type">' + typeLabel(l.type) + '</span>' +
      '</div>' +
      (l.featured ? '<span class="badge badge--featured">★ Featured</span>' : '') +
    '</a>' +
    '<div class="card-body">' +
      '<div class="card-price">' + formatPrice(l.price) + (l.negotiable ? ' <small>Negotiable</small>' : '') + '</div>' +
      '<a href="property.html?id=' + l.id + '"><h3 class="card-title">' + esc(l.title) + '</h3></a>' +
      '<div class="card-loc">' + pinIcon() + esc(l.locality) + ', ' + esc(l.city) + '</div>' +
      '<div class="card-specs">' + specs.join('') + '</div>' +
      '<div class="card-foot">' +
        '<a class="btn btn--primary" href="property.html?id=' + l.id + '" data-i18n="cta.viewDetails">View details</a>' +
        '<a class="btn btn--wa" target="_blank" rel="noopener" href="' + waLink("Hi, I am interested in " + l.ref + " — " + l.title + " (" + formatPrice(l.price) + ").") + '" aria-label="Enquire on WhatsApp">' + waMini() + '</a>' +
      '</div>' +
    '</div>' +
  '</article>';
};

function specHTML(icon, label, val) {
  if (val == null || val === "") return "";
  return '<span class="spec">' + iconSvg(icon) + '<b>' + val + '</b> ' + label + '</span>';
}
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
function pinIcon() { return '<svg class="icon" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>'; }
function waMini() { return '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24z"/></svg>'; }
function iconSvg(name) {
  var paths = {
    bed: '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 012 2v10"/><path d="M2 17h20"/><path d="M6 8V6a2 2 0 012-2h4a2 2 0 012 2v2"/>',
    bath: '<path d="M4 12V5a2 2 0 012-2 2 2 0 012 2"/><path d="M2 12h20v3a4 4 0 01-4 4H6a4 4 0 01-4-4z"/><path d="M6 19v2M18 19v2"/>',
    area: '<path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    car: '<path d="M5 13l1.5-4.5A2 2 0 018.4 7h7.2a2 2 0 011.9 1.5L19 13"/><path d="M3 13h18v5H3z"/><circle cx="7" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/>'
  };
  return '<svg class="icon" viewBox="0 0 24 24">' + (paths[name] || '') + '</svg>';
}
