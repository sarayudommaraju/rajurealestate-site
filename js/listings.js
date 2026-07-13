/*
  File: js/listings.js
  Purpose: Client-side filter/sort engine for the Listings page.
  Engine: Vanilla JS. Depends on site.js + cards.js.
  Behaviour: reads URL params (from Home quick-search / city links) as initial state,
    filters entirely in the browser (static site, no backend), updates URL for shareable links.
  Known failure modes: none server-side; all filtering is in-memory over listings.json.
*/
(function () {
  var ALL = [];
  var state = { keyword: "", city: "", locality: "", types: [], statuses: [], minPrice: "", maxPrice: "", minArea: "", areaUnit: "sqft", sort: "newest" };

  var el = {
    keyword: id("f-keyword"), city: id("f-city"), locality: id("f-locality"),
    typeWrap: id("f-type"), statusWrap: id("f-status"),
    minPrice: id("f-minprice"), maxPrice: id("f-maxprice"),
    minArea: id("f-minarea"), areaUnit: id("f-areaunit"),
    sort: id("f-sort"), results: id("results"), noResults: id("no-results"),
    count: id("result-count"), reset: id("reset-filters"), toggle: id("filter-toggle"), filters: id("filters")
  };
  function id(x) { return document.getElementById(x); }

  /* ---- read initial state from URL ---- */
  function fromURL() {
    var p = new URLSearchParams(location.search);
    state.city = p.get("city") || "";
    state.keyword = p.get("q") || "";
    if (p.get("type")) state.types = [p.get("type")];
    if (p.get("status")) state.statuses = [p.get("status")];
    state.maxPrice = p.get("maxPrice") || "";
    state.minPrice = p.get("minPrice") || "";
  }

  function syncControls() {
    el.keyword.value = state.keyword;
    el.city.value = state.city;
    el.minPrice.value = state.minPrice;
    el.maxPrice.value = state.maxPrice;
    el.minArea.value = state.minArea;
    el.areaUnit.value = state.areaUnit;
    el.sort.value = state.sort;
    setChips(el.typeWrap, state.types);
    setChips(el.statusWrap, state.statuses);
  }

  function setChips(wrap, active) {
    wrap.querySelectorAll(".chip").forEach(function (c) {
      c.classList.toggle("active", active.indexOf(c.getAttribute("data-val")) > -1);
    });
  }

  /* ---- populate city + locality selects from data ---- */
  function fillSelects() {
    var cities = (window.RRE_CONFIG.cities || []).slice();
    cities.forEach(function (c) { el.city.appendChild(opt(c, c)); });
    fillLocality();
  }
  function fillLocality() {
    // localities for the selected city (or all)
    var seen = {};
    el.locality.innerHTML = '<option value="">All localities</option>';
    ALL.filter(function (l) { return !state.city || l.city === state.city; })
      .forEach(function (l) {
        if (!seen[l.locality]) { seen[l.locality] = 1; el.locality.appendChild(opt(l.locality, l.locality)); }
      });
    el.locality.value = state.locality;
  }
  function opt(v, t) { var o = document.createElement("option"); o.value = v; o.textContent = t; return o; }

  /* ---- filtering ---- */
  function toSqft(val, unit) { return unit === "sqyd" ? val * 9 : (unit === "acre" ? val * 43560 : val); }

  function apply() {
    var out = ALL.filter(function (l) {
      if (state.city && l.city !== state.city) return false;
      if (state.locality && l.locality !== state.locality) return false;
      if (state.types.length && state.types.indexOf(l.type) === -1) return false;
      if (state.statuses.length && state.statuses.indexOf(l.status) === -1) return false;
      if (state.minPrice && l.price < +state.minPrice) return false;
      if (state.maxPrice && l.price > +state.maxPrice) return false;
      if (state.minArea) {
        var want = toSqft(+state.minArea, state.areaUnit);
        var have = toSqft(l.areaValue, l.areaUnit);
        if (have < want) return false;
      }
      if (state.keyword) {
        var hay = (l.title + " " + l.locality + " " + l.city + " " + l.ref + " " + l.type).toLowerCase();
        if (hay.indexOf(state.keyword.toLowerCase()) === -1) return false;
      }
      return true;
    });

    out.sort(function (a, b) {
      switch (state.sort) {
        case "price-asc": return a.price - b.price;
        case "price-desc": return b.price - a.price;
        case "area-desc": return toSqft(b.areaValue, b.areaUnit) - toSqft(a.areaValue, a.areaUnit);
        default: return new Date(b.listedOn) - new Date(a.listedOn);
      }
    });

    render(out);
    updateURL();
  }

  function render(list) {
    el.count.textContent = list.length;
    if (!list.length) { el.results.innerHTML = ""; el.noResults.style.display = "block"; return; }
    el.noResults.style.display = "none";
    el.results.innerHTML = list.map(cardHTML).join("");
    el.results.querySelectorAll(".reveal").forEach(function (e) { e.classList.add("in"); });
    if (window.rreApplyLang) window.rreApplyLang(window.rreLang());
  }

  function updateURL() {
    var p = new URLSearchParams();
    if (state.city) p.set("city", state.city);
    if (state.keyword) p.set("q", state.keyword);
    if (state.types.length === 1) p.set("type", state.types[0]);
    if (state.statuses.length === 1) p.set("status", state.statuses[0]);
    if (state.minPrice) p.set("minPrice", state.minPrice);
    if (state.maxPrice) p.set("maxPrice", state.maxPrice);
    var qs = p.toString();
    history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  }

  /* ---- events ---- */
  function wire() {
    el.keyword.addEventListener("input", debounce(function () { state.keyword = el.keyword.value.trim(); apply(); }, 200));
    el.city.addEventListener("change", function () { state.city = el.city.value; state.locality = ""; fillLocality(); apply(); });
    el.locality.addEventListener("change", function () { state.locality = el.locality.value; apply(); });
    el.minPrice.addEventListener("change", function () { state.minPrice = el.minPrice.value; apply(); });
    el.maxPrice.addEventListener("change", function () { state.maxPrice = el.maxPrice.value; apply(); });
    el.minArea.addEventListener("input", debounce(function () { state.minArea = el.minArea.value; apply(); }, 250));
    el.areaUnit.addEventListener("change", function () { state.areaUnit = el.areaUnit.value; apply(); });
    el.sort.addEventListener("change", function () { state.sort = el.sort.value; apply(); });

    chipHandler(el.typeWrap, "types");
    chipHandler(el.statusWrap, "statuses");

    el.reset.addEventListener("click", function () {
      state = { keyword: "", city: "", locality: "", types: [], statuses: [], minPrice: "", maxPrice: "", minArea: "", areaUnit: "sqft", sort: "newest" };
      fillLocality(); syncControls(); apply();
    });
    el.toggle.addEventListener("click", function () { el.filters.classList.toggle("open"); });
  }

  function chipHandler(wrap, key) {
    wrap.addEventListener("click", function (e) {
      var c = e.target.closest(".chip"); if (!c) return;
      var v = c.getAttribute("data-val");
      var arr = state[key];
      var i = arr.indexOf(v);
      if (i > -1) arr.splice(i, 1); else arr.push(v);
      c.classList.toggle("active");
      apply();
    });
  }

  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

  /* ---- boot ---- */
  fromURL();
  loadListings().then(function (all) {
    ALL = all;
    fillSelects();
    syncControls();
    wire();
    apply();
  }).catch(function (e) {
    el.results.innerHTML = '<p class="muted">Could not load listings. Serve the site over http (see README).</p>';
    console.error(e);
  });
})();
