/*
  File: js/config.js
  Purpose: Single place for site-wide constants you edit before go-live.
  Engine: Vanilla JS, loaded as a plain <script> (global RRE_CONFIG).
  Platform: Static site on Cloudflare Pages.
  EDIT THESE PLACEHOLDERS: phone, email, WhatsApp, address, GA4 id.
  Why one file: no build step, so config lives in a global you can hand-edit.
*/
window.RRE_CONFIG = {
  brandName: "Raju Real Estate",

  /* === FILL THESE BEFORE DEPLOY === */
  phoneDisplay: "+91 89196 24297",     // shown on the site
  phoneDial: "+9189196 24297",          // used in tel: links, no spaces
  email: "noreply@rajurealestate.com",   // shown + used in mailto:
  whatsapp: "918919624297",            // country code + number, no +, no spaces
  addressLine: "Kukatpally, Hyderabad",
  officeHours: "Mon–Sat, 9:30 AM – 7:00 PM IST",

  /* Analytics: paste your GA4 Measurement ID, e.g. G-ABCD12345. Leave blank to disable. */
  ga4Id: "",

  /* Default map center (Hyderabad) when a listing has no coordinates. */
  mapDefault: { lat: 17.4239, lng: 78.4738, zoom: 11 },

  cities: ["Hyderabad", "Chennai", "Bengaluru", "Vijayawada"],

  /* Loan defaults for the EMI calculator (editable). */
  emi: { defaultRate: 8.5, defaultTenureYears: 20, defaultDownPct: 20 }
};
