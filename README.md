# Raju Real Estate — rajurealestate.com

Static listings site. Plain HTML/CSS/JS, no build step. Listings live in `data/listings.json`.
Contact form is handled by a Cloudflare Pages Function (`functions/contact.js`) that emails leads via Resend.

## Project layout

```
rajurealestate/
├── index.html          Home (hero, quick search, featured, cities, CTA)
├── listings.html       Listings grid + full filter rail
├── property.html       Single property (gallery, Leaflet map, EMI, enquiry)
├── about.html          About / agent
├── contact.html        Contact + enquiry form
├── 404.html
├── css/styles.css      Design system (indigo + amber)
├── js/
│   ├── config.js       ← EDIT: phone, email, WhatsApp, address, GA4 id
│   ├── site.js         Shared helpers + UI (nav, WhatsApp float, GA4)
│   ├── cards.js        Listing card markup (shared)
│   ├── home.js         Home logic
│   ├── listings.js     Filter/sort engine (client-side)
│   ├── property.js     Detail page + map + EMI + enquiry
│   └── contact.js      Contact form submit
├── data/listings.json  ← EDIT: all properties (source of truth)
├── functions/contact.js  Cloudflare Pages Function (POST /contact → Resend)
├── images/
│   ├── logo.svg, logo-white.svg, favicon.svg, placeholder.svg
│   └── listings/<id>/  ← drop real photos here (1.jpg, 2.jpg …)
├── robots.txt
└── README.md
```

## Run it locally (required — do not open via file://)

`fetch()` of the JSON is blocked on `file://`, so serve over http:

```bash
cd rajurealestate
python3 -m http.server 8000
# open http://localhost:8000
```

The contact form's `/contact` endpoint only runs on Cloudflare (or `npx wrangler pages dev .`), not the plain Python server. Everything else works locally.

## Before go-live — fill these in

1. `js/config.js`: `phoneDisplay`, `phoneDial`, `email`, `whatsapp`, `addressLine`, `ga4Id`.
2. `data/listings.json`: replace sample listings with real ones.
3. Photos: drop files into `images/listings/<id>/` named to match each listing's `images[]`.

---

## Deploy: GitHub → Cloudflare Pages → rajurealestate.com

### 1. Push to GitHub
```bash
cd rajurealestate
git init
git add .
git commit -m "Raju Real Estate — initial site"
git branch -M main
git remote add origin https://github.com/<your-username>/rajurealestate.git
git push -u origin main
```

### 2. Create the Pages project
- dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
- Pick the `rajurealestate` repo.
- Build settings: **Framework preset: None**, **Build command: (blank)**, **Output directory: `/`**.
- **Save and Deploy** → you get a `https://<project>.pages.dev` URL.

### 3. Contact form (Resend)
- Create a free account at resend.com. Add and verify the domain `rajurealestate.com` (Resend gives you DNS records; add them in step 5).
- Create an API key.
- Cloudflare → Pages project → **Settings → Variables and Secrets** → add:
  - `RESEND_API_KEY` = your Resend key
  - `LEAD_TO_EMAIL` = inbox that receives leads
  - `LEAD_FROM_EMAIL` = `Raju Real Estate <noreply@rajurealestate.com>` (must be on the verified domain)
- Redeploy so the function picks up the variables.

### 4. Move the domain to Cloudflare
- Cloudflare → **Add a site** → `rajurealestate.com` → Free plan. Note the two assigned nameservers.
- Squarespace → **Domains → rajurealestate.com → Nameservers → Custom** → paste Cloudflare's two nameservers → save. (Reversible anytime.)

### 5. DNS + custom domain
- Pages project → **Custom domains** → add `rajurealestate.com` and `www.rajurealestate.com`. Cloudflare creates the records and issues SSL.
- Add the Resend verification records (from step 3) in Cloudflare DNS.

### 6. Go-live checks
- Visit `https://rajurealestate.com` (padlock + www redirect).
- Submit the contact form; confirm the lead email arrives.
- Google Search Console → add `rajurealestate.com`, verify via a TXT record, submit the sitemap (Phase 2).
- Confirm GA4 Realtime shows your visit.

---

## Weekly updates (the whole point)

Edit `data/listings.json` (or add a photo folder), then:
```bash
git add .
git commit -m "Update listings"
git push
```
Cloudflare rebuilds and publishes in about a minute. No manual upload.

### Adding a listing
Copy an existing object in `data/listings.json`, change the fields. Key rules:
- `price` is whole rupees, no commas (₹1.25 Cr = `12500000`).
- `status`: `sale` | `sold` | `rent`. `type`: `plot` | `house` | `villa` | `apartment` | `commercial`.
- `areaUnit`: `sqft` | `sqyd` | `acre`.
- `lat`/`lng`: right-click the spot in Google Maps → copy the two numbers → paste.
- Create `images/listings/<id>/` and list the filenames in `images[]`.
