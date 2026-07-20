/*
  File: js/games/wordle.js
  Purpose: Five-letter word guessing game, six attempts, unlimited plays.
  Engine: Vanilla JS (ES5 syntax, no build step).
  Platform: Cloudflare Pages under strict CSP (script-src 'self').
  Constraints: no daily/date-seeded word by design — a new random answer every
           round, so the game is immediately replayable. No server, so there is
           no shared daily state to synchronise anyway.
  Dependencies: js/games/core.js (window.RREGames), js/games/words.js
           (window.RREWords). Both must load first.
  Expected behaviour: registers a "Word Guess" tab. Type or tap letters, Enter
           submits, Backspace deletes. Green = right letter right place,
           amber = right letter wrong place, grey = not in the word.
  Known failure modes:
    - The accept list is a 1934 dictionary union, so it allows obscure guesses.
      Answers are drawn only from the curated common list, so this never makes
      the game unfair, only occasionally surprising.
    - Physical-keyboard input is bound to document; the cleanup() returned by
      mount() removes it. If that is not called the handler survives a tab
      switch and steals keystrokes from the next game.
*/
(function () {
  var G = window.RREGames;
  var W = window.RREWords;
  if (!G || !W) return;

  var ROWS = 6, COLS = 5;
  var KEYS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

  /* Two-pass scoring. Greens are claimed first, then yellows are drawn from
     whatever letters remain unclaimed. A single pass marks the second L in
     LLAMA yellow when the answer holds only one L, which is wrong. */
  function score(guess, answer) {
    var res = new Array(COLS), pool = {}, i, c;
    for (i = 0; i < COLS; i++) {
      if (guess[i] === answer[i]) { res[i] = "hit"; }
      else { c = answer[i]; pool[c] = (pool[c] || 0) + 1; }
    }
    for (i = 0; i < COLS; i++) {
      if (res[i]) continue;
      c = guess[i];
      if (pool[c] > 0) { res[i] = "near"; pool[c]--; }
      else res[i] = "miss";
    }
    return res;
  }

  function mountWordle(root) {
    var answer = "", row = 0, cur = "", over = false;
    var keyState = {};   /* letter -> best result seen so far */
    var wins = 0, played = 0;

    var head = G.head([
      { key: "won", label: "Won", value: 0 },
      { key: "played", label: "Played", value: 0 }
    ]);
    root.appendChild(head.node);

    var msg = G.el("div", "g-msg");
    root.appendChild(msg);

    var grid = G.el("div", "wd-grid");
    var tiles = [];
    for (var r = 0; r < ROWS; r++) {
      var line = G.el("div", "wd-row");
      var tr = [];
      for (var c = 0; c < COLS; c++) {
        var t = G.el("div", "wd-tile");
        line.appendChild(t);
        tr.push(t);
      }
      tiles.push(tr);
      grid.appendChild(line);
    }
    root.appendChild(grid);

    var kb = G.el("div", "wd-kb");
    var keyEls = {};
    KEYS.forEach(function (rowStr, ri) {
      var kr = G.el("div", "wd-kb-row");
      if (ri === 2) kr.appendChild(mkKey("Enter", "wd-key wide"));
      for (var i = 0; i < rowStr.length; i++) kr.appendChild(mkKey(rowStr[i], "wd-key"));
      if (ri === 2) kr.appendChild(mkKey("Del", "wd-key wide"));
      kb.appendChild(kr);
    });
    root.appendChild(kb);

    var bar = G.el("div", "g-actions");
    var bNew = G.btn("New word");
    var bGive = G.btn("Give up");
    bar.appendChild(bNew); bar.appendChild(bGive);
    root.appendChild(bar);
    root.appendChild(G.el("p", "g-hint", "Six tries. Green is the right letter in the right spot, amber is right letter wrong spot."));

    function mkKey(label, cls) {
      var b = G.el("button", cls, label);
      b.type = "button";
      b.addEventListener("click", function () {
        if (label === "Enter") submit();
        else if (label === "Del") back();
        else press(label);
      });
      if (label.length === 1) keyEls[label] = b;
      return b;
    }

    function press(ch) {
      if (over || cur.length >= COLS) return;
      cur += ch;
      paint();
    }
    function back() {
      if (over || !cur.length) return;
      cur = cur.slice(0, -1);
      paint();
    }

    function submit() {
      if (over) return;
      if (cur.length < COLS) { flash("Not enough letters."); return; }
      if (!W.isWord(cur)) { flash("Not in the word list."); return; }

      var res = score(cur, answer);
      for (var i = 0; i < COLS; i++) {
        tiles[row][i].className = "wd-tile filled " + res[i];
        /* Key colour only ever improves: a letter shown green must not be
           downgraded to amber by a later guess. */
        var k = cur[i], rank = { miss: 1, near: 2, hit: 3 };
        if (!keyState[k] || rank[res[i]] > rank[keyState[k]]) keyState[k] = res[i];
      }
      paintKeys();

      if (cur === answer) {
        over = true; wins++; played++;
        head.set("won", wins); head.set("played", played);
        msg.textContent = row === 0 ? "First try. Remarkable." : "Got it in " + (row + 1) + ".";
        msg.className = "g-msg ok";
        return;
      }
      row++;
      cur = "";
      if (row >= ROWS) {
        over = true; played++;
        head.set("played", played);
        msg.textContent = "Out of tries. The word was " + answer.toUpperCase() + ".";
        msg.className = "g-msg err";
        return;
      }
      msg.textContent = (ROWS - row) + " tries left.";
      msg.className = "g-msg";
      paint();
    }

    function flash(text) {
      msg.textContent = text;
      msg.className = "g-msg err";
      var r = tiles[row];
      for (var i = 0; i < COLS; i++) r[i].classList.add("shake");
      setTimeout(function () { for (var i = 0; i < COLS; i++) r[i].classList.remove("shake"); }, 350);
    }

    function paint() {
      for (var i = 0; i < COLS; i++) {
        var t = tiles[row][i];
        t.textContent = cur[i] ? cur[i].toUpperCase() : "";
        t.className = "wd-tile" + (cur[i] ? " active" : "");
      }
    }

    function paintKeys() {
      Object.keys(keyEls).forEach(function (k) {
        keyEls[k].className = "wd-key" + (keyState[k] ? " " + keyState[k] : "");
      });
    }

    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Enter") { e.preventDefault(); submit(); return; }
      if (e.key === "Backspace") { e.preventDefault(); back(); return; }
      var ch = e.key.toLowerCase();
      if (ch.length === 1 && ch >= "a" && ch <= "z") { e.preventDefault(); press(ch); }
    }
    document.addEventListener("keydown", onKey);

    bNew.addEventListener("click", reset);
    bGive.addEventListener("click", function () {
      if (over) return;
      over = true; played++;
      head.set("played", played);
      msg.textContent = "The word was " + answer.toUpperCase() + ".";
      msg.className = "g-msg err";
    });

    function reset() {
      answer = W.answers[Math.floor(Math.random() * W.answers.length)];
      row = 0; cur = ""; over = false; keyState = {};
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
        tiles[r][c].textContent = "";
        tiles[r][c].className = "wd-tile";
      }
      paintKeys();
      msg.textContent = "Six tries. Good luck.";
      msg.className = "g-msg";
    }

    reset();
    return function () { document.removeEventListener("keydown", onKey); };
  }

  G.add({ id: "wordle", name: "Word Guess", icon: "🔤", mount: mountWordle });
})();
