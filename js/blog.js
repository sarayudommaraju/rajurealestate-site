/*
  File: js/blog.js
  Purpose: Renders the blog index (blog.html) and single posts (post.html) from
           data/posts.json. Sets per-post SEO (title/canonical/OG) + Article JSON-LD.
  Engine: Vanilla JS. Depends on site.js.
  Known failure modes: unknown/missing ?slug on post.html shows a not-found state.
*/
(function () {
  var grid = document.getElementById("blog-grid");   // present on blog.html
  var postRoot = document.getElementById("post-root"); // present on post.html

  function loadPosts() {
    return fetch("data/posts.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) {
        var posts = (j.posts || []).slice();
        posts.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
        return posts;
      });
  }

  function fmtDate(d) {
    var dt = new Date(d);
    if (isNaN(dt)) return d || "";
    return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function tagPills(tags) {
    return (tags || []).map(function (t) { return '<span class="badge badge--type" style="position:static">' + esc(t) + '</span>'; }).join(" ");
  }

  /* ---------- Blog index ---------- */
  if (grid) {
    loadPosts().then(function (posts) {
      if (!posts.length) { grid.innerHTML = '<p class="muted">No articles yet. Check back soon.</p>'; return; }
      grid.innerHTML = posts.map(function (p) {
        return '<article class="card reveal in" style="padding:22px">' +
          '<div class="card-badges" style="position:static;margin-bottom:12px">' + tagPills(p.tags) + '</div>' +
          '<div class="muted" style="font-size:.82rem;margin-bottom:6px">' + fmtDate(p.date) + '</div>' +
          '<a href="post.html?slug=' + encodeURIComponent(p.slug) + '"><h3 class="card-title" style="font-size:1.15rem">' + esc(p.title) + '</h3></a>' +
          '<p class="muted" style="margin:10px 0 16px">' + esc(p.excerpt || "") + '</p>' +
          '<div class="card-foot" style="border:0;padding:0;margin-top:auto">' +
            '<a class="btn btn--ghost" href="post.html?slug=' + encodeURIComponent(p.slug) + '">Read article →</a>' +
          '</div>' +
        '</article>';
      }).join("");
      if (window.rreApplyLang) window.rreApplyLang(window.rreLang());
    }).catch(function (e) {
      grid.innerHTML = '<p class="muted">Could not load articles. Serve over http (see README).</p>';
      console.error(e);
    });
  }

  /* ---------- Single post ---------- */
  if (postRoot) {
    var slug = new URLSearchParams(location.search).get("slug");
    loadPosts().then(function (posts) {
      var p = posts.find(function (x) { return x.slug === slug; });
      if (!p) {
        postRoot.innerHTML = '<div style="padding:60px 0;text-align:center"><h1>Article not found</h1><p class="muted">This article may have moved.</p><a class="btn btn--primary" href="blog.html">All articles</a></div>';
        return;
      }
      var url = "https://rajurealestate.com/post?slug=" + encodeURIComponent(p.slug);
      document.title = p.title + " — Raju Real Estate";
      setMeta("description", p.excerpt || p.title);
      setA("post-canonical", "href", url);
      setC("post-og-title", p.title);
      setC("post-og-desc", p.excerpt || p.title);
      setC("post-og-url", url);

      postRoot.innerHTML =
        '<div class="pd-crumb" style="margin-bottom:14px"><a href="blog.html">Blog</a> › ' + esc(p.title) + '</div>' +
        '<div class="card-badges" style="position:static;margin-bottom:12px">' + tagPills(p.tags) + '</div>' +
        '<h1 style="font-size:2.1rem;margin:0 0 8px">' + esc(p.title) + '</h1>' +
        '<div class="muted" style="margin-bottom:24px">' + fmtDate(p.date) + (p.author ? ' · ' + esc(p.author) : '') + '</div>' +
        '<div class="post-body">' + (p.body || '') + '</div>' +
        '<div class="cta-band" style="margin-top:40px"><h2>Looking for the right property?</h2>' +
          '<p>Tell us what you need and we\'ll shortlist verified options.</p>' +
          '<div class="hero-cta" style="justify-content:center"><a class="btn btn--accent" href="contact.html">Contact us</a>' +
          '<a class="btn btn--light" href="listings.html">Browse listings</a></div></div>';

      injectLD("post-ld", {
        "@context": "https://schema.org", "@type": "BlogPosting",
        "headline": p.title, "description": p.excerpt || p.title,
        "datePublished": p.date, "dateModified": p.date,
        "author": { "@type": "Person", "name": p.author || "Raju Real Estate" },
        "publisher": { "@type": "Organization", "name": "Raju Real Estate", "logo": { "@type": "ImageObject", "url": "https://rajurealestate.com/images/og-cover.jpg" } },
        "image": "https://rajurealestate.com/images/og-cover.jpg",
        "mainEntityOfPage": url, "url": url
      });
      if (window.rreApplyLang) window.rreApplyLang(window.rreLang());
    }).catch(function (e) {
      postRoot.innerHTML = '<p class="muted" style="padding:60px 0">Could not load this article. Serve over http (see README).</p>';
      console.error(e);
    });
  }

  function setMeta(n, v) { var m = document.querySelector('meta[name="' + n + '"]'); if (m) m.setAttribute("content", v); }
  function setA(id, a, v) { var e = document.getElementById(id); if (e) e.setAttribute(a, v); }
  function setC(id, v) { var e = document.getElementById(id); if (e) e.setAttribute("content", v); }
  function injectLD(id, obj) {
    var old = document.getElementById(id); if (old) old.remove();
    var s = document.createElement("script"); s.type = "application/ld+json"; s.id = id;
    s.textContent = rreLdJson(obj); document.head.appendChild(s);
  }
})();
