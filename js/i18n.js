/*
  File: js/i18n.js
  Purpose: English/Telugu UI toggle. Translates chrome + static-page copy only;
           listing DATA (titles, descriptions, specs) stays English by design.
  Engine: Vanilla JS. Loaded after config.js, before site.js.
  How it works: elements carry data-i18n="key" (textContent), data-i18n-ph="key"
    (placeholder), or data-i18n-html="key" (innerHTML). applyLang swaps them.
    Choice persists in localStorage 'rre_lang'. A header toggle is injected.
  Adding a string: add the key to BOTH en and te below, then tag the element.
  Known failure modes: a key present in markup but missing from a dict falls back
    to the element's existing text (never blank).
*/
(function () {
  var DICT = {
    en: {
      "nav.home": "Home", "nav.listings": "Listings", "nav.about": "About",
      "nav.contact": "Contact", "nav.emi": "EMI", "nav.blog": "Blog", "nav.testimonials": "Testimonials",
      "cta.call": "Call", "cta.browse": "Browse Properties", "cta.enquire": "Enquire",
      "cta.browseShort": "Browse", "cta.allListings": "All listings",
      "cta.exploreListings": "Explore listings", "cta.whatsapp": "Chat on WhatsApp",
      "cta.getInTouch": "Get in touch", "cta.contactUs": "Contact us", "cta.seeListings": "See listings",
      "cta.viewAll": "View all listings →", "cta.viewDetails": "View details",

      "hero.eyebrow": "South India · Since inception",
      "hero.title": "Find your next <span class=\"hl\">address</span> across South India",
      "hero.lead": "Verified homes, villas, apartments and HMDA/RERA-clear plots in Hyderabad, Chennai, Bengaluru and Vijayawada. One trusted advisor, end to end.",
      "hero.stat.cities": "Cities covered", "hero.stat.live": "Live listings", "hero.stat.verified": "Title-verified",

      "qs.city": "City", "qs.type": "Type", "qs.for": "For", "qs.budget": "Max budget",
      "qs.allCities": "All cities", "qs.anyType": "Any type", "qs.buyOrRent": "Buy or Rent",
      "qs.noLimit": "No limit", "qs.search": "Search", "qs.buy": "Buy", "qs.rent": "Rent",

      "sec.handpicked": "Handpicked", "sec.featured": "Featured properties",
      "sec.featuredSub": "A curated slice of current inventory. New listings added weekly.",
      "sec.whereWeOperate": "Where we operate", "sec.fourCities": "Four cities, one advisor",
      "sec.whyUs": "Why Raju Real Estate", "sec.buySell": "Buy and sell with confidence",
      "why.title1": "Title-verified only", "why.body1": "Every plot is HMDA/DTCP/BMRDA-approved with a clear title. No surprises at registration.",
      "why.title2": "On-ground in 4 cities", "why.body2": "Local presence in Hyderabad, Chennai, Bengaluru and Vijayawada. Site visits arranged fast.",
      "why.title3": "End-to-end support", "why.body3": "From shortlist to home loan to registration, one point of contact through the whole deal.",
      "cta.band.title": "Looking to buy, sell or lease?",
      "cta.band.body": "Tell us what you need. We'll shortlist verified options and arrange visits within days.",

      "filters.title": "Filters", "filters.reset": "Reset", "filters.keyword": "Keyword",
      "filters.keywordPh": "Locality, ref, title…", "filters.city": "City", "filters.locality": "Locality",
      "filters.type": "Property type", "filters.status": "Status", "filters.budget": "Budget (₹)",
      "filters.minArea": "Min area", "filters.allLocalities": "All localities",
      "type.apartment": "Apartment", "type.villa": "Villa", "type.house": "House", "type.plot": "Plot", "type.commercial": "Commercial",
      "status.sale": "For sale", "status.rent": "For rent", "status.sold": "Sold",
      "listings.title": "Property listings", "listings.sub": "Filter across all four cities. Prices in Indian ₹ (lakh/crore).",
      "listings.found": "properties found", "listings.sort": "Sort", "listings.mobileFilters": "☰ Filters",
      "sort.newest": "Newest first", "sort.priceAsc": "Price: low to high", "sort.priceDesc": "Price: high to low", "sort.areaDesc": "Area: large to small",

      "form.name": "Name", "form.phone": "Phone", "form.email": "Email", "form.city": "City of interest",
      "form.message": "Message", "form.send": "Send enquiry", "form.any": "Any",
      "form.namePh": "Your name", "form.msgPh": "Budget, property type, timeline…",
      "contact.eyebrow": "Get in touch", "contact.title": "Let's find your property",
      "contact.sub": "Tell us what you need. We reply within one business day.",
      "contact.phone": "Phone", "contact.email": "Email", "contact.office": "Office", "contact.hours": "Hours",
      "contact.sendEnquiry": "Send an enquiry", "contact.consent": "By submitting you agree to be contacted about your enquiry.",

      "about.eyebrow": "About us", "about.title": "One advisor. <span class=\"hl\">Four cities.</span> Zero surprises.",
      "about.lead": "Raju Real Estate helps families and investors buy, sell and lease property across Hyderabad, Chennai, Bengaluru and Vijayawada, with title-verified inventory and honest guidance.",
      "about.who": "Who we are",
      "about.whoP1": "Raju Real Estate is a boutique advisory built on a simple promise: every property we put in front of you is verified, and every step from shortlist to registration has one accountable point of contact.",
      "about.whoP2": "We operate on the ground in four South Indian markets. That local presence means faster site visits, sharper pricing, and deals that close without last-minute surprises at the sub-registrar office.",
      "about.handle": "What we handle",
      "about.ctaTitle": "Ready when you are", "about.ctaBody": "Buying, selling or leasing, start with a conversation.",

      "emi.nav": "EMI Calculator", "emi.eyebrow": "Home loan", "emi.title": "EMI Calculator",
      "emi.sub": "Estimate your monthly home-loan instalment. Indicative only.",
      "emi.price": "Property price (₹)", "emi.down": "Down payment (%)", "emi.rate": "Interest rate (% p.a.)",
      "emi.tenure": "Tenure (years)", "emi.loanAmount": "Loan amount", "emi.monthly": "Monthly EMI",
      "emi.totalInterest": "Total interest", "emi.totalPayable": "Total payable",
      "emi.note": "Indicative only. Excludes processing fees, insurance and taxes. Confirm actual rates with your lender.",

      "footer.explore": "Explore", "footer.cities": "Cities", "footer.contact": "Contact",
      "footer.callUs": "Call us", "footer.emailUs": "Email us", "footer.whatsapp": "WhatsApp",
      "footer.sitemap": "Sitemap", "footer.tagline": "Verified homes, villas and plots across Hyderabad, Chennai, Bengaluru and Vijayawada.",
      "footer.rights": "All rights reserved.",

      "testi.eyebrow": "Client stories", "testi.title": "What buyers say",
      "blog.eyebrow": "Insights", "blog.title": "Blog & market updates",
      "blog.sub": "Locality guides, buying checklists and honest market reads."
    },
    te: {
      "nav.home": "హోమ్", "nav.listings": "ప్రాపర్టీలు", "nav.about": "మా గురించి",
      "nav.contact": "సంప్రదించండి", "nav.emi": "EMI", "nav.blog": "బ్లాగ్", "nav.testimonials": "సమీక్షలు",
      "cta.call": "కాల్", "cta.browse": "ప్రాపర్టీలు చూడండి", "cta.enquire": "విచారించండి",
      "cta.browseShort": "చూడండి", "cta.allListings": "అన్ని ప్రాపర్టీలు",
      "cta.exploreListings": "ప్రాపర్టీలు చూడండి", "cta.whatsapp": "వాట్సాప్‌లో చాట్ చేయండి",
      "cta.getInTouch": "సంప్రదించండి", "cta.contactUs": "మమ్మల్ని సంప్రదించండి", "cta.seeListings": "ప్రాపర్టీలు చూడండి",
      "cta.viewAll": "అన్ని ప్రాపర్టీలు చూడండి →", "cta.viewDetails": "వివరాలు చూడండి",

      "hero.eyebrow": "దక్షిణ భారతదేశం · ప్రారంభం నుండి",
      "hero.title": "దక్షిణ భారతదేశంలో మీ తదుపరి <span class=\"hl\">చిరునామా</span> కనుగొనండి",
      "hero.lead": "హైదరాబాద్, చెన్నై, బెంగళూరు మరియు విజయవాడలో ధృవీకరించిన ఇళ్లు, విల్లాలు, అపార్ట్‌మెంట్లు మరియు HMDA/RERA క్లియర్ ప్లాట్లు. మొదటి నుండి చివరి వరకు ఒకే నమ్మకమైన సలహాదారు.",
      "hero.stat.cities": "నగరాలు", "hero.stat.live": "అందుబాటులో ఉన్న ప్రాపర్టీలు", "hero.stat.verified": "టైటిల్ ధృవీకరించబడింది",

      "qs.city": "నగరం", "qs.type": "రకం", "qs.for": "కోసం", "qs.budget": "గరిష్ట బడ్జెట్",
      "qs.allCities": "అన్ని నగరాలు", "qs.anyType": "ఏదైనా రకం", "qs.buyOrRent": "కొనుగోలు లేదా అద్దె",
      "qs.noLimit": "పరిమితి లేదు", "qs.search": "వెతకండి", "qs.buy": "కొనుగోలు", "qs.rent": "అద్దె",

      "sec.handpicked": "ఎంపిక చేసినవి", "sec.featured": "ప్రత్యేక ప్రాపర్టీలు",
      "sec.featuredSub": "ప్రస్తుత ఇన్వెంటరీ నుండి ఎంపిక చేసిన కొన్ని. ప్రతి వారం కొత్త ప్రాపర్టీలు జోడించబడతాయి.",
      "sec.whereWeOperate": "మేము పనిచేసే ప్రాంతాలు", "sec.fourCities": "నాలుగు నగరాలు, ఒకే సలహాదారు",
      "sec.whyUs": "రాజు రియల్ ఎస్టేట్ ఎందుకు", "sec.buySell": "నమ్మకంతో కొనండి, అమ్మండి",
      "why.title1": "టైటిల్ ధృవీకరించినవి మాత్రమే", "why.body1": "ప్రతి ప్లాట్ HMDA/DTCP/BMRDA ఆమోదం పొందినది, స్పష్టమైన టైటిల్‌తో. రిజిస్ట్రేషన్ సమయంలో ఎలాంటి ఆశ్చర్యాలు ఉండవు.",
      "why.title2": "4 నగరాల్లో స్థానికంగా", "why.body2": "హైదరాబాద్, చెన్నై, బెంగళూరు మరియు విజయవాడలో స్థానిక ఉనికి. సైట్ సందర్శనలు వేగంగా ఏర్పాటు చేస్తాం.",
      "why.title3": "మొదటి నుండి చివరి వరకు మద్దతు", "why.body3": "షార్ట్‌లిస్ట్ నుండి హోమ్ లోన్, రిజిస్ట్రేషన్ వరకు, మొత్తం డీల్‌కు ఒకే సంప్రదింపు వ్యక్తి.",
      "cta.band.title": "కొనాలనుకుంటున్నారా, అమ్మాలనుకుంటున్నారా లేదా లీజ్‌కు ఇవ్వాలనుకుంటున్నారా?",
      "cta.band.body": "మీకు ఏమి కావాలో చెప్పండి. ధృవీకరించిన ఎంపికలను షార్ట్‌లిస్ట్ చేసి కొద్ది రోజుల్లో సందర్శనలు ఏర్పాటు చేస్తాం.",

      "filters.title": "ఫిల్టర్లు", "filters.reset": "రీసెట్", "filters.keyword": "కీవర్డ్",
      "filters.keywordPh": "ప్రాంతం, రెఫ్, పేరు…", "filters.city": "నగరం", "filters.locality": "ప్రాంతం",
      "filters.type": "ప్రాపర్టీ రకం", "filters.status": "స్థితి", "filters.budget": "బడ్జెట్ (₹)",
      "filters.minArea": "కనీస విస్తీర్ణం", "filters.allLocalities": "అన్ని ప్రాంతాలు",
      "type.apartment": "అపార్ట్‌మెంట్", "type.villa": "విల్లా", "type.house": "ఇల్లు", "type.plot": "ప్లాట్", "type.commercial": "వాణిజ్యం",
      "status.sale": "అమ్మకానికి", "status.rent": "అద్దెకు", "status.sold": "అమ్ముడైంది",
      "listings.title": "ప్రాపర్టీ లిస్టింగ్‌లు", "listings.sub": "నాలుగు నగరాల్లో ఫిల్టర్ చేయండి. ధరలు భారతీయ ₹ (లక్ష/కోటి).",
      "listings.found": "ప్రాపర్టీలు కనుగొనబడ్డాయి", "listings.sort": "క్రమం", "listings.mobileFilters": "☰ ఫిల్టర్లు",
      "sort.newest": "కొత్తవి ముందు", "sort.priceAsc": "ధర: తక్కువ నుండి ఎక్కువ", "sort.priceDesc": "ధర: ఎక్కువ నుండి తక్కువ", "sort.areaDesc": "విస్తీర్ణం: పెద్ద నుండి చిన్న",

      "form.name": "పేరు", "form.phone": "ఫోన్", "form.email": "ఇమెయిల్", "form.city": "ఆసక్తి ఉన్న నగరం",
      "form.message": "సందేశం", "form.send": "విచారణ పంపండి", "form.any": "ఏదైనా",
      "form.namePh": "మీ పేరు", "form.msgPh": "బడ్జెట్, ప్రాపర్టీ రకం, సమయం…",
      "contact.eyebrow": "సంప్రదించండి", "contact.title": "మీ ప్రాపర్టీని కనుగొందాం",
      "contact.sub": "మీకు ఏమి కావాలో చెప్పండి. ఒక వ్యాపార దినంలో సమాధానం ఇస్తాం.",
      "contact.phone": "ఫోన్", "contact.email": "ఇమెయిల్", "contact.office": "కార్యాలయం", "contact.hours": "సమయం",
      "contact.sendEnquiry": "విచారణ పంపండి", "contact.consent": "సమర్పించడం ద్వారా మీ విచారణ గురించి సంప్రదించడానికి మీరు అంగీకరిస్తున్నారు.",

      "about.eyebrow": "మా గురించి", "about.title": "ఒకే సలహాదారు. <span class=\"hl\">నాలుగు నగరాలు.</span> ఎలాంటి ఆశ్చర్యాలు లేవు.",
      "about.lead": "రాజు రియల్ ఎస్టేట్ హైదరాబాద్, చెన్నై, బెంగళూరు మరియు విజయవాడలో కుటుంబాలు మరియు పెట్టుబడిదారులకు ప్రాపర్టీ కొనుగోలు, అమ్మకం మరియు లీజులో సహాయపడుతుంది, టైటిల్ ధృవీకరించిన ఇన్వెంటరీ మరియు నిజాయితీ మార్గదర్శకత్వంతో.",
      "about.who": "మేము ఎవరం",
      "about.whoP1": "రాజు రియల్ ఎస్టేట్ ఒక సాధారణ వాగ్దానంపై నిర్మించబడింది: మేము మీ ముందు ఉంచే ప్రతి ప్రాపర్టీ ధృవీకరించబడుతుంది, మరియు షార్ట్‌లిస్ట్ నుండి రిజిస్ట్రేషన్ వరకు ప్రతి దశకు ఒకే జవాబుదారీ సంప్రదింపు వ్యక్తి ఉంటారు.",
      "about.whoP2": "మేము నాలుగు దక్షిణ భారత మార్కెట్లలో స్థానికంగా పనిచేస్తాం. ఆ స్థానిక ఉనికి అంటే వేగవంతమైన సైట్ సందర్శనలు, మెరుగైన ధరలు, మరియు సబ్-రిజిస్ట్రార్ కార్యాలయంలో చివరి నిమిషం ఆశ్చర్యాలు లేకుండా ముగిసే డీల్‌లు.",
      "about.handle": "మేము చూసుకునేవి",
      "about.ctaTitle": "మీరు సిద్ధమైనప్పుడు", "about.ctaBody": "కొనుగోలు, అమ్మకం లేదా లీజు, ఒక సంభాషణతో ప్రారంభించండి.",

      "emi.nav": "EMI కాలిక్యులేటర్", "emi.eyebrow": "హోమ్ లోన్", "emi.title": "EMI కాలిక్యులేటర్",
      "emi.sub": "మీ నెలవారీ హోమ్ లోన్ వాయిదాను అంచనా వేయండి. సూచన మాత్రమే.",
      "emi.price": "ప్రాపర్టీ ధర (₹)", "emi.down": "డౌన్ పేమెంట్ (%)", "emi.rate": "వడ్డీ రేటు (% సం.)",
      "emi.tenure": "కాలవ్యవధి (సంవత్సరాలు)", "emi.loanAmount": "లోన్ మొత్తం", "emi.monthly": "నెలవారీ EMI",
      "emi.totalInterest": "మొత్తం వడ్డీ", "emi.totalPayable": "మొత్తం చెల్లించవలసినది",
      "emi.note": "సూచన మాత్రమే. ప్రాసెసింగ్ ఫీజులు, బీమా మరియు పన్నులు మినహా. అసలు రేట్లను మీ రుణదాతతో నిర్ధారించుకోండి.",

      "footer.explore": "అన్వేషించండి", "footer.cities": "నగరాలు", "footer.contact": "సంప్రదించండి",
      "footer.callUs": "కాల్ చేయండి", "footer.emailUs": "ఇమెయిల్ చేయండి", "footer.whatsapp": "వాట్సాప్",
      "footer.sitemap": "సైట్‌మ్యాప్", "footer.tagline": "హైదరాబాద్, చెన్నై, బెంగళూరు మరియు విజయవాడలో ధృవీకరించిన ఇళ్లు, విల్లాలు మరియు ప్లాట్లు.",
      "footer.rights": "అన్ని హక్కులు సురక్షితం.",

      "testi.eyebrow": "క్లయింట్ కథనాలు", "testi.title": "కొనుగోలుదారులు ఏమంటున్నారు",
      "blog.eyebrow": "సమాచారం", "blog.title": "బ్లాగ్ & మార్కెట్ అప్‌డేట్‌లు",
      "blog.sub": "ప్రాంత గైడ్‌లు, కొనుగోలు చెక్‌లిస్ట్‌లు మరియు నిజాయితీ మార్కెట్ విశ్లేషణ."
    }
  };

  function getLang() {
    var l = localStorage.getItem("rre_lang");
    return l === "te" ? "te" : "en";
  }

  function t(key, lang) {
    var d = DICT[lang] || DICT.en;
    return d[key] != null ? d[key] : (DICT.en[key] != null ? DICT.en[key] : null);
  }

  function applyLang(lang) {
    localStorage.setItem("rre_lang", lang);
    document.documentElement.setAttribute("lang", lang === "te" ? "te" : "en");

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var v = t(el.getAttribute("data-i18n"), lang);
      if (v != null) el.textContent = v;
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var v = t(el.getAttribute("data-i18n-html"), lang);
      if (v != null) el.innerHTML = v;
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      var v = t(el.getAttribute("data-i18n-ph"), lang);
      if (v != null) el.setAttribute("placeholder", v);
    });

    document.querySelectorAll(".lang-toggle button").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-lang") === lang);
    });
    // Let other scripts (e.g. re-rendered lists) know.
    document.dispatchEvent(new CustomEvent("rre:langchange", { detail: { lang: lang } }));
  }
  window.rreApplyLang = applyLang;
  window.rreLang = getLang;

  function injectToggle() {
    var cta = document.querySelector(".nav-cta");
    if (!cta || cta.querySelector(".lang-toggle")) return;
    var wrap = document.createElement("div");
    wrap.className = "lang-toggle";
    wrap.innerHTML =
      '<button type="button" data-lang="en" aria-label="English">EN</button>' +
      '<button type="button" data-lang="te" aria-label="తెలుగు">తె</button>';
    cta.insertBefore(wrap, cta.firstChild);
    wrap.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-lang]"); if (!b) return;
      applyLang(b.getAttribute("data-lang"));
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    injectToggle();
    applyLang(getLang());
  });
})();
