# Raju Real Estate — rajurealestate.com

Static listings site. Plain HTML/CSS/JS, no build step. Listings live in `data/listings.json`.
Contact form is handled by a Cloudflare Pages Function (`functions/api/contact.js`) that emails leads via Resend.

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
│   ├── contact.js      Contact form submit
│   ├── games.js        Games hub + the ten arcade/puzzle games
│   └── games/          Board games, one file each (see below)
├── data/listings.json  ← EDIT: all properties (source of truth)
├── functions/api/contact.js  Cloudflare Pages Function (POST /api/contact → Resend)
├── images/
│   ├── logo.svg, logo-white.svg, favicon.svg, placeholder.svg
│   └── listings/<id>/  ← drop real photos here (1.jpg, 2.jpg …)
├── tools/              Dev-only test harnesses (see note below)
├── robots.txt
└── README.md
```

### Games

`js/games.js` holds the ten original arcade and puzzle games and builds the tab
bar. The five board games are too large for one file and live in `js/games/`,
registering themselves through `window.RREGames` (see `js/games/core.js`):
Chess, Draughts, Connect Four, Sudoku and Word Guess.

Everything is self-hosted vanilla JS. **No WASM.** A Stockfish build cannot
instantiate under the CSP in `_headers` without adding `'wasm-unsafe-eval'`,
which is deliberately excluded, so the chess opponent is a hand-written
negamax. It is deliberately modest: expect roughly 4-6 ply on desktop and less
on a phone. Draughts is international 10x10 (flying kings, compulsory maximum
capture), not American checkers.

Script order in `games.html` matters: `core.js`, then `search.js` and
`words.js`, then each game, then `games.js` last.

Tab labels are translated via `games.name.<id>` keys in `js/i18n.js`. In-game
strings are still English in all locales.

### tools/

`tools/perft.js` and `tools/games-test.js` are Node test harnesses, run with
`node tools/perft.js` and `node tools/games-test.js`. Perft proves the chess
move generator against published node counts; games-test covers the draughts
rules, Sudoku uniqueness and Connect Four.

These are **deployed to the public root along with everything else**, so they
are readable at `/tools/…` on the live site. That is a deliberate choice: they
hold no secrets and no site logic, and the alternatives either drop the tests
out of version control or mean restructuring the whole site. Cloudflare Pages
`_redirects` cannot return a 404, so there is no cheap way to hide them.

## Run it locally (required — do not open via file://)

`fetch()` of the JSON is blocked on `file://`, so serve over http:

```bash
cd rajurealestate
python3 -m http.server 8000
# open http://localhost:8000
```

The contact form's `/api/contact` endpoint only runs on Cloudflare (or `npx wrangler pages dev .`), not the plain Python server. Everything else works locally.

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
