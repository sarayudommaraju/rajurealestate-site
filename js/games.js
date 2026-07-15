/*
  File: js/games.js
  Purpose: Games hub for the Games tab. Three original, self-contained browser
           games: 2048, Memory Match, Tic-Tac-Toe. No third-party code, no
           external requests, no ads, no trackers — safe on the business domain.
  Engine: Vanilla JS. Depends only on the page's #game-tabs / #game-stage nodes.
  How it works: a tab bar switches games; each mount(stage) fn builds its own UI
           into the stage and returns a cleanup() that removes global listeners
           so switching games never leaks keydown handlers.
  Known failure modes: none external. All state is in-memory; refresh resets.
*/
(function () {
  var tabs = document.getElementById("game-tabs");
  var stage = document.getElementById("game-stage");
  if (!tabs || !stage) return;

  var GAMES = [
    { id: "g2048", name: "2048", icon: "🎯", mount: mount2048 },
    { id: "memory", name: "Memory Match", icon: "🏠", mount: mountMemory },
    { id: "ttt", name: "Tic-Tac-Toe", icon: "⭕", mount: mountTicTacToe }
  ];

  var cleanup = null;

  GAMES.forEach(function (g, i) {
    var b = document.createElement("button");
    b.className = "game-tab" + (i === 0 ? " active" : "");
    b.type = "button";
    b.setAttribute("role", "tab");
    b.innerHTML = '<span class="gt-ic">' + g.icon + "</span>" + g.name;
    b.addEventListener("click", function () {
      tabs.querySelectorAll(".game-tab").forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active");
      load(g);
    });
    tabs.appendChild(b);
  });

  function load(g) {
    if (typeof cleanup === "function") { try { cleanup(); } catch (e) {} }
    stage.innerHTML = "";
    cleanup = g.mount(stage) || null;
  }

  load(GAMES[0]);

  /* Small shared helpers */
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /* ================= 2048 ================= */
  function mount2048(root) {
    var SIZE = 4, board = [], score = 0, best = +(localStorage.getItem("rre_2048_best") || 0), won = false, over = false;

    var head = el("div", "g-head",
      '<div class="g-scores"><div class="g-score"><span>Score</span><b id="s2-score">0</b></div>' +
      '<div class="g-score"><span>Best</span><b id="s2-best">' + best + '</b></div></div>' +
      '<button class="btn btn--primary" id="s2-new" type="button">New game</button>');
    var msg = el("div", "g-msg", "");
    var grid = el("div", "g2048-grid");
    var hint = el("p", "g-hint", "Use arrow keys, W A S D, or swipe. Combine tiles to reach 2048.");
    root.appendChild(head); root.appendChild(msg); root.appendChild(grid); root.appendChild(hint);

    var cells = [];
    for (var i = 0; i < SIZE * SIZE; i++) { var c = el("div", "g2048-cell"); grid.appendChild(c); cells.push(c); }

    function reset() {
      board = []; for (var i = 0; i < SIZE * SIZE; i++) board.push(0);
      score = 0; won = false; over = false; msg.textContent = ""; msg.className = "g-msg";
      addTile(); addTile(); draw();
    }
    function empties() { var a = []; for (var i = 0; i < board.length; i++) if (board[i] === 0) a.push(i); return a; }
    function addTile() { var e = empties(); if (!e.length) return; board[e[Math.floor(Math.random() * e.length)]] = Math.random() < 0.9 ? 2 : 4; }
    function draw() {
      for (var i = 0; i < board.length; i++) {
        var v = board[i]; cells[i].textContent = v ? v : "";
        cells[i].className = "g2048-cell" + (v ? " t" + (v > 2048 ? "big" : v) : "");
      }
      document.getElementById("s2-score").textContent = score;
      document.getElementById("s2-best").textContent = best;
    }
    function slide(row) {
      var a = row.filter(function (x) { return x; });
      for (var i = 0; i < a.length - 1; i++) {
        if (a[i] === a[i + 1]) { a[i] *= 2; score += a[i]; if (a[i] === 2048) won = true; a.splice(i + 1, 1); }
      }
      while (a.length < SIZE) a.push(0);
      return a;
    }
    function getRow(r) { var a = []; for (var c = 0; c < SIZE; c++) a.push(board[r * SIZE + c]); return a; }
    function setRow(r, a) { for (var c = 0; c < SIZE; c++) board[r * SIZE + c] = a[c]; }
    function getCol(c) { var a = []; for (var r = 0; r < SIZE; r++) a.push(board[r * SIZE + c]); return a; }
    function setCol(c, a) { for (var r = 0; r < SIZE; r++) board[r * SIZE + c] = a[r]; }
    function rev(a) { return a.slice().reverse(); }

    function move(dir) {
      if (over) return;
      var before = board.join(",");
      var i;
      if (dir === "left") { for (i = 0; i < SIZE; i++) setRow(i, slide(getRow(i))); }
      if (dir === "right") { for (i = 0; i < SIZE; i++) setRow(i, rev(slide(rev(getRow(i))))); }
      if (dir === "up") { for (i = 0; i < SIZE; i++) setCol(i, slide(getCol(i))); }
      if (dir === "down") { for (i = 0; i < SIZE; i++) setCol(i, rev(slide(rev(getCol(i))))); }
      if (board.join(",") === before) return; // no move, no spawn
      if (score > best) { best = score; localStorage.setItem("rre_2048_best", best); }
      addTile(); draw();
      if (won && msg.textContent === "") { msg.textContent = "You made 2048! Keep going."; msg.className = "g-msg ok"; }
      if (!canMove()) { over = true; msg.textContent = "Game over. No moves left."; msg.className = "g-msg err"; }
    }
    function canMove() {
      if (empties().length) return true;
      for (var r = 0; r < SIZE; r++) for (var c = 0; c < SIZE; c++) {
        var v = board[r * SIZE + c];
        if (c < SIZE - 1 && board[r * SIZE + c + 1] === v) return true;
        if (r < SIZE - 1 && board[(r + 1) * SIZE + c] === v) return true;
      }
      return false;
    }

    function onKey(e) {
      var k = e.key.toLowerCase(), d = null;
      if (k === "arrowleft" || k === "a") d = "left";
      else if (k === "arrowright" || k === "d") d = "right";
      else if (k === "arrowup" || k === "w") d = "up";
      else if (k === "arrowdown" || k === "s") d = "down";
      if (d) { e.preventDefault(); move(d); }
    }
    document.addEventListener("keydown", onKey);

    // touch swipe
    var sx = 0, sy = 0;
    function ts(e) { var t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY; }
    function te(e) {
      var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left"); else move(dy > 0 ? "down" : "up");
    }
    grid.addEventListener("touchstart", ts, { passive: true });
    grid.addEventListener("touchend", te, { passive: true });

    document.getElementById("s2-new").addEventListener("click", reset);
    reset();

    return function () { document.removeEventListener("keydown", onKey); };
  }

  /* ================= Memory Match ================= */
  function mountMemory(root) {
    var ICONS = ["🏠", "🏡", "🏢", "🔑", "🌳", "🚪", "🪟", "🛋️"];
    var deck = [], first = null, lock = false, moves = 0, matched = 0;

    var head = el("div", "g-head",
      '<div class="g-scores"><div class="g-score"><span>Moves</span><b id="mm-moves">0</b></div>' +
      '<div class="g-score"><span>Pairs</span><b id="mm-pairs">0/' + ICONS.length + '</b></div></div>' +
      '<button class="btn btn--primary" id="mm-new" type="button">New game</button>');
    var msg = el("div", "g-msg", "");
    var gridWrap = el("div", "memory-grid");
    var hint = el("p", "g-hint", "Flip two cards. Find every matching pair in as few moves as you can.");
    root.appendChild(head); root.appendChild(msg); root.appendChild(gridWrap); root.appendChild(hint);

    function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

    function reset() {
      deck = shuffle(ICONS.concat(ICONS).map(function (ic, i) { return { ic: ic, id: i }; }));
      first = null; lock = false; moves = 0; matched = 0;
      msg.textContent = ""; msg.className = "g-msg";
      gridWrap.innerHTML = "";
      deck.forEach(function (card) {
        var b = el("button", "mem-card", '<span class="mem-face mem-back">?</span><span class="mem-face mem-front">' + card.ic + "</span>");
        b.type = "button";
        b.addEventListener("click", function () { flip(b, card); });
        card.node = b;
        gridWrap.appendChild(b);
      });
      update();
    }
    function update() {
      document.getElementById("mm-moves").textContent = moves;
      document.getElementById("mm-pairs").textContent = matched + "/" + ICONS.length;
    }
    function flip(node, card) {
      if (lock || node.classList.contains("flipped") || node.classList.contains("done")) return;
      node.classList.add("flipped");
      if (!first) { first = { node: node, card: card }; return; }
      moves++; update();
      if (first.card.ic === card.ic) {
        node.classList.add("done"); first.node.classList.add("done");
        matched++; first = null; update();
        if (matched === ICONS.length) { msg.textContent = "Solved in " + moves + " moves. Nicely done."; msg.className = "g-msg ok"; }
      } else {
        lock = true;
        var a = first.node, b = node; first = null;
        setTimeout(function () { a.classList.remove("flipped"); b.classList.remove("flipped"); lock = false; }, 750);
      }
    }
    document.getElementById("mm-new").addEventListener("click", reset);
    reset();
    return null;
  }

  /* ================= Tic-Tac-Toe (vs simple AI) ================= */
  function mountTicTacToe(root) {
    var b = [], wins = { X: 0, O: 0, d: 0 }, busy = false;
    var LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

    var head = el("div", "g-head",
      '<div class="g-scores"><div class="g-score"><span>You (X)</span><b id="ttt-x">0</b></div>' +
      '<div class="g-score"><span>CPU (O)</span><b id="ttt-o">0</b></div>' +
      '<div class="g-score"><span>Draws</span><b id="ttt-d">0</b></div></div>' +
      '<button class="btn btn--primary" id="ttt-new" type="button">New round</button>');
    var msg = el("div", "g-msg", "You are X. Tap a square to start.");
    var grid = el("div", "ttt-grid");
    var hint = el("p", "g-hint", "Get three in a row before the computer does.");
    root.appendChild(head); root.appendChild(msg); root.appendChild(grid); root.appendChild(hint);

    var cells = [];
    for (var i = 0; i < 9; i++) {
      (function (idx) {
        var c = el("button", "ttt-cell", ""); c.type = "button";
        c.addEventListener("click", function () { play(idx); });
        grid.appendChild(c); cells.push(c);
      })(i);
    }

    function reset(keepMsg) {
      b = ["","","","","","","","",""]; busy = false;
      cells.forEach(function (c) { c.textContent = ""; c.className = "ttt-cell"; });
      if (!keepMsg) { msg.textContent = "Your move (X)."; msg.className = "g-msg"; }
    }
    function winner(bd) {
      for (var i = 0; i < LINES.length; i++) { var L = LINES[i]; if (bd[L[0]] && bd[L[0]] === bd[L[1]] && bd[L[1]] === bd[L[2]]) return { who: bd[L[0]], line: L }; }
      return bd.indexOf("") === -1 ? { who: "draw" } : null;
    }
    function draw() { for (var i = 0; i < 9; i++) { cells[i].textContent = b[i]; cells[i].classList.toggle("x", b[i] === "X"); cells[i].classList.toggle("o", b[i] === "O"); } }
    function play(i) {
      if (busy || b[i]) return;
      b[i] = "X"; draw();
      var w = winner(b); if (w) return finish(w);
      busy = true; msg.textContent = "CPU thinking…"; msg.className = "g-msg";
      setTimeout(function () { var m = aiMove(); b[m] = "O"; draw(); var w2 = winner(b); busy = false; if (w2) finish(w2); else { msg.textContent = "Your move (X)."; } }, 380);
    }
    function finish(w) {
      busy = true;
      if (w.who === "draw") { wins.d++; msg.textContent = "Draw."; msg.className = "g-msg"; }
      else if (w.who === "X") { wins.X++; msg.textContent = "You win! 🎉"; msg.className = "g-msg ok"; highlight(w.line); }
      else { wins.O++; msg.textContent = "CPU wins this round."; msg.className = "g-msg err"; highlight(w.line); }
      document.getElementById("ttt-x").textContent = wins.X;
      document.getElementById("ttt-o").textContent = wins.O;
      document.getElementById("ttt-d").textContent = wins.d;
      setTimeout(function () { reset(); }, 1400);
    }
    function highlight(line) { if (line) line.forEach(function (i) { cells[i].classList.add("win"); }); }
    // AI: win if it can, block if it must, else prefer center, corners, sides.
    function findWin(who) {
      for (var i = 0; i < 9; i++) if (!b[i]) { b[i] = who; var w = winner(b); b[i] = ""; if (w && w.who === who) return i; }
      return -1;
    }
    function aiMove() {
      var m = findWin("O"); if (m > -1) return m;
      m = findWin("X"); if (m > -1) return m;
      if (!b[4]) return 4;
      var order = [0, 2, 6, 8, 1, 3, 5, 7], free = order.filter(function (i) { return !b[i]; });
      return free[Math.floor(Math.random() * free.length)];
    }
    document.getElementById("ttt-new").addEventListener("click", function () { reset(); });
    reset();
    return null;
  }
})();
