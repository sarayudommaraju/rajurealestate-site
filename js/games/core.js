/*
  File: js/games/core.js
  Purpose: Shared registry + DOM helpers for the games hub. Lets each game live
           in its own file instead of growing js/games.js without bound.
  Engine: Vanilla JS (ES5 syntax, no build step, no transpiler).
  Platform: Cloudflare Pages static hosting, served under a strict CSP
           (script-src 'self'; no 'unsafe-inline', no 'wasm-unsafe-eval').
  Constraints: Must load BEFORE every game module and before js/games.js.
           No inline script, no external fetch, no WASM — all three are blocked
           by the CSP in /_headers and adding exceptions is out of scope.
  Dependencies: none.
  Expected behaviour: defines window.RREGames. Game modules call RREGames.add()
           at load time; js/games.js concatenates RREGames.list onto its own
           built-in GAMES array, so tab order is: built-ins, then module games
           in script-tag order.
  Known failure modes: if a game module loads before this file, RREGames is
           undefined and that module silently no-ops (each module guards on it).
           Symptom is a missing tab, never a thrown error.
*/
(function () {
  var api = {
    list: [],

    /* Called by each game module at load time. def = {id,name,icon,mount}.
       mount(stage) builds UI into stage and returns an optional cleanup()
       that must remove any document-level listeners and cancel any timers —
       the hub calls it before switching games, so leaks here survive forever. */
    add: function (def) {
      if (!def || !def.id || typeof def.mount !== "function") return;
      api.list.push(def);
    },

    el: function (tag, cls, html) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (html != null) e.innerHTML = html;
      return e;
    },

    /* Standard game header: title row on the left, score boxes on the right.
       scores = [{key,label}]; returns {node, set(key,value)}. */
    head: function (scores) {
      var wrap = api.el("div", "g-head");
      var left = api.el("div", "g-head-left");
      var box = api.el("div", "g-scores");
      var refs = {};
      (scores || []).forEach(function (s) {
        var b = api.el("div", "g-score");
        b.appendChild(api.el("span", null, s.label));
        var v = api.el("b", null, String(s.value == null ? 0 : s.value));
        b.appendChild(v);
        refs[s.key] = v;
        box.appendChild(b);
      });
      wrap.appendChild(left);
      wrap.appendChild(box);
      return {
        node: wrap,
        left: left,
        set: function (k, v) { if (refs[k]) refs[k].textContent = String(v); }
      };
    },

    /* Segmented control used for difficulty / mode pickers.
       opts = [{value,label}]; onPick(value) fires on click. */
    seg: function (opts, value, onPick) {
      var wrap = api.el("div", "g-seg");
      opts.forEach(function (o) {
        var b = api.el("button", "g-seg-btn" + (o.value === value ? " active" : ""), o.label);
        b.type = "button";
        b.addEventListener("click", function () {
          wrap.querySelectorAll(".g-seg-btn").forEach(function (x) { x.classList.remove("active"); });
          b.classList.add("active");
          onPick(o.value);
        });
        wrap.appendChild(b);
      });
      return wrap;
    },

    btn: function (label, cls) {
      var b = api.el("button", "g-btn" + (cls ? " " + cls : ""), label);
      b.type = "button";
      return b;
    }
  };

  window.RREGames = api;
})();
