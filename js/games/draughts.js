/*
  File: js/games/draughts.js
  Purpose: International draughts (10x10) with a JavaScript opponent.
  Engine: Vanilla JS (ES5 syntax, no build step).
  Platform: Cloudflare Pages under strict CSP (script-src 'self').
  Constraints: uses the shared searcher in js/games/search.js.
  Dependencies: js/games/core.js, js/games/search.js.

  Rules implemented (international / World Draughts Federation, NOT American
  checkers — the two differ on every point below):
    - 10x10 board, 20 pieces a side, play on the dark squares.
    - Men move diagonally forward one square, but CAPTURE IN ALL FOUR
      DIRECTIONS, backwards included.
    - Flying kings: a king slides any distance along a diagonal, and captures by
      jumping an enemy at any distance then landing on any empty square beyond.
    - Capturing is compulsory, and the MAXIMUM capture is compulsory: of all
      available sequences you must play one that takes the most pieces. Where
      several sequences take the same number, the choice is free (the old
      "quality" tie-break was abolished and is deliberately not implemented).
    - Captured pieces are removed only when the whole sequence finishes, and a
      piece may not be jumped twice in one sequence (the Turkish strike rule).
    - A man that merely passes over the promotion row mid-capture does NOT
      promote; it promotes only if the sequence ENDS there.

  Expected behaviour: registers an "Draughts" tab. Click a piece, then click each
    landing square in turn. Multi-jumps are entered step by step, which is also
    how two different sequences with the same destination are disambiguated.

  Known failure modes:
    - PLAYING STRENGTH IS LOW. 10x10 draughts has a large search space and this
      is plain interpreted JS with no endgame database and no transposition
      table. Expect roughly 5-7 ply. It will lose to any serious player.
    - js/games/search.js reorders the previous iteration's best move using
      indexOf. Draughts moves are freshly-allocated objects each call, so that
      lookup always misses and the principal-variation ordering is lost here.
      Connect Four uses integer moves and does benefit from it. Cost is depth,
      not correctness.
    - No formal draw adjudication (the 25-move king-only rule and the 3v1
      endgame rules are not implemented). A dead-drawn endgame will shuffle
      until a player starts a new game. The move counter is displayed so the
      position being drawn is at least visible.
*/
(function () {
  var G = window.RREGames;
  var S = window.RRESearch;
  if (!G || !S) return;

  var N = 10;
  var MATE = S.MATE;
  var MAN = 1, KING = 2;
  var WHITE = 1, BLACK = -1;
  var DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

  function idx(r, c) { return r * N + c; }
  function onBoard(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }
  function isPlay(r, c) { return ((r + c) & 1) === 1; }

  function Game() {
    this.b = new Int8Array(N * N);
    this.side = WHITE;
    this.ply = 0;
    this.reset();
  }

  Game.prototype.reset = function () {
    var b = this.b;
    b.fill(0);
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      if (!isPlay(r, c)) continue;
      if (r < 4) b[idx(r, c)] = -MAN;      /* black occupies the top four rows */
      else if (r > 5) b[idx(r, c)] = MAN;  /* white the bottom four */
    }
    this.side = WHITE;
    this.ply = 0;
  };

  function sign(v) { return v > 0 ? 1 : v < 0 ? -1 : 0; }
  function abs(v) { return v < 0 ? -v : v; }

  /* Promotion row: white promotes on row 0, black on row 9. */
  function promoRow(side) { return side === WHITE ? 0 : N - 1; }

  /* ---- Capture generation ----
     Depth-first over jump sequences. The moving piece is lifted off its origin
     for the duration (so it may land back on it), captured pieces stay on the
     board as blockers but are flagged so they cannot be taken twice. */
  Game.prototype.capturesFrom = function (start, piece, out) {
    var b = this.b;
    var side = sign(piece);
    var king = abs(piece) === KING;
    var self = this;
    var caps = [], path = [];
    var lifted = b[start];
    b[start] = 0;

    step(start);
    b[start] = lifted;

    function step(sq) {
      var r = (sq / N) | 0, c = sq % N;
      var extended = false;

      for (var d = 0; d < 4; d++) {
        var dr = DIRS[d][0], dc = DIRS[d][1];

        if (!king) {
          /* Men jump exactly one square, in any of the four directions. */
          var er = r + dr, ec = c + dc, lr = r + 2 * dr, lc = c + 2 * dc;
          if (!onBoard(lr, lc)) continue;
          var e = idx(er, ec), l = idx(lr, lc);
          if (b[e] === 0 || sign(b[e]) === side) continue;
          if (caps.indexOf(e) >= 0) continue;   /* already taken this sequence */
          if (b[l] !== 0) continue;             /* landing must be empty */
          caps.push(e); path.push(l);
          extended = true;
          step(l);
          caps.pop(); path.pop();
        } else {
          /* Flying king: scan for the first piece along the diagonal. */
          var k = 1, er2 = -1, ec2 = -1, found = -1;
          while (true) {
            var rr = r + dr * k, cc = c + dc * k;
            if (!onBoard(rr, cc)) break;
            var s = idx(rr, cc);
            if (b[s] === 0) { k++; continue; }
            if (sign(b[s]) === side || caps.indexOf(s) >= 0) break; /* blocked */
            found = s; er2 = rr; ec2 = cc;
            break;
          }
          if (found < 0) continue;
          /* Land on any empty square beyond the victim, stopping at the first
             occupied square (a captured piece still counts as occupied). */
          var m = 1;
          while (true) {
            var lr2 = er2 + dr * m, lc2 = ec2 + dc * m;
            if (!onBoard(lr2, lc2)) break;
            var l2 = idx(lr2, lc2);
            if (b[l2] !== 0) break;
            caps.push(found); path.push(l2);
            extended = true;
            step(l2);
            caps.pop(); path.pop();
            m++;
          }
        }
      }

      /* A sequence ends where no further jump exists. Record it there. */
      if (!extended && caps.length) {
        var end = path[path.length - 1];
        var endRow = (end / N) | 0;
        var promote = !king && endRow === promoRow(side);
        var capVals = caps.map(function (s) { return self.b[s]; });
        out.push({
          from: start, to: end,
          caps: caps.slice(), capVals: capVals,
          path: path.slice(), promote: promote
        });
      }
    }
  };

  Game.prototype.moves = function () {
    var b = this.b, side = this.side, all = [], sq, r, c;

    for (sq = 0; sq < N * N; sq++) {
      if (b[sq] === 0 || sign(b[sq]) !== side) continue;
      this.capturesFrom(sq, b[sq], all);
    }

    if (all.length) {
      /* Maximum capture is compulsory. */
      var max = 0;
      for (var i = 0; i < all.length; i++) if (all[i].caps.length > max) max = all[i].caps.length;
      return all.filter(function (m) { return m.caps.length === max; });
    }

    /* No captures available, so quiet moves. */
    var out = [];
    for (sq = 0; sq < N * N; sq++) {
      var p = b[sq];
      if (p === 0 || sign(p) !== side) continue;
      r = (sq / N) | 0; c = sq % N;
      var king = abs(p) === KING;

      for (var d = 0; d < 4; d++) {
        var dr = DIRS[d][0], dc = DIRS[d][1];
        /* Men move forward only. White is at the bottom and moves up (dr -1). */
        if (!king && dr !== -side) continue;

        var k = 1;
        while (true) {
          var rr = r + dr * k, cc = c + dc * k;
          if (!onBoard(rr, cc)) break;
          var t = idx(rr, cc);
          if (b[t] !== 0) break;
          out.push({
            from: sq, to: t, caps: [], capVals: [], path: [t],
            promote: !king && rr === promoRow(side)
          });
          if (!king) break;   /* men move exactly one square */
          k++;
        }
      }
    }
    return out;
  };

  Game.prototype.make = function (m) {
    var b = this.b;
    var piece = b[m.from];
    var side = sign(piece);
    b[m.from] = 0;
    for (var i = 0; i < m.caps.length; i++) b[m.caps[i]] = 0;
    b[m.to] = m.promote ? KING * side : piece;
    this.side = -this.side;
    this.ply++;
  };

  Game.prototype.unmake = function (m) {
    var b = this.b;
    var piece = b[m.to];
    var side = sign(piece);
    b[m.to] = 0;
    b[m.from] = m.promote ? MAN * side : piece;
    for (var i = 0; i < m.caps.length; i++) b[m.caps[i]] = m.capVals[i];
    this.side = -this.side;
    this.ply--;
  };

  Game.prototype.terminal = function () {
    /* A player with no legal move loses, whether blocked or wiped out. */
    if (this.moves().length === 0) return -(MATE - this.ply);
    return null;
  };

  Game.prototype.evaluate = function () {
    var b = this.b, me = this.side, score = 0;
    for (var sq = 0; sq < N * N; sq++) {
      var p = b[sq];
      if (!p) continue;
      var s = sign(p), r = (sq / N) | 0, c = sq % N;
      var v;
      if (abs(p) === KING) {
        v = 340;
        /* Kings are worth more with room to fly, so nudge them off the rim. */
        var centre = Math.min(c, N - 1 - c) + Math.min(r, N - 1 - r);
        v += centre * 2;
      } else {
        v = 100;
        /* Advancement toward promotion, and a small bonus for holding the
           back row, which stops the opponent crowning. */
        var adv = s === WHITE ? (N - 1 - r) : r;
        v += adv * 4;
        if ((s === WHITE && r === N - 1) || (s === BLACK && r === 0)) v += 8;
        v += (4 - Math.abs(c - 4.5) | 0);
      }
      score += s === me ? v : -v;
    }
    return score;
  };

  var LEVELS = {
    easy: { depth: 3, ms: 250 },
    medium: { depth: 5, ms: 700 },
    hard: { depth: 7, ms: 1500 }
  };

  function mountDraughts(root) {
    var g = new Game();
    var mode = "medium", humanSide = WHITE, over = false, thinking = false, timer = null;
    var sel = -1, candidates = [], progress = [];
    var history = [], lastMove = null;

    var head = G.head([
      { key: "w", label: "White", value: 20 },
      { key: "b", label: "Black", value: 20 },
      { key: "mv", label: "Move", value: 1 }
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

    var boardEl = G.el("div", "dr-board");
    var cells = [];
    for (var i = 0; i < N * N; i++) {
      var c = G.el("button", "dr-sq");
      c.type = "button";
      cells.push(c);
      boardEl.appendChild(c);
      bind(c, i);
    }
    root.appendChild(boardEl);

    var bar = G.el("div", "g-actions");
    var bNew = G.btn("New game");
    var bUndo = G.btn("Undo");
    var bSide = G.btn("Play as Black");
    bar.appendChild(bNew); bar.appendChild(bUndo); bar.appendChild(bSide);
    root.appendChild(bar);
    root.appendChild(G.el("p", "g-hint",
      "Capturing is compulsory and you must take the maximum. Multi-jumps: click each landing square in turn."));

    function bind(cell, sq) {
      cell.addEventListener("click", function () {
        if (over || thinking) return;
        if (mode !== "human" && g.side !== humanSide) return;
        onSquare(sq);
      });
    }

    function legalForPiece(sq) {
      return g.moves().filter(function (m) { return m.from === sq; });
    }

    function onSquare(sq) {
      /* Mid-sequence: the click must be the next landing square. */
      if (sel >= 0 && candidates.length) {
        var next = candidates.filter(function (m) { return m.path[progress.length] === sq; });
        if (next.length) {
          progress.push(sq);
          candidates = next;
          /* Every surviving candidate has the same length under the maximum
             capture rule, so "complete" is unambiguous. */
          if (progress.length === candidates[0].path.length) {
            var mv = candidates[0];
            sel = -1; candidates = []; progress = [];
            apply(mv);
            return;
          }
          draw();
          return;
        }
      }
      var p = g.b[sq];
      if (p && sign(p) === g.side) {
        var opts = legalForPiece(sq);
        if (opts.length) {
          sel = sq; candidates = opts; progress = [];
          draw();
          return;
        }
        msg.textContent = "That piece has no legal move. Captures are compulsory.";
        msg.className = "g-msg err";
        return;
      }
      sel = -1; candidates = []; progress = [];
      draw();
    }

    function apply(m) {
      g.make(m);
      history.push(m);
      lastMove = m;
      draw();
      if (status()) return;
      if (mode !== "human" && g.side !== humanSide) engineMove();
    }

    function engineMove() {
      thinking = true;
      msg.textContent = "Thinking…";
      msg.className = "g-msg";
      timer = setTimeout(function () {
        timer = null;
        var lvl = LEVELS[mode] || LEVELS.medium;
        var res = S.bestMove(g, lvl.depth, lvl.ms);
        thinking = false;
        if (!res.move) { status(); return; }
        g.make(res.move);
        history.push(res.move);
        lastMove = res.move;
        draw();
        status();
      }, 30);
    }

    bNew.addEventListener("click", newGame);
    bSide.addEventListener("click", function () {
      humanSide = -humanSide;
      bSide.textContent = humanSide === WHITE ? "Play as Black" : "Play as White";
      newGame();
    });
    bUndo.addEventListener("click", function () {
      if (thinking || !history.length) return;
      var n = (mode === "human" || history.length === 1) ? 1 : 2;
      while (n-- > 0 && history.length) g.unmake(history.pop());
      lastMove = history.length ? history[history.length - 1] : null;
      over = false; sel = -1; candidates = []; progress = [];
      draw(); status();
    });

    function counts() {
      var w = 0, b = 0;
      for (var i = 0; i < N * N; i++) {
        if (g.b[i] > 0) w++; else if (g.b[i] < 0) b++;
      }
      return { w: w, b: b };
    }

    function draw() {
      var nextTargets = {};
      if (sel >= 0 && candidates.length) {
        candidates.forEach(function (m) {
          var s = m.path[progress.length];
          if (s !== undefined) nextTargets[s] = 1;
        });
      }
      var inFlight = progress.length ? progress[progress.length - 1] : sel;

      for (var i = 0; i < N * N; i++) {
        var r = (i / N) | 0, c = i % N;
        var play = isPlay(r, c);
        var cls = "dr-sq " + (play ? "dark" : "light");
        var p = g.b[i];

        if (play) {
          if (i === inFlight) cls += " sel";
          if (nextTargets[i]) cls += " tgt";
          if (lastMove && (i === lastMove.from || i === lastMove.to)) cls += " last";
          /* Show pieces already jumped in the sequence being entered. */
          if (progress.length && candidates.length) {
            var taken = candidates[0].caps.slice(0, progress.length);
            if (taken.indexOf(i) >= 0) cls += " taken";
          }
        }
        cells[i].className = cls;

        var showPiece = p;
        /* While a multi-jump is being entered, draw the piece at its current
           landing square rather than at its origin. */
        if (progress.length && i === sel) showPiece = 0;
        if (progress.length && i === inFlight) showPiece = g.b[sel];

        if (showPiece) {
          var isK = abs(showPiece) === KING;
          cells[i].innerHTML = '<span class="dr-pc ' + (showPiece > 0 ? "w" : "b") + (isK ? " k" : "") + '">' +
            (isK ? "♛" : "") + "</span>";
        } else {
          cells[i].innerHTML = "";
        }
      }

      var ct = counts();
      head.set("w", ct.w);
      head.set("b", ct.b);
      head.set("mv", Math.floor(history.length / 2) + 1);
    }

    function status() {
      var legal = g.moves();
      if (!legal.length) {
        over = true;
        var loser = g.side;
        var human = (mode === "human") ? null : (loser !== humanSide);
        if (human === true) msg.textContent = "You win. " + (loser === WHITE ? "White" : "Black") + " has no move.";
        else if (human === false) msg.textContent = "You lose. No legal move left.";
        else msg.textContent = (loser === WHITE ? "Black" : "White") + " wins.";
        msg.className = human === false ? "g-msg err" : "g-msg ok";
        return true;
      }
      var mustCapture = legal[0].caps.length > 0;
      msg.textContent = (g.side === WHITE ? "White" : "Black") + " to move" +
        (mustCapture ? " — capture is compulsory (" + legal[0].caps.length + ")." : ".");
      msg.className = "g-msg";
      return false;
    }

    function newGame() {
      if (timer) { clearTimeout(timer); timer = null; }
      g.reset();
      history = []; lastMove = null; over = false; thinking = false;
      sel = -1; candidates = []; progress = [];
      draw(); status();
      if (mode !== "human" && g.side !== humanSide) engineMove();
    }

    newGame();
    return function () { if (timer) clearTimeout(timer); };
  }

  G.add({ id: "draughts", name: "Draughts", icon: "⚪", mount: mountDraughts });

  /* Test hook for tools/draughts-test.js (dev only, not deployed). */
  window.RREDraughts = { Game: Game };
})();
