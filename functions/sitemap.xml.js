/*
  File: functions/sitemap.xml.js
  Purpose: Cloudflare Pages Function serving /sitemap.xml, generated live from
           data/listings.json so it never goes stale as listings change.
  Engine: Cloudflare Pages Functions (Workers runtime).
  Route: /sitemap.xml
  Behavior: static pages + one URL per non-sold listing. Cached 1h at the edge.
  Known failure modes: if listings.json can't be read, still returns the static
    pages so the sitemap is never empty/broken.
  Docs: https://developers.cloudflare.com/pages/functions/
*/
const ORIGIN = "https://rajurealestate.com";

const STATIC = [
  { path: "/", priority: "1.0", freq: "daily" },
  { path: "/listings.html", priority: "0.9", freq: "daily" },
  { path: "/about.html", priority: "0.6", freq: "monthly" },
  { path: "/contact.html", priority: "0.6", freq: "monthly" },
  { path: "/sitemap.html", priority: "0.3", freq: "monthly" }
];

export async function onRequest(context) {
  const { request, env } = context;
  const today = new Date().toISOString().slice(0, 10);
  let urls = STATIC.map((s) => urlEntry(ORIGIN + s.path, today, s.freq, s.priority));

  try {
    // Read the deployed listings.json via the static-asset origin.
    const res = await env.ASSETS.fetch(new URL("/data/listings.json", request.url));
    if (res.ok) {
      const data = await res.json();
      (data.listings || [])
        .filter((l) => l.status !== "sold")
        .forEach((l) => {
          const lastmod = (l.listedOn || today).slice(0, 10);
          urls.push(urlEntry(ORIGIN + "/property.html?id=" + encodeURIComponent(l.id), lastmod, "weekly", "0.8"));
        });
    }
  } catch (_) {
    // fall through with static pages only
  }

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.join("\n") +
    "\n</urlset>\n";

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}

function urlEntry(loc, lastmod, freq, priority) {
  return (
    "  <url>\n" +
    "    <loc>" + escapeXml(loc) + "</loc>\n" +
    "    <lastmod>" + lastmod + "</lastmod>\n" +
    "    <changefreq>" + freq + "</changefreq>\n" +
    "    <priority>" + priority + "</priority>\n" +
    "  </url>"
  );
}

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));
}
