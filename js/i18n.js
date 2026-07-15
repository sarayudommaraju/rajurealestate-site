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
      "cta.exploreListings": "Explore listings", "cta.whatsapp": "Chat on WhatsApp", "cta.callNow": "Call now",
      "cta.getInTouch": "Get in touch", "cta.contactUs": "Contact us", "cta.seeListings": "See listings",
      "cta.viewAll": "View all listings →", "cta.viewDetails": "View details",

      "hero.eyebrow": "For NRIs & investors buying back home",
      "hero.title": "Your eyes, hands, and <span class=\"hl\">trusted name</span> on the ground",
      "hero.lead": "Buying in Hyderabad, Bengaluru, Chennai or Vijayawada from abroad? We verify the title, walk the site for you, and handle the deal end to end. Only title-clean inventory. One advisor who answers the phone.",
      "hero.stat.cities": "Cities covered", "hero.stat.live": "Live listings", "hero.stat.verified": "Title check on every listing",
      "trust.verified": "RERA / HMDA verified", "trust.title": "Only title-clean inventory", "trust.support": "End-to-end support",
      "trust.remote": "Handled remotely, end to end", "trust.honest": "Honest advice, one contact",

      "verify.eyebrow": "Your money is safe",
      "verify.title": "How we protect you from title fraud",
      "verify.sub": "The number one risk in Indian property is a bad title. Before any listing reaches you, it clears a documented due-diligence check. You get the paperwork, not just our word.",
      "verify.s1t": "Layout & approvals", "verify.s1b": "HMDA, DTCP, BMRDA or RERA approval numbers checked against the sanctioned plan.",
      "verify.s2t": "Clean title chain", "verify.s2b": "Ownership traced back through link documents, with no unexplained gaps.",
      "verify.s3t": "Encumbrance certificate", "verify.s3b": "A current EC covering 13 to 15 years, so no hidden mortgage or lien survives.",
      "verify.s4t": "Legal opinion", "verify.s4b": "A lawyer's title opinion and boundary survey, available to you on request.",
      "verify.cta": "Read the full title checklist →",

      "qs.city": "City", "qs.type": "Type", "qs.for": "For", "qs.budget": "Max budget",
      "qs.allCities": "All cities", "qs.anyType": "Any type", "qs.buyOrRent": "Buy or Rent",
      "qs.noLimit": "No limit", "qs.search": "Search", "qs.buy": "Buy", "qs.rent": "Rent",

      "sec.handpicked": "Handpicked", "sec.featured": "Featured properties",
      "sec.featuredSub": "A curated slice of current inventory. New listings added weekly.",
      "sec.whereWeOperate": "Where we operate", "sec.fourCities": "Four cities, one advisor",
      "sec.whyUs": "Why Raju Real Estate", "sec.buySell": "Buy and sell with confidence",
      "why.title1": "Only title-clean inventory", "why.body1": "We refuse to list disputed property. Every listing clears approvals, EC and a title check before you see it.",
      "why.title2": "Handled from anywhere", "why.body2": "Video site visits, registration, power of attorney, home loans and post-sale upkeep. You never need to fly down.",
      "why.title3": "Honest advice", "why.body3": "One accountable point of contact who will talk you out of a bad deal. Not a call centre, not a commission chase.",
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
      "contact.sub": "Wherever you are in the world, tell us what you need. WhatsApp is fastest and works across time zones. We reply within one business day (IST).",
      "contact.phone": "Phone", "contact.email": "Email", "contact.office": "Office", "contact.hours": "Hours (IST)",
      "contact.waLead": "Fastest way to reach us", "contact.waNote": "WhatsApp works across every time zone. Message any time and we reply within one business day (IST).",
      "contact.sendEnquiry": "Send an enquiry", "contact.consent": "By submitting you agree to be contacted about your enquiry.",

      "about.eyebrow": "About us", "about.title": "One advisor. <span class=\"hl\">Four cities.</span> Zero surprises.",
      "about.lead": "Raju Real Estate helps NRIs and out-of-state investors buy property back home across Hyderabad, Bengaluru, Chennai and Vijayawada. Title-clean inventory, video site visits, and one accountable advisor who handles the whole deal while you stay abroad.",
      "about.who": "Who we are",
      "about.whoP1": "Raju Real Estate is a boutique advisory built on a simple promise: every property we put in front of you is verified, and every step from shortlist to registration has one accountable point of contact.",
      "about.whoP2": "We operate on the ground in four South Indian markets. For a buyer sitting in Dubai, New Jersey or Singapore, that local presence is everything: verified site visits on video, sharper pricing, and deals that close without last-minute surprises at the sub-registrar office.",
      "about.handle": "What we handle",
      "about.directLine": "Direct line for NRI buyers, sellers and investors across all four cities. WhatsApp works across time zones.",
      "about.stat.cities": "Cities covered", "about.stat.check": "Title check per listing", "about.stat.contact": "Single point of contact", "about.stat.always": "Always",
      "about.ctaTitle": "Ready when you are", "about.ctaBody": "Buying, selling or leasing, start with a conversation.",

      "nri.eyebrow": "Buying from abroad",
      "nri.title": "How it works when you can't fly down",
      "nri.sub": "You never need to be in the country to buy safely. We are your eyes and hands on the ground, and every step is documented.",
      "nri.s1t": "Talk & shortlist", "nri.s1b": "A WhatsApp or video call to understand your budget, city and goal. We shortlist only title-clean options.",
      "nri.s2t": "Video site visit", "nri.s2b": "A live walkthrough on video, with honest commentary on the property, the locality and the neighbours.",
      "nri.s3t": "Title & paperwork", "nri.s3b": "Approvals, EC and a legal opinion verified. Power of attorney arranged so you can sign from where you are.",
      "nri.s4t": "Registration & handover", "nri.s4b": "We handle registration, home-loan coordination and handover, and stay on for post-sale upkeep if you need it.",

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
      "blog.sub": "Locality guides, buying checklists and honest market reads.",
      "nav.games": "Games",
      "games.eyebrow": "Take a break", "games.title": "Quick games for kids & adults",
      "games.sub": "A little fun while you browse. No downloads, no sign-up. Pick a game and play right here."
    },
    te: {
      "nav.home": "హోమ్", "nav.listings": "ప్రాపర్టీలు", "nav.about": "మా గురించి",
      "nav.contact": "సంప్రదించండి", "nav.emi": "EMI", "nav.blog": "బ్లాగ్", "nav.testimonials": "సమీక్షలు",
      "cta.call": "కాల్", "cta.browse": "ప్రాపర్టీలు చూడండి", "cta.enquire": "విచారించండి",
      "cta.browseShort": "చూడండి", "cta.allListings": "అన్ని ప్రాపర్టీలు",
      "cta.exploreListings": "ప్రాపర్టీలు చూడండి", "cta.whatsapp": "వాట్సాప్‌లో చాట్ చేయండి", "cta.callNow": "ఇప్పుడే కాల్ చేయండి",
      "cta.getInTouch": "సంప్రదించండి", "cta.contactUs": "మమ్మల్ని సంప్రదించండి", "cta.seeListings": "ప్రాపర్టీలు చూడండి",
      "cta.viewAll": "అన్ని ప్రాపర్టీలు చూడండి →", "cta.viewDetails": "వివరాలు చూడండి",

      "hero.eyebrow": "విదేశాల్లోని భారతీయులు & పెట్టుబడిదారుల కోసం",
      "hero.title": "మీ కళ్లు, చేతులు, మరియు నేలపై <span class=\"hl\">నమ్మకమైన పేరు</span>",
      "hero.lead": "విదేశాల నుండి హైదరాబాద్, బెంగళూరు, చెన్నై లేదా విజయవాడలో కొనుగోలు చేస్తున్నారా? మేము టైటిల్ ధృవీకరిస్తాం, మీ తరపున సైట్‌ను పరిశీలిస్తాం, మొత్తం డీల్‌ను చూసుకుంటాం. టైటిల్ స్పష్టమైన ప్రాపర్టీలు మాత్రమే. ఫోన్ ఎత్తే ఒకే సలహాదారు.",
      "hero.stat.cities": "నగరాలు", "hero.stat.live": "అందుబాటులో ఉన్న ప్రాపర్టీలు", "hero.stat.verified": "ప్రతి లిస్టింగ్‌కు టైటిల్ తనిఖీ",
      "trust.verified": "RERA / HMDA ధృవీకరించబడింది", "trust.title": "టైటిల్ స్పష్టమైన ప్రాపర్టీలు మాత్రమే", "trust.support": "పూర్తి మద్దతు",
      "trust.remote": "మొత్తం దూరం నుండే నిర్వహణ", "trust.honest": "నిజాయితీ సలహా, ఒకే సంప్రదింపు",

      "verify.eyebrow": "మీ డబ్బు సురక్షితం",
      "verify.title": "టైటిల్ మోసం నుండి మిమ్మల్ని ఎలా కాపాడతాం",
      "verify.sub": "భారత ప్రాపర్టీలో అతిపెద్ద రిస్క్ చెడు టైటిల్. ఏ లిస్టింగ్ అయినా మీకు చేరకముందే డాక్యుమెంటెడ్ డ్యూ-డిలిజెన్స్ తనిఖీని దాటుతుంది. మా మాట మాత్రమే కాదు, పత్రాలు కూడా మీకు ఇస్తాం.",
      "verify.s1t": "లేఅవుట్ & ఆమోదాలు", "verify.s1b": "HMDA, DTCP, BMRDA లేదా RERA ఆమోద నంబర్లను ఆమోదిత ప్లాన్‌తో సరిపోల్చుతాం.",
      "verify.s2t": "స్పష్టమైన టైటిల్ చైన్", "verify.s2b": "లింక్ డాక్యుమెంట్ల ద్వారా యాజమాన్యాన్ని వెనక్కి గుర్తిస్తాం, ఎలాంటి ఖాళీలు లేకుండా.",
      "verify.s3t": "ఎన్‌కంబ్రెన్స్ సర్టిఫికెట్", "verify.s3b": "13 నుండి 15 సంవత్సరాల ప్రస్తుత EC, దాచిన తనఖా లేదా లియన్ ఏదీ మిగలదు.",
      "verify.s4t": "న్యాయ అభిప్రాయం", "verify.s4b": "న్యాయవాది టైటిల్ అభిప్రాయం మరియు సరిహద్దు సర్వే, మీకు అభ్యర్థనపై అందుబాటులో.",
      "verify.cta": "పూర్తి టైటిల్ చెక్‌లిస్ట్ చదవండి →",

      "qs.city": "నగరం", "qs.type": "రకం", "qs.for": "కోసం", "qs.budget": "గరిష్ట బడ్జెట్",
      "qs.allCities": "అన్ని నగరాలు", "qs.anyType": "ఏదైనా రకం", "qs.buyOrRent": "కొనుగోలు లేదా అద్దె",
      "qs.noLimit": "పరిమితి లేదు", "qs.search": "వెతకండి", "qs.buy": "కొనుగోలు", "qs.rent": "అద్దె",

      "sec.handpicked": "ఎంపిక చేసినవి", "sec.featured": "ప్రత్యేక ప్రాపర్టీలు",
      "sec.featuredSub": "ప్రస్తుత ఇన్వెంటరీ నుండి ఎంపిక చేసిన కొన్ని. ప్రతి వారం కొత్త ప్రాపర్టీలు జోడించబడతాయి.",
      "sec.whereWeOperate": "మేము పనిచేసే ప్రాంతాలు", "sec.fourCities": "నాలుగు నగరాలు, ఒకే సలహాదారు",
      "sec.whyUs": "రాజు రియల్ ఎస్టేట్ ఎందుకు", "sec.buySell": "నమ్మకంతో కొనండి, అమ్మండి",
      "why.title1": "టైటిల్ స్పష్టమైనవి మాత్రమే", "why.body1": "వివాదాస్పద ప్రాపర్టీని మేము లిస్ట్ చేయం. మీరు చూడకముందే ప్రతి లిస్టింగ్ ఆమోదాలు, EC మరియు టైటిల్ తనిఖీని దాటుతుంది.",
      "why.title2": "ఎక్కడి నుండైనా నిర్వహణ", "why.body2": "వీడియో సైట్ సందర్శనలు, రిజిస్ట్రేషన్, పవర్ ఆఫ్ అటార్నీ, హోమ్ లోన్లు మరియు అమ్మకం తర్వాత నిర్వహణ. మీరు రావాల్సిన అవసరం లేదు.",
      "why.title3": "నిజాయితీ సలహా", "why.body3": "చెడు డీల్ నుండి మిమ్మల్ని వారించే ఒకే జవాబుదారీ సంప్రదింపు వ్యక్తి. కాల్ సెంటర్ కాదు, కమిషన్ వేట కాదు.",
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
      "contact.sub": "మీరు ప్రపంచంలో ఎక్కడున్నా, మీకు ఏమి కావాలో చెప్పండి. వాట్సాప్ వేగవంతమైనది, అన్ని టైమ్ జోన్లలో పనిచేస్తుంది. ఒక వ్యాపార దినంలో (IST) సమాధానం ఇస్తాం.",
      "contact.phone": "ఫోన్", "contact.email": "ఇమెయిల్", "contact.office": "కార్యాలయం", "contact.hours": "సమయం (IST)",
      "contact.waLead": "మమ్మల్ని చేరుకోవడానికి వేగవంతమైన మార్గం", "contact.waNote": "వాట్సాప్ ప్రతి టైమ్ జోన్‌లో పనిచేస్తుంది. ఎప్పుడైనా సందేశం పంపండి, ఒక వ్యాపార దినంలో (IST) సమాధానం ఇస్తాం.",
      "contact.sendEnquiry": "విచారణ పంపండి", "contact.consent": "సమర్పించడం ద్వారా మీ విచారణ గురించి సంప్రదించడానికి మీరు అంగీకరిస్తున్నారు.",

      "about.eyebrow": "మా గురించి", "about.title": "ఒకే సలహాదారు. <span class=\"hl\">నాలుగు నగరాలు.</span> ఎలాంటి ఆశ్చర్యాలు లేవు.",
      "about.lead": "రాజు రియల్ ఎస్టేట్ విదేశాల్లోని భారతీయులు మరియు ఇతర రాష్ట్రాల పెట్టుబడిదారులకు హైదరాబాద్, బెంగళూరు, చెన్నై మరియు విజయవాడలో ఇంటి వద్ద ప్రాపర్టీ కొనుగోలులో సహాయపడుతుంది. టైటిల్ స్పష్టమైన ప్రాపర్టీలు, వీడియో సైట్ సందర్శనలు, మీరు విదేశాల్లో ఉన్నా మొత్తం డీల్‌ను చూసుకునే ఒకే జవాబుదారీ సలహాదారు.",
      "about.who": "మేము ఎవరం",
      "about.whoP1": "రాజు రియల్ ఎస్టేట్ ఒక సాధారణ వాగ్దానంపై నిర్మించబడింది: మేము మీ ముందు ఉంచే ప్రతి ప్రాపర్టీ ధృవీకరించబడుతుంది, మరియు షార్ట్‌లిస్ట్ నుండి రిజిస్ట్రేషన్ వరకు ప్రతి దశకు ఒకే జవాబుదారీ సంప్రదింపు వ్యక్తి ఉంటారు.",
      "about.whoP2": "మేము నాలుగు దక్షిణ భారత మార్కెట్లలో స్థానికంగా పనిచేస్తాం. దుబాయ్, న్యూజెర్సీ లేదా సింగపూర్‌లో ఉన్న కొనుగోలుదారుకు ఆ స్థానిక ఉనికే అంతా: వీడియోలో ధృవీకరించిన సైట్ సందర్శనలు, మెరుగైన ధరలు, సబ్-రిజిస్ట్రార్ కార్యాలయంలో చివరి నిమిషం ఆశ్చర్యాలు లేకుండా ముగిసే డీల్‌లు.",
      "about.handle": "మేము చూసుకునేవి",
      "about.directLine": "నాలుగు నగరాల్లో NRI కొనుగోలుదారులు, అమ్మకందారులు, పెట్టుబడిదారులకు నేరుగా సంప్రదింపు. వాట్సాప్ అన్ని టైమ్ జోన్లలో పనిచేస్తుంది.",
      "about.stat.cities": "నగరాలు", "about.stat.check": "ప్రతి లిస్టింగ్‌కు టైటిల్ తనిఖీ", "about.stat.contact": "ఒకే సంప్రదింపు వ్యక్తి", "about.stat.always": "ఎల్లప్పుడూ",
      "about.ctaTitle": "మీరు సిద్ధమైనప్పుడు", "about.ctaBody": "కొనుగోలు, అమ్మకం లేదా లీజు, ఒక సంభాషణతో ప్రారంభించండి.",

      "nri.eyebrow": "విదేశాల నుండి కొనుగోలు",
      "nri.title": "మీరు రాలేనప్పుడు ఇది ఇలా పనిచేస్తుంది",
      "nri.sub": "సురక్షితంగా కొనడానికి మీరు దేశంలో ఉండాల్సిన అవసరం లేదు. మేము నేలపై మీ కళ్లు, చేతులు, ప్రతి దశ డాక్యుమెంట్ చేయబడుతుంది.",
      "nri.s1t": "మాట్లాడి, షార్ట్‌లిస్ట్", "nri.s1b": "మీ బడ్జెట్, నగరం, లక్ష్యాన్ని అర్థం చేసుకోవడానికి వాట్సాప్ లేదా వీడియో కాల్. టైటిల్ స్పష్టమైన ఎంపికలను మాత్రమే షార్ట్‌లిస్ట్ చేస్తాం.",
      "nri.s2t": "వీడియో సైట్ సందర్శన", "nri.s2b": "ప్రాపర్టీ, ప్రాంతం, పొరుగువారి గురించి నిజాయితీ వ్యాఖ్యానంతో లైవ్ వీడియో వాక్‌త్రూ.",
      "nri.s3t": "టైటిల్ & పత్రాలు", "nri.s3b": "ఆమోదాలు, EC మరియు న్యాయ అభిప్రాయం ధృవీకరించబడతాయి. మీరు ఉన్న చోటి నుండే సంతకం చేయడానికి పవర్ ఆఫ్ అటార్నీ ఏర్పాటు.",
      "nri.s4t": "రిజిస్ట్రేషన్ & హ్యాండోవర్", "nri.s4b": "రిజిస్ట్రేషన్, హోమ్ లోన్ సమన్వయం, హ్యాండోవర్ మేము చూసుకుంటాం, మీకు అవసరమైతే అమ్మకం తర్వాత నిర్వహణ కూడా.",

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
      "blog.sub": "ప్రాంత గైడ్‌లు, కొనుగోలు చెక్‌లిస్ట్‌లు మరియు నిజాయితీ మార్కెట్ విశ్లేషణ.",
      "nav.games": "గేమ్స్",
      "games.eyebrow": "కాసేపు విश్రాంతి", "games.title": "పిల్లలు & పెద్దల కోసం చిన్న గేమ్స్",
      "games.sub": "బ్రౌజ్ చేస్తూ కాస్త వినోదం. డౌన్‌లోడ్‌లు లేవు, సైన్-అప్ లేదు. ఒక గేమ్ ఎంచుకుని ఇక్కడే ఆడండి."
    },
    hi: {
      "nav.home": "होम", "nav.listings": "प्रॉपर्टी", "nav.about": "हमारे बारे में",
      "nav.contact": "संपर्क", "nav.emi": "EMI", "nav.blog": "ब्लॉग", "nav.testimonials": "समीक्षाएँ", "nav.games": "गेम्स",
      "cta.call": "कॉल", "cta.browse": "प्रॉपर्टी देखें", "cta.enquire": "पूछताछ करें",
      "cta.browseShort": "देखें", "cta.allListings": "सभी प्रॉपर्टी",
      "cta.exploreListings": "प्रॉपर्टी देखें", "cta.whatsapp": "व्हाट्सएप पर चैट करें", "cta.callNow": "अभी कॉल करें",
      "cta.getInTouch": "संपर्क करें", "cta.contactUs": "हमसे संपर्क करें", "cta.seeListings": "प्रॉपर्टी देखें",
      "cta.viewAll": "सभी प्रॉपर्टी देखें →", "cta.viewDetails": "विवरण देखें",

      "hero.eyebrow": "विदेश में बसे भारतीयों और निवेशकों के लिए",
      "hero.title": "आपकी आँखें, हाथ, और ज़मीन पर <span class=\"hl\">भरोसेमंद नाम</span>",
      "hero.lead": "विदेश से हैदराबाद, बेंगलुरु, चेन्नई या विजयवाड़ा में खरीद रहे हैं? हम टाइटल जाँचते हैं, आपकी ओर से साइट देखते हैं, और पूरा सौदा संभालते हैं। केवल साफ़-टाइटल प्रॉपर्टी। एक सलाहकार जो फ़ोन उठाता है।",
      "hero.stat.cities": "शहर", "hero.stat.live": "उपलब्ध प्रॉपर्टी", "hero.stat.verified": "हर लिस्टिंग पर टाइटल जाँच",
      "trust.verified": "RERA / HMDA सत्यापित", "trust.title": "केवल साफ़-टाइटल प्रॉपर्टी", "trust.support": "पूरी सहायता",
      "trust.remote": "दूर से, शुरू से अंत तक संभाला जाता है", "trust.honest": "ईमानदार सलाह, एक संपर्क",

      "verify.eyebrow": "आपका पैसा सुरक्षित है",
      "verify.title": "हम आपको टाइटल धोखाधड़ी से कैसे बचाते हैं",
      "verify.sub": "भारतीय प्रॉपर्टी में सबसे बड़ा जोखिम खराब टाइटल है। कोई भी लिस्टिंग आप तक पहुँचने से पहले एक दस्तावेज़ी ड्यू-डिलिजेंस जाँच पास करती है। सिर्फ़ हमारी बात नहीं, कागज़ात भी आपको मिलते हैं।",
      "verify.s1t": "लेआउट और स्वीकृतियाँ", "verify.s1b": "HMDA, DTCP, BMRDA या RERA स्वीकृति नंबरों को स्वीकृत नक्शे से मिलाया जाता है।",
      "verify.s2t": "साफ़ टाइटल चेन", "verify.s2b": "लिंक दस्तावेज़ों के ज़रिए स्वामित्व पीछे तक जाँचा जाता है, बिना किसी अनजान अंतराल के।",
      "verify.s3t": "एनकम्ब्रेंस सर्टिफिकेट", "verify.s3b": "13 से 15 साल का मौजूदा EC, ताकि कोई छिपा गिरवी या लियन न बचे।",
      "verify.s4t": "कानूनी राय", "verify.s4b": "वकील की टाइटल राय और सीमा सर्वे, आपके अनुरोध पर उपलब्ध।",
      "verify.cta": "पूरी टाइटल चेकलिस्ट पढ़ें →",

      "qs.city": "शहर", "qs.type": "प्रकार", "qs.for": "के लिए", "qs.budget": "अधिकतम बजट",
      "qs.allCities": "सभी शहर", "qs.anyType": "कोई भी प्रकार", "qs.buyOrRent": "खरीद या किराया",
      "qs.noLimit": "कोई सीमा नहीं", "qs.search": "खोजें", "qs.buy": "खरीद", "qs.rent": "किराया",

      "sec.handpicked": "चुनिंदा", "sec.featured": "विशेष प्रॉपर्टी",
      "sec.featuredSub": "मौजूदा इन्वेंटरी में से कुछ चुनिंदा। हर हफ़्ते नई प्रॉपर्टी जोड़ी जाती हैं।",
      "sec.whereWeOperate": "हम कहाँ काम करते हैं", "sec.fourCities": "चार शहर, एक सलाहकार",
      "sec.whyUs": "राजू रियल एस्टेट क्यों", "sec.buySell": "भरोसे के साथ खरीदें और बेचें",
      "why.title1": "केवल साफ़-टाइटल प्रॉपर्टी", "why.body1": "हम विवादित प्रॉपर्टी लिस्ट नहीं करते। हर लिस्टिंग आपके देखने से पहले स्वीकृतियाँ, EC और टाइटल जाँच पास करती है।",
      "why.title2": "कहीं से भी संभाला जाता है", "why.body2": "वीडियो साइट विज़िट, रजिस्ट्रेशन, पावर ऑफ़ अटॉर्नी, होम लोन और बिक्री के बाद देखभाल। आपको आने की ज़रूरत नहीं।",
      "why.title3": "ईमानदार सलाह", "why.body3": "एक जवाबदेह संपर्क जो आपको खराब सौदे से रोकेगा। कोई कॉल सेंटर नहीं, कोई कमीशन की दौड़ नहीं।",
      "cta.band.title": "खरीदना, बेचना या लीज़ पर देना चाहते हैं?",
      "cta.band.body": "हमें बताएं आपको क्या चाहिए। हम सत्यापित विकल्प शॉर्टलिस्ट करके कुछ दिनों में विज़िट तय करेंगे।",

      "filters.title": "फ़िल्टर", "filters.reset": "रीसेट", "filters.keyword": "कीवर्ड",
      "filters.keywordPh": "इलाका, रेफ़, नाम…", "filters.city": "शहर", "filters.locality": "इलाका",
      "filters.type": "प्रॉपर्टी प्रकार", "filters.status": "स्थिति", "filters.budget": "बजट (₹)",
      "filters.minArea": "न्यूनतम क्षेत्रफल", "filters.allLocalities": "सभी इलाके",
      "type.apartment": "अपार्टमेंट", "type.villa": "विला", "type.house": "मकान", "type.plot": "प्लॉट", "type.commercial": "व्यावसायिक",
      "status.sale": "बिक्री के लिए", "status.rent": "किराए के लिए", "status.sold": "बिक गया",
      "listings.title": "प्रॉपर्टी लिस्टिंग", "listings.sub": "चारों शहरों में फ़िल्टर करें। कीमतें भारतीय ₹ (लाख/करोड़) में।",
      "listings.found": "प्रॉपर्टी मिलीं", "listings.sort": "क्रम", "listings.mobileFilters": "☰ फ़िल्टर",
      "sort.newest": "नई पहले", "sort.priceAsc": "कीमत: कम से ज़्यादा", "sort.priceDesc": "कीमत: ज़्यादा से कम", "sort.areaDesc": "क्षेत्रफल: बड़े से छोटा",

      "form.name": "नाम", "form.phone": "फ़ोन", "form.email": "ईमेल", "form.city": "पसंद का शहर",
      "form.message": "संदेश", "form.send": "पूछताछ भेजें", "form.any": "कोई भी",
      "form.namePh": "आपका नाम", "form.msgPh": "बजट, प्रॉपर्टी प्रकार, समय…",
      "contact.eyebrow": "संपर्क करें", "contact.title": "आइए आपकी प्रॉपर्टी ढूँढें",
      "contact.sub": "आप दुनिया में कहीं भी हों, हमें बताएं आपको क्या चाहिए। व्हाट्सएप सबसे तेज़ है और हर टाइम ज़ोन में काम करता है। हम एक कार्यदिवस (IST) में जवाब देते हैं।",
      "contact.phone": "फ़ोन", "contact.email": "ईमेल", "contact.office": "कार्यालय", "contact.hours": "समय (IST)",
      "contact.waLead": "हम तक पहुँचने का सबसे तेज़ तरीका", "contact.waNote": "व्हाट्सएप हर टाइम ज़ोन में काम करता है। कभी भी संदेश भेजें, हम एक कार्यदिवस (IST) में जवाब देते हैं।",
      "contact.sendEnquiry": "पूछताछ भेजें", "contact.consent": "सबमिट करके आप अपनी पूछताछ के बारे में संपर्क किए जाने पर सहमत होते हैं।",

      "about.eyebrow": "हमारे बारे में", "about.title": "एक सलाहकार। <span class=\"hl\">चार शहर।</span> कोई आश्चर्य नहीं।",
      "about.lead": "राजू रियल एस्टेट विदेश में बसे भारतीयों और दूसरे राज्यों के निवेशकों को हैदराबाद, बेंगलुरु, चेन्नई और विजयवाड़ा में घर पर प्रॉपर्टी खरीदने में मदद करता है। साफ़-टाइटल प्रॉपर्टी, वीडियो साइट विज़िट, और एक जवाबदेह सलाहकार जो आपके विदेश में रहते हुए पूरा सौदा संभालता है।",
      "about.who": "हम कौन हैं",
      "about.whoP1": "राजू रियल एस्टेट एक सरल वादे पर बना है: हम आपके सामने जो भी प्रॉपर्टी रखते हैं वह सत्यापित होती है, और शॉर्टलिस्ट से रजिस्ट्रेशन तक हर कदम पर एक जवाबदेह संपर्क होता है।",
      "about.whoP2": "हम चार दक्षिण भारतीय बाज़ारों में ज़मीन पर काम करते हैं। दुबई, न्यू जर्सी या सिंगापुर में बैठे खरीदार के लिए यह स्थानीय मौजूदगी ही सब कुछ है: वीडियो पर सत्यापित साइट विज़िट, बेहतर कीमत, और सब-रजिस्ट्रार कार्यालय में अंतिम समय के आश्चर्य के बिना पूरे होने वाले सौदे।",
      "about.handle": "हम क्या संभालते हैं",
      "about.directLine": "चारों शहरों में NRI खरीदारों, विक्रेताओं और निवेशकों के लिए सीधी लाइन। व्हाट्सएप हर टाइम ज़ोन में काम करता है।",
      "about.stat.cities": "शहर", "about.stat.check": "प्रति लिस्टिंग टाइटल जाँच", "about.stat.contact": "एक संपर्क बिंदु", "about.stat.always": "हमेशा",
      "about.ctaTitle": "जब आप तैयार हों", "about.ctaBody": "खरीदना, बेचना या लीज़, एक बातचीत से शुरू करें।",

      "nri.eyebrow": "विदेश से खरीदना",
      "nri.title": "जब आप आ नहीं सकते तो यह ऐसे काम करता है",
      "nri.sub": "सुरक्षित खरीदने के लिए आपको देश में होने की ज़रूरत नहीं। हम ज़मीन पर आपकी आँखें और हाथ हैं, और हर कदम दस्तावेज़ी होता है।",
      "nri.s1t": "बात करें और शॉर्टलिस्ट करें", "nri.s1b": "आपका बजट, शहर और लक्ष्य समझने के लिए व्हाट्सएप या वीडियो कॉल। हम केवल साफ़-टाइटल विकल्प शॉर्टलिस्ट करते हैं।",
      "nri.s2t": "वीडियो साइट विज़िट", "nri.s2b": "प्रॉपर्टी, इलाके और पड़ोसियों पर ईमानदार टिप्पणी के साथ लाइव वीडियो वॉकथ्रू।",
      "nri.s3t": "टाइटल और कागज़ात", "nri.s3b": "स्वीकृतियाँ, EC और कानूनी राय सत्यापित। पावर ऑफ़ अटॉर्नी की व्यवस्था ताकि आप जहाँ हैं वहीं से हस्ताक्षर कर सकें।",
      "nri.s4t": "रजिस्ट्रेशन और हैंडओवर", "nri.s4b": "हम रजिस्ट्रेशन, होम लोन समन्वय और हैंडओवर संभालते हैं, और ज़रूरत हो तो बिक्री के बाद देखभाल भी।",

      "emi.nav": "EMI कैलकुलेटर", "emi.eyebrow": "होम लोन", "emi.title": "EMI कैलकुलेटर",
      "emi.sub": "अपनी मासिक होम-लोन किस्त का अनुमान लगाएं। केवल संकेतात्मक।",
      "emi.price": "प्रॉपर्टी कीमत (₹)", "emi.down": "डाउन पेमेंट (%)", "emi.rate": "ब्याज दर (% प्रति वर्ष)",
      "emi.tenure": "अवधि (वर्ष)", "emi.loanAmount": "लोन राशि", "emi.monthly": "मासिक EMI",
      "emi.totalInterest": "कुल ब्याज", "emi.totalPayable": "कुल देय",
      "emi.note": "केवल संकेतात्मक। प्रोसेसिंग फ़ीस, बीमा और कर शामिल नहीं। असली दरें अपने ऋणदाता से पुष्टि करें।",

      "footer.explore": "एक्सप्लोर करें", "footer.cities": "शहर", "footer.contact": "संपर्क",
      "footer.callUs": "हमें कॉल करें", "footer.emailUs": "हमें ईमेल करें", "footer.whatsapp": "व्हाट्सएप",
      "footer.sitemap": "साइटमैप", "footer.tagline": "हैदराबाद, चेन्नई, बेंगलुरु और विजयवाड़ा में सत्यापित घर, विला और प्लॉट।",
      "footer.rights": "सर्वाधिकार सुरक्षित।",

      "testi.eyebrow": "ग्राहक कहानियाँ", "testi.title": "खरीदार क्या कहते हैं",
      "blog.eyebrow": "जानकारी", "blog.title": "ब्लॉग और मार्केट अपडेट",
      "blog.sub": "इलाका गाइड, खरीद चेकलिस्ट और ईमानदार मार्केट विश्लेषण.",
      "games.eyebrow": "थोड़ा ब्रेक लें", "games.title": "बच्चों और बड़ों के लिए छोटे गेम्स",
      "games.sub": "ब्राउज़ करते हुए थोड़ी मस्ती। कोई डाउनलोड नहीं, कोई साइन-अप नहीं। एक गेम चुनें और यहीं खेलें।"
    }
  };

  function getLang() {
    var l = localStorage.getItem("rre_lang");
    return (l === "te" || l === "hi") ? l : "en";
  }

  function t(key, lang) {
    var d = DICT[lang] || DICT.en;
    return d[key] != null ? d[key] : (DICT.en[key] != null ? DICT.en[key] : null);
  }

  function applyLang(lang) {
    localStorage.setItem("rre_lang", lang);
    document.documentElement.setAttribute("lang", (lang === "te" || lang === "hi") ? lang : "en");

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
      '<button type="button" data-lang="te" aria-label="తెలుగు">తె</button>' +
      '<button type="button" data-lang="hi" aria-label="हिन्दी">हि</button>';
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
