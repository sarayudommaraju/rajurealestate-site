/*
  File: js/games/connect4.js
  Purpose: Connect Four, 7 columns by 6 rows, versus the engine or hotseat.
  Engine: Vanilla JS (ES5 syntax, no build step).
  Platform: Cloudflare Pages under strict CSP (script-src 'self').
  Constraints: uses the shared searcher in js/games/search.js. Moves are plain
           column integers, so the searcher's principal-variation reordering
           (indexOf on the previous best move) works here, unlike in draughts
           where moves are objects.
  Dependencies: js/games/core.js, js/games/search.js.
  Expected behaviour: registers a "Connect Four" tab. Click a column to drop.
           Easy / Medium / Hard / 2 Player.
  Known failure modes:
    - Connect Four is a solved game (first player wins with perfect play from
      the centre). This engine is nowhere near perfect, so it can be beaten,
      which is the point.
    - No transposition table, so the same position reached by different move
      orders is searched repeatedly. That roughly halves the effective depth
      compared with a table-backed searcher of the same node count.
*/
(function () {
  var G = window.RREGames;
  var S = window.RRESearch;
  if (!G || !S) return;

  var COLS = 7, ROWS = 6;
  var MATE = S.MATE;
  /* Centre-out column order. In Connect Four the centre column is in more
     winning lines than any other, so searching it first produces the earliest
     alpha-beta cutoffs. This ordering alone is worth about a ply. */
  var ORDER = [3, 2, 4, 1, 5, 0, 6];

  /* Every 4-in-a-row window on the board, precomputed once. Evaluation and win
     detection both walk this list instead of re-deriving directions. */
  var LINES = (function () {
    var out = [], r, c, i, k;
    for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) {
      var dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
      for (k = 0; k < 4; k++) {
        var dr = dirs[k][0], dc = dirs[k][1], line = [], okLine = true;
        for (i = 0; i < 4; i++) {
          var rr = r + dr * i, cc = c + dc * i;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) { okLine = false; break; }
          line.push(rr * COLS + cc);
        }
        if (okLine) out.push(line);
      }
    }
    return out;
  })();

  function Game() {
    this.b = new Int8Array(ROWS * COLS);  /* row 0 is the TOP row */
    this.height = new Int8Array(COLS);    /* pieces already in each column */
    this.side = 1;
    this.ply = 0;
    this.lastWin = null;
  }

  Game.prototype.reset = function () {
    this.b.fill(0);
    this.height.fill(0);
    this.side = 1;
    this.ply = 0;
    this.lastWin = null;
  };

  Game.prototype.moves = function () {
    var out = [];
    for (var i = 0; i < COLS; i++) {
      var c = ORDER[i];
      if (this.height[c] < ROWS) out.push(c);
    }
    return out;
  };

  Game.prototype.make = function (col) {
    var row = ROWS - 1 - this.height[col];
    this.b[row * COLS + col] = this.side;
    this.height[col]++;
    this.side = -this.side;
    this.ply++;
  };

  Game.prototype.unmake = function (col) {
    this.height[col]--;
    var row = ROWS - 1 - this.height[col];
    this.b[row * COLS + col] = 0;
    this.side = -this.side;
    this.ply--;
  };

  /* Returns the winning line for `who`, or null. */
  Game.prototype.winLine = function (who) {
    var b = this.b;
    for (var i = 0; i < LINES.length; i++) {
      var L = LINES[i];
      if (b[L[0]] === who && b[L[1]] === who && b[L[2]] === who && b[L[3]] === who) return L;
    }
    return null;
  };

  Game.prototype.full = function () {
    for (var c = 0; c < COLS; c++) if (this.height[c] < ROWS) return false;
    return true;
  };

  /* Searcher contract: null means the game continues; otherwise a score from
     the perspective of the side to move. Only the side that JUST moved can
     have made four, so a win here is always a loss for the side to move. */
  Game.prototype.terminal = function () {
    if (this.winLine(-this.side)) return -(MATE - this.ply);
    if (this.full()) return 0;
    return null;
  };

  Game.prototype.evaluate = function () {
    var b = this.b, me = this.side, score = 0;
    for (var i = 0; i < LINES.length; i++) {
      var L = LINES[i], mine = 0, theirs = 0;
      for (var k = 0; k < 4; k++) {
        var v = b[L[k]];
        if (v === me) mine++;
        else if (v) theirs++;
      }
      /* A window containing both colours is dead for everyone; skip it. */
      if (mine && theirs) continue;
      if (mine === 3) score += 50;
      else if (mine === 2) score += 10;
      else if (mine === 1) score += 1;
      else if (theirs === 3) score -= 55;   /* value blocking slightly above building */
      else if (theirs === 2) score -= 10;
      else if (theirs === 1) score -= 1;
    }
    return score;
  };

  var LEVELS = {
    easy: { depth: 3, ms: 200 },
    medium: { depth: 6, ms: 600 },
    hard: { depth: 9, ms: 1200 }
  };

  function mountC4(root) {
    var g = new Game();
    var mode = "medium", humanSide = 1, over = false, thinking = false, timer = null;
    var winCells = [];

    var head = G.head([
      { key: "you", label: "You", value: 0 },
      { key: "cpu", label: "Them", value: 0 }
    ]);
    root.appendChild(head.node);
    head.left.appendChild(G.seg([
      { value: "easy", label: "Easy" },
      { value: "medium", label: "Medium" },
      { value: "hard", label: "Hard" },
      { value: "human", label: "2 Player" }
    ], mode, function (v) { mode = v; newGame(); }));

    var msg = G.el("div", "g-msg");
    root.appendChild(msg);

    var boardEl = G.el("div", "c4-board");
    var cells = [];
    for (var i = 0; i < ROWS * COLS; i++) {
      var c = G.el("button", "c4-cell");
      c.type = "button";
      cells.push(c);
      boardEl.appendChild(c);
      bind(c, i % COLS);
    }
    root.appendChild(boardEl);

    var bar = G.el("div", "g-actions");
    var bNew = G.btn("New game");
    var bUndo = G.btn("Undo");
    bar.appendChild(bNew); bar.appendChild(bUndo);
    root.appendChild(bar);
    root.appendChild(G.el("p", "g-hint", "Drop four in a row: across, down or diagonally."));

    var played = [];
    var wins = { you: 0, cpu: 0 };

    function bind(cell, col) {
      cell.addEventListener("click", function () {
        if (over || thinking) return;
        if (mode !== "human" && g.side !== humanSide) return;
        if (g.height[col] >= ROWS) return;
        drop(col);
      });
    }

    function drop(col) {
      g.make(col);
      played.push(col);
      draw();
      if (status()) return;
      if (mode !== "human" && g.side !== humanSide) engineMove();
    }

    function engineMove() {
      thinking = true;
      msg.textContent = "Thinking…";
      msg.className = "g-msg";
      /* Defer so the human's disc paints before the search blocks the thread. */
      timer = setTimeout(function () {
        timer = null;
        var lvl = LEVELS[mode] || LEVELS.medium;
        var res = S.bestMove(g, lvl.depth, lvl.ms);
        thinking = false;
        if (res.move == null) { status(); return; }
        g.make(res.move);
        played.push(res.move);
        draw();
        status();
      }, 30);
    }

    bNew.addEventListener("click", newGame);
    bUndo.addEventListener("click", function () {
      if (thinking || !played.length) return;
      var n = (mode === "human" || played.length === 1) ? 1 : 2;
      while (n-- > 0 && played.length) g.unmake(played.pop());
      over = false; winCells = [];
      draw(); status();
    });

    function status() {
      var w = g.winLine(-g.side);
      if (w) {
        over = true;
        winCells = w;
        var winner = -g.side;
        var human = (mode === "human") ? null : (winner === humanSide);
        if (human === true) { wins.you++; head.set("you", wins.you); msg.textContent = "You win."; msg.className = "g-msg ok"; }
        else if (human === false) { wins.cpu++; head.set("cpu", wins.cpu); msg.textContent = "You lose."; msg.className = "g-msg err"; }
        else { msg.textContent = (winner === 1 ? "Red" : "Yellow") + " wins."; msg.className = "g-msg ok"; }
        draw();
        return true;
      }
      if (g.full()) {
        over = true;
        msg.textContent = "Board full. Draw.";
        msg.className = "g-msg";
        return true;
      }
      msg.textContent = (g.side === 1 ? "Red" : "Yellow") + " to move.";
      msg.className = "g-msg";
      return false;
    }

    function draw() {
      for (var i = 0; i < ROWS * COLS; i++) {
        var v = g.b[i];
        var cls = "c4-cell" + (v === 1 ? " red" : v === -1 ? " yel" : "");
        if (winCells.indexOf(i) >= 0) cls += " win";
        cells[i].className = cls;
      }
    }

    function newGame() {
      if (timer) { clearTimeout(timer); timer = null; }
      g.reset();
      played = []; over = false; thinking = false; winCells = [];
      draw(); status();
      if (mode !== "human" && g.side !== humanSide) engineMove();
    }

    newGame();
    return function () { if (timer) clearTimeout(timer); };
  }

  G.add({ id: "c4", name: "Connect Four", icon: "🔴", mount: mountC4 });

  /* Test hook for tools/games-test.js (dev only, not deployed). */
  window.RREConnect4 = { Game: Game, LINES: LINES };
})();
