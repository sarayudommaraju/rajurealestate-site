/*
  File: js/games.js
  Purpose: Games hub for the Games tab, plus the ten original arcade and puzzle
           games that were small enough to keep in one file: 2048, Memory Match,
           Snake, Brick Breaker, Jump Hero, Sky Hop, Simon, Whack-a-Mole,
           Minesweeper, Tic-Tac-Toe. No third-party code, no external requests,
           no ads, no trackers — safe on the business domain.
  Engine: Vanilla JS. Depends only on the page's #game-tabs / #game-stage nodes.
  How it works: a tab bar switches games; each mount(stage) fn builds its own UI
           into the stage and returns a cleanup() that removes global listeners
           so switching games never leaks keydown handlers.
           The board games (Chess, Draughts, Connect Four, Sudoku, Word Guess)
           are too large to sit here and live in js/games/*.js, registering
           themselves through window.RREGames (see js/games/core.js).
  Known failure modes: none external. All state is in-memory; refresh resets.
*/
(function () {
  var tabs = document.getElementById("game-tabs");
  var stage = document.getElementById("game-stage");
  if (!tabs || !stage) return;

  var GAMES = [
    { id: "g2048", name: "2048", icon: "🎯", mount: mount2048 },
    { id: "memory", name: "Memory Match", icon: "🏠", mount: mountMemory },
    { id: "snake", name: "Snake", icon: "🐍", mount: mountSnake },
    { id: "breakout", name: "Brick Breaker", icon: "🧱", mount: mountBreakout },
    { id: "jump", name: "Jump Hero", icon: "🦘", mount: mountJumpHero },
    { id: "tapjump", name: "Sky Hop", icon: "🐤", mount: mountTapJump },
    { id: "simon", name: "Simon", icon: "🎵", mount: mountSimon },
    { id: "whack", name: "Whack-a-Mole", icon: "🔨", mount: mountWhack },
    { id: "mines", name: "Minesweeper", icon: "💣", mount: mountMines },
    { id: "ttt", name: "Tic-Tac-Toe", icon: "⭕", mount: mountTicTacToe }
  ];

  /* Games that live in their own file under js/games/ register themselves on
     window.RREGames as they load. Those scripts are tagged before this one, so
     the list is complete by now. Appending keeps the original ten first in the
     tab bar and the default game unchanged. */
  if (window.RREGames && window.RREGames.list.length) {
    GAMES = GAMES.concat(window.RREGames.list);
  }

  var cleanup = null;

  GAMES.forEach(function (g, i) {
    var b = document.createElement("button");
    b.className = "game-tab" + (i === 0 ? " active" : "");
    b.type = "button";
    b.setAttribute("role", "tab");
    /* The label is its own element so i18n.js can swap it. The icon sits in a
       sibling span and is never translated. Keys are games.name.<id> in
       js/i18n.js; a missing key falls back to the English name below. */
    b.innerHTML = '<span class="gt-ic">' + g.icon + '</span>' +
      '<span data-i18n="games.name.' + g.id + '">' + g.name + "</span>";
    b.addEventListener("click", function () {
      tabs.querySelectorAll(".game-tab").forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active");
      load(g);
    });
    tabs.appendChild(b);
  });

  /* Tabs are built while the document is still parsing, so the applyLang pass
     that i18n.js runs on DOMContentLoaded already covers them. This re-apply is
     insurance against the script order changing later: without it, reordering
     games.js after that event would silently leave every tab in English. */
  if (window.rreApplyLang && window.rreLang) window.rreApplyLang(window.rreLang());

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

  /* Shared: brand colours pulled from CSS vars so games match the theme. */
  function cssv(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }
  function canvasHead(title, scoreId, scoreLabel, bestId, hint) {
    return el("div", "g-head",
      '<div class="g-scores"><div class="g-score"><span>' + scoreLabel + '</span><b id="' + scoreId + '">0</b></div>' +
      (bestId ? '<div class="g-score"><span>Best</span><b id="' + bestId + '">0</b></div>' : "") +
      '</div><button class="btn btn--primary" id="' + title + '-new" type="button">New game</button>');
  }

  /* ================= Snake ================= */
  function mountSnake(root) {
    var N = 20, size = 20, dim = N * size;
    var snake, dir, ndir, food, score, dead, raf, acc, last, best = +(localStorage.getItem("rre_snake_best") || 0);
    root.appendChild(canvasHead("snake", "sn-score", "Length", "sn-best", 0));
    document.getElementById("sn-best").textContent = best;
    var msg = el("div", "g-msg", ""); root.appendChild(msg);
    var cv = el("canvas", "g-canvas"); cv.width = dim; cv.height = dim; root.appendChild(cv);
    root.appendChild(el("p", "g-hint", "Arrow keys / W A S D / swipe. Eat the fruit, avoid walls and yourself."));
    var ctx = cv.getContext("2d");
    var navy = cssv("--brand", "#23395d"), gold = cssv("--gold", "#b07a35");

    function placeFood() {
      do { food = { x: (Math.random() * N) | 0, y: (Math.random() * N) | 0 }; }
      while (snake.some(function (s) { return s.x === food.x && s.y === food.y; }));
    }
    function reset() {
      snake = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }];
      dir = { x: 1, y: 0 }; ndir = dir; score = 3; dead = false; acc = 0; last = 0;
      msg.textContent = ""; msg.className = "g-msg"; placeFood(); document.getElementById("sn-score").textContent = score;
    }
    function tick(dt) {
      acc += dt; if (acc < 110) return; acc = 0;
      dir = ndir;
      var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N || snake.some(function (s) { return s.x === head.x && s.y === head.y; })) {
        dead = true; msg.textContent = "Game over. Length " + score + "."; msg.className = "g-msg err";
        if (score > best) { best = score; localStorage.setItem("rre_snake_best", best); document.getElementById("sn-best").textContent = best; }
        return;
      }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) { score++; document.getElementById("sn-score").textContent = score; placeFood(); }
      else snake.pop();
    }
    function paint() {
      ctx.fillStyle = "#eef3f8"; ctx.fillRect(0, 0, dim, dim);
      ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(food.x * size + size / 2, food.y * size + size / 2, size / 2 - 2, 0, 7); ctx.fill();
      snake.forEach(function (s, i) { ctx.fillStyle = i === 0 ? navy : "#3a5580"; roundRect(ctx, s.x * size + 1, s.y * size + 1, size - 2, size - 2, 4); ctx.fill(); });
    }
    function loop(t) { if (!last) last = t; var dt = t - last; last = t; if (!dead) { tick(dt); paint(); } raf = requestAnimationFrame(loop); }
    function onKey(e) {
      var k = e.key.toLowerCase(), d = null;
      if ((k === "arrowleft" || k === "a") && dir.x !== 1) d = { x: -1, y: 0 };
      else if ((k === "arrowright" || k === "d") && dir.x !== -1) d = { x: 1, y: 0 };
      else if ((k === "arrowup" || k === "w") && dir.y !== 1) d = { x: 0, y: -1 };
      else if ((k === "arrowdown" || k === "s") && dir.y !== -1) d = { x: 0, y: 1 };
      if (d) { e.preventDefault(); ndir = d; }
    }
    var sx, sy;
    function ts(e) { var t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY; }
    function te(e) {
      var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
      if (Math.abs(dx) > Math.abs(dy)) { if (dx > 0 && dir.x !== -1) ndir = { x: 1, y: 0 }; else if (dx < 0 && dir.x !== 1) ndir = { x: -1, y: 0 }; }
      else { if (dy > 0 && dir.y !== -1) ndir = { x: 0, y: 1 }; else if (dy < 0 && dir.y !== 1) ndir = { x: 0, y: -1 }; }
    }
    document.addEventListener("keydown", onKey);
    cv.addEventListener("touchstart", ts, { passive: true });
    cv.addEventListener("touchend", te, { passive: true });
    document.getElementById("snake-new").addEventListener("click", reset);
    reset(); raf = requestAnimationFrame(loop);
    return function () { cancelAnimationFrame(raf); document.removeEventListener("keydown", onKey); };
  }

  /* ================= Brick Breaker ================= */
  function mountBreakout(root) {
    var W = 440, H = 360, raf, last;
    var paddle, ball, bricks, score, lives, over, win;
    root.appendChild(canvasHead("bo", "bo-score", "Score", 0, 0));
    var msg = el("div", "g-msg", "Lives: 3"); root.appendChild(msg);
    var cv = el("canvas", "g-canvas"); cv.width = W; cv.height = H; root.appendChild(cv);
    root.appendChild(el("p", "g-hint", "Move with mouse or arrow keys. Clear every brick, don't drop the ball."));
    var ctx = cv.getContext("2d");
    var navy = cssv("--brand", "#23395d"), gold = cssv("--gold", "#b07a35");
    var COLS = 8, ROWS = 4, bw = W / COLS, bh = 22, left = false, right = false;

    function reset() {
      paddle = { x: W / 2 - 42, w: 84, h: 12 };
      ball = { x: W / 2, y: H - 40, dx: 3, dy: -3, r: 7 };
      bricks = []; for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) bricks.push({ c: c, r: r, on: true });
      score = 0; lives = 3; over = false; win = false; msg.textContent = "Lives: 3"; msg.className = "g-msg";
      document.getElementById("bo-score").textContent = 0;
    }
    function step() {
      if (over || win) return;
      if (left) paddle.x -= 6; if (right) paddle.x += 6;
      paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));
      ball.x += ball.dx; ball.y += ball.dy;
      if (ball.x < ball.r || ball.x > W - ball.r) ball.dx *= -1;
      if (ball.y < ball.r) ball.dy *= -1;
      if (ball.y > H - 24 && ball.y < H - 12 && ball.x > paddle.x && ball.x < paddle.x + paddle.w && ball.dy > 0) {
        ball.dy *= -1; ball.dx += ((ball.x - (paddle.x + paddle.w / 2)) / paddle.w) * 3;
      }
      if (ball.y > H) { lives--; if (lives <= 0) { over = true; msg.textContent = "Game over. Score " + score + "."; msg.className = "g-msg err"; } else { msg.textContent = "Lives: " + lives; ball = { x: W / 2, y: H - 40, dx: 3, dy: -3, r: 7 }; } }
      bricks.forEach(function (b) {
        if (!b.on) return;
        var bx = b.c * bw, by = 30 + b.r * bh;
        if (ball.x > bx && ball.x < bx + bw && ball.y > by && ball.y < by + bh - 2) {
          b.on = false; ball.dy *= -1; score += 10; document.getElementById("bo-score").textContent = score;
          if (bricks.every(function (x) { return !x.on; })) { win = true; msg.textContent = "You cleared the board! 🎉"; msg.className = "g-msg ok"; }
        }
      });
    }
    function paint() {
      ctx.fillStyle = "#eef3f8"; ctx.fillRect(0, 0, W, H);
      bricks.forEach(function (b) { if (!b.on) return; ctx.fillStyle = b.r % 2 ? gold : navy; roundRect(ctx, b.c * bw + 2, 30 + b.r * bh + 2, bw - 4, bh - 4, 4); ctx.fill(); });
      ctx.fillStyle = navy; roundRect(ctx, paddle.x, H - 24, paddle.w, paddle.h, 6); ctx.fill();
      ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, 7); ctx.fill();
    }
    function loop() { step(); paint(); raf = requestAnimationFrame(loop); }
    function onMove(e) { var rect = cv.getBoundingClientRect(); var cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left; paddle.x = (cx * (W / rect.width)) - paddle.w / 2; }
    function onKey(e) { var k = e.key.toLowerCase(); if (k === "arrowleft" || k === "a") left = e.type === "keydown"; if (k === "arrowright" || k === "d") right = e.type === "keydown"; }
    cv.addEventListener("mousemove", onMove);
    cv.addEventListener("touchmove", function (e) { onMove(e); e.preventDefault(); }, { passive: false });
    document.addEventListener("keydown", onKey); document.addEventListener("keyup", onKey);
    document.getElementById("bo-new").addEventListener("click", reset);
    reset(); raf = requestAnimationFrame(loop);
    return function () { cancelAnimationFrame(raf); document.removeEventListener("keydown", onKey); document.removeEventListener("keyup", onKey); };
  }

  /* ================= Jump Hero (endless runner) ================= */
  function mountJumpHero(root) {
    var W = 460, H = 240, raf;
    var hero, obstacles, score, best = +(localStorage.getItem("rre_jump_best") || 0), speed, over, spawn, started;
    root.appendChild(canvasHead("jh", "jh-score", "Score", "jh-best", 0));
    document.getElementById("jh-best").textContent = best;
    var msg = el("div", "g-msg", "Press Space / tap to jump"); root.appendChild(msg);
    var cv = el("canvas", "g-canvas"); cv.width = W; cv.height = H; root.appendChild(cv);
    root.appendChild(el("p", "g-hint", "Space, ↑, or tap to jump the obstacles. It gets faster."));
    var ctx = cv.getContext("2d");
    var navy = cssv("--brand", "#23395d"), gold = cssv("--gold", "#b07a35");
    var GROUND = H - 34;

    function reset() {
      hero = { x: 60, y: GROUND, vy: 0, s: 26, onGround: true };
      obstacles = []; score = 0; speed = 4; over = false; spawn = 0; started = false;
      msg.textContent = "Press Space / tap to jump"; msg.className = "g-msg";
    }
    function jump() { if (over) { reset(); return; } started = true; if (hero.onGround) { hero.vy = -11; hero.onGround = false; } }
    function step() {
      if (!started || over) return;
      hero.vy += 0.6; hero.y += hero.vy;
      if (hero.y >= GROUND) { hero.y = GROUND; hero.vy = 0; hero.onGround = true; }
      spawn--; if (spawn <= 0) { obstacles.push({ x: W + 10, w: 16 + (Math.random() * 16 | 0), h: 22 + (Math.random() * 26 | 0) }); spawn = 60 + (Math.random() * 50 | 0); }
      for (var i = obstacles.length - 1; i >= 0; i--) {
        var o = obstacles[i]; o.x -= speed;
        if (o.x + o.w < 0) { obstacles.splice(i, 1); score++; document.getElementById("jh-score").textContent = score; speed += 0.06; continue; }
        if (60 + hero.s > o.x && 60 < o.x + o.w && hero.y > GROUND - o.h - 8) {
          over = true; msg.textContent = "Crashed! Score " + score + ". Tap to retry."; msg.className = "g-msg err";
          if (score > best) { best = score; localStorage.setItem("rre_jump_best", best); document.getElementById("jh-best").textContent = best; }
        }
      }
    }
    function paint() {
      ctx.fillStyle = "#eef3f8"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#cdd6e4"; ctx.beginPath(); ctx.moveTo(0, GROUND + hero.s / 2 + 2); ctx.lineTo(W, GROUND + hero.s / 2 + 2); ctx.stroke();
      ctx.fillStyle = gold; obstacles.forEach(function (o) { roundRect(ctx, o.x, GROUND + hero.s / 2 + 2 - o.h, o.w, o.h, 3); ctx.fill(); });
      ctx.fillStyle = navy; roundRect(ctx, 60, hero.y - hero.s / 2, hero.s, hero.s, 6); ctx.fill();
    }
    function loop() { step(); paint(); raf = requestAnimationFrame(loop); }
    function onKey(e) { if (e.key === " " || e.key === "ArrowUp" || e.key === "w") { e.preventDefault(); jump(); } }
    function onTap(e) { e.preventDefault(); jump(); }
    document.addEventListener("keydown", onKey);
    cv.addEventListener("pointerdown", onTap);
    document.getElementById("jh-new").addEventListener("click", reset);
    reset(); raf = requestAnimationFrame(loop);
    return function () { cancelAnimationFrame(raf); document.removeEventListener("keydown", onKey); };
  }

  /* ================= Sky Hop (flap through gaps) ================= */
  function mountTapJump(root) {
    var W = 360, H = 380, raf;
    var bird, pipes, score, best = +(localStorage.getItem("rre_sky_best") || 0), over, started, spawn;
    root.appendChild(canvasHead("sh", "sh-score", "Score", "sh-best", 0));
    document.getElementById("sh-best").textContent = best;
    var msg = el("div", "g-msg", "Tap / Space to flap"); root.appendChild(msg);
    var cv = el("canvas", "g-canvas"); cv.width = W; cv.height = H; root.appendChild(cv);
    root.appendChild(el("p", "g-hint", "Tap, click or press Space to flap through the gaps."));
    var ctx = cv.getContext("2d");
    var navy = cssv("--brand", "#23395d"), gold = cssv("--gold", "#b07a35");
    var GAP = 116, PW = 52;

    function reset() { bird = { y: H / 2, vy: 0, r: 12 }; pipes = []; score = 0; over = false; started = false; spawn = 0; msg.textContent = "Tap / Space to flap"; msg.className = "g-msg"; }
    function flap() { if (over) { reset(); return; } started = true; bird.vy = -6; }
    function step() {
      if (!started || over) return;
      bird.vy += 0.4; bird.y += bird.vy;
      spawn--; if (spawn <= 0) { var gy = 50 + Math.random() * (H - 100 - GAP); pipes.push({ x: W, gy: gy, passed: false }); spawn = 92; }
      for (var i = pipes.length - 1; i >= 0; i--) {
        var p = pipes[i]; p.x -= 2.4;
        if (!p.passed && p.x + PW < 60) { p.passed = true; score++; document.getElementById("sh-score").textContent = score; }
        if (p.x + PW < -4) pipes.splice(i, 1);
        if (60 + bird.r > p.x && 60 - bird.r < p.x + PW && (bird.y - bird.r < p.gy || bird.y + bird.r > p.gy + GAP)) end();
      }
      if (bird.y + bird.r > H || bird.y - bird.r < 0) end();
    }
    function end() { over = true; msg.textContent = "Down! Score " + score + ". Tap to retry."; msg.className = "g-msg err"; if (score > best) { best = score; localStorage.setItem("rre_sky_best", best); document.getElementById("sh-best").textContent = best; } }
    function paint() {
      ctx.fillStyle = "#e7f0f8"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = navy; pipes.forEach(function (p) { roundRect(ctx, p.x, 0, PW, p.gy, 5); ctx.fill(); roundRect(ctx, p.x, p.gy + GAP, PW, H - p.gy - GAP, 5); ctx.fill(); });
      ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(60, bird.y, bird.r, 0, 7); ctx.fill();
    }
    function loop() { step(); paint(); raf = requestAnimationFrame(loop); }
    function onKey(e) { if (e.key === " " || e.key === "ArrowUp") { e.preventDefault(); flap(); } }
    function onTap(e) { e.preventDefault(); flap(); }
    document.addEventListener("keydown", onKey);
    cv.addEventListener("pointerdown", onTap);
    document.getElementById("sh-new").addEventListener("click", reset);
    reset(); raf = requestAnimationFrame(loop);
    return function () { cancelAnimationFrame(raf); document.removeEventListener("keydown", onKey); };
  }

  /* ================= Simon (repeat the sequence) ================= */
  function mountSimon(root) {
    var COLORS = ["g", "r", "y", "b"], seq, step, score, best = +(localStorage.getItem("rre_simon_best") || 0), locked, timers = [];
    root.appendChild(el("div", "g-head",
      '<div class="g-scores"><div class="g-score"><span>Round</span><b id="si-score">0</b></div>' +
      '<div class="g-score"><span>Best</span><b id="si-best">' + best + '</b></div></div>' +
      '<button class="btn btn--primary" id="si-new" type="button">Start</button>'));
    var msg = el("div", "g-msg", "Press Start, then repeat the pattern."); root.appendChild(msg);
    var pad = el("div", "simon-pad");
    COLORS.forEach(function (c) { var b = el("button", "simon-btn s-" + c); b.type = "button"; b.setAttribute("data-c", c); pad.appendChild(b); });
    root.appendChild(pad);
    root.appendChild(el("p", "g-hint", "Watch the flashing pattern, then tap it back. It grows each round."));

    function flash(c, ms) { var b = pad.querySelector(".s-" + c); b.classList.add("lit"); timers.push(setTimeout(function () { b.classList.remove("lit"); }, ms || 320)); }
    function playSeq() {
      locked = true; msg.textContent = "Watch…"; msg.className = "g-msg";
      seq.forEach(function (c, i) { timers.push(setTimeout(function () { flash(c); }, 600 * (i + 1))); });
      timers.push(setTimeout(function () { locked = false; step = 0; msg.textContent = "Your turn."; }, 600 * (seq.length + 1)));
    }
    function next() { seq.push(COLORS[(Math.random() * 4) | 0]); score = seq.length - 1; document.getElementById("si-score").textContent = score; playSeq(); }
    function start() { timers.forEach(clearTimeout); timers = []; seq = []; score = 0; next(); }
    function click(e) {
      var b = e.target.closest(".simon-btn"); if (!b || locked || !seq || !seq.length) return;
      var c = b.getAttribute("data-c"); flash(c, 180);
      if (c === seq[step]) {
        step++;
        if (step === seq.length) { if (score > best) { best = score; localStorage.setItem("rre_simon_best", best); document.getElementById("si-best").textContent = best; } locked = true; timers.push(setTimeout(next, 700)); }
      } else { msg.textContent = "Wrong! You reached round " + score + ". Press Start."; msg.className = "g-msg err"; seq = []; locked = true; }
    }
    pad.addEventListener("click", click);
    document.getElementById("si-new").addEventListener("click", start);
    return function () { timers.forEach(clearTimeout); };
  }

  /* ================= Whack-a-Mole ================= */
  function mountWhack(root) {
    var score, timeLeft, moleAt, gameTimer, moleTimer, running;
    root.appendChild(el("div", "g-head",
      '<div class="g-scores"><div class="g-score"><span>Score</span><b id="wm-score">0</b></div>' +
      '<div class="g-score"><span>Time</span><b id="wm-time">30</b></div></div>' +
      '<button class="btn btn--primary" id="wm-new" type="button">Start</button>'));
    var msg = el("div", "g-msg", "Press Start. Whack the moles before they duck!"); root.appendChild(msg);
    var grid = el("div", "whack-grid");
    var holes = [];
    for (var i = 0; i < 9; i++) { var h = el("button", "whack-hole", '<span class="mole">🐹</span>'); h.type = "button"; h.setAttribute("data-i", i); grid.appendChild(h); holes.push(h); }
    root.appendChild(grid);
    root.appendChild(el("p", "g-hint", "Thirty seconds. Every mole you tap is a point."));

    function pop() {
      holes.forEach(function (h) { h.classList.remove("up"); });
      moleAt = (Math.random() * 9) | 0; holes[moleAt].classList.add("up");
    }
    function stop() { running = false; clearInterval(gameTimer); clearInterval(moleTimer); holes.forEach(function (h) { h.classList.remove("up"); }); }
    function start() {
      stop(); running = true; score = 0; timeLeft = 30;
      document.getElementById("wm-score").textContent = 0; document.getElementById("wm-time").textContent = 30;
      msg.textContent = "Go!"; msg.className = "g-msg"; pop();
      moleTimer = setInterval(pop, 800);
      gameTimer = setInterval(function () { timeLeft--; document.getElementById("wm-time").textContent = timeLeft; if (timeLeft <= 0) { stop(); msg.textContent = "Time! You scored " + score + "."; msg.className = "g-msg ok"; } }, 1000);
    }
    function hit(e) {
      var h = e.target.closest(".whack-hole"); if (!h || !running) return;
      if (h.classList.contains("up")) { score++; document.getElementById("wm-score").textContent = score; h.classList.remove("up"); }
    }
    grid.addEventListener("click", hit);
    document.getElementById("wm-new").addEventListener("click", start);
    return function () { stop(); };
  }

  /* ================= Minesweeper ================= */
  function mountMines(root) {
    var N = 9, MINES = 10, grid, revealed, flags, over, left;
    root.appendChild(el("div", "g-head",
      '<div class="g-scores"><div class="g-score"><span>Mines</span><b id="ms-mines">' + MINES + '</b></div>' +
      '<div class="g-score"><span>Flags</span><b id="ms-flags">0</b></div></div>' +
      '<button class="btn btn--primary" id="ms-new" type="button">New game</button>'));
    var msg = el("div", "g-msg", "Tap to reveal. Long-press (or right-click) to flag."); root.appendChild(msg);
    var board = el("div", "mines-grid"); root.appendChild(board);
    root.appendChild(el("p", "g-hint", "Clear every safe cell without hitting a mine. Numbers show nearby mines."));
    var cells = [];

    function idx(r, c) { return r * N + c; }
    function neighbours(r, c) { var a = []; for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; var nr = r + dr, nc = c + dc; if (nr >= 0 && nr < N && nc >= 0 && nc < N) a.push([nr, nc]); } return a; }
    function build() {
      grid = []; revealed = []; flags = []; over = false; left = N * N - MINES;
      for (var i = 0; i < N * N; i++) { grid.push(0); revealed.push(false); flags.push(false); }
      var placed = 0; while (placed < MINES) { var p = (Math.random() * N * N) | 0; if (grid[p] !== "M") { grid[p] = "M"; placed++; } }
      for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) { if (grid[idx(r, c)] === "M") continue; var n = 0; neighbours(r, c).forEach(function (x) { if (grid[idx(x[0], x[1])] === "M") n++; }); grid[idx(r, c)] = n; }
      document.getElementById("ms-flags").textContent = 0; msg.textContent = "Tap to reveal. Long-press to flag."; msg.className = "g-msg";
      draw();
    }
    function draw() {
      board.innerHTML = ""; cells = [];
      for (var i = 0; i < N * N; i++) {
        var b = el("button", "mine-cell", ""); b.type = "button"; b.setAttribute("data-i", i);
        if (revealed[i]) { b.classList.add("open"); var v = grid[i]; if (v === "M") { b.classList.add("mine"); b.textContent = "💣"; } else if (v > 0) { b.textContent = v; b.setAttribute("data-n", v); } }
        else if (flags[i]) b.textContent = "🚩";
        board.appendChild(b); cells.push(b);
      }
    }
    function flood(r, c) {
      var i = idx(r, c); if (revealed[i] || flags[i]) return; revealed[i] = true; left--;
      if (grid[i] === 0) neighbours(r, c).forEach(function (x) { flood(x[0], x[1]); });
    }
    function reveal(i) {
      if (over || revealed[i] || flags[i]) return;
      if (grid[i] === "M") { revealed[i] = true; over = true; for (var k = 0; k < N * N; k++) if (grid[k] === "M") revealed[k] = true; msg.textContent = "Boom! Mine hit. New game?"; msg.className = "g-msg err"; draw(); return; }
      flood((i / N) | 0, i % N);
      if (left <= 0) { over = true; msg.textContent = "Cleared! Every safe cell found. 🎉"; msg.className = "g-msg ok"; }
      draw();
    }
    function toggleFlag(i) {
      if (over || revealed[i]) return; flags[i] = !flags[i];
      var f = flags.filter(Boolean).length; document.getElementById("ms-flags").textContent = f; draw();
    }
    var pressTimer, longPressed;
    board.addEventListener("contextmenu", function (e) { e.preventDefault(); var b = e.target.closest(".mine-cell"); if (b) toggleFlag(+b.getAttribute("data-i")); });
    board.addEventListener("pointerdown", function (e) { var b = e.target.closest(".mine-cell"); if (!b) return; longPressed = false; pressTimer = setTimeout(function () { longPressed = true; toggleFlag(+b.getAttribute("data-i")); }, 400); });
    board.addEventListener("pointerup", function (e) { clearTimeout(pressTimer); var b = e.target.closest(".mine-cell"); if (!b || longPressed) return; reveal(+b.getAttribute("data-i")); });
    board.addEventListener("pointerleave", function () { clearTimeout(pressTimer); });
    document.getElementById("ms-new").addEventListener("click", build);
    build();
    return function () { clearTimeout(pressTimer); };
  }

  /* rounded-rect helper for canvas games */
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2); ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
})();
