/*
  File: js/games/chess.js
  Purpose: Full-rules chess with a pure-JavaScript opponent, for the Games tab.
  Engine: Vanilla JS (ES5 syntax, no build step). 0x88 board representation,
          Int8Array for the board, integer-packed moves, preallocated undo stack.
  Platform: Cloudflare Pages static hosting under the strict CSP in /_headers
          (script-src 'self'; no 'unsafe-inline'; no 'wasm-unsafe-eval').
  Constraints:
    - No WASM. A Stockfish build cannot instantiate under the current CSP
      without adding 'wasm-unsafe-eval', which was deliberately excluded. So the
      opponent is a hand-written negamax, not a real engine. See failure modes.
    - Does NOT use js/games/search.js. That generic searcher has no quiescence
      search, and without it a chess engine hangs pieces at the horizon on every
      move. Chess needs its own search; Connect Four and Draughts share the
      generic one.
    - Single-threaded. The engine move is deferred behind setTimeout so the
      human's own move paints before the search blocks the main thread.
  Dependencies: js/games/core.js (window.RREGames). Loads after it.

  Rules implemented: all legal moves, castling (rights, empty path, no castling
    out of / through / into check), en passant, underpromotion (Q R B N picker),
    check, checkmate, stalemate, the fifty-move rule, threefold repetition, and
    insufficient material.

  Expected behaviour: registers a "Chess" tab. Modes are Easy / Medium / Hard /
    2 Player. Human plays White by default; "Flip sides" makes the engine open.
    Click a piece to see its legal moves, click a target to play it.

  Known failure modes:
    - PLAYING STRENGTH IS MODEST. Pure interpreted JS under a ~1.4s budget
      reaches roughly 4-6 ply on desktop and less on a phone. It punishes
      blunders and simple tactics; a club-level player will beat it consistently.
      This is a browser diversion, not an analysis tool.
    - No opening book. Early moves are search-driven and can look eccentric.
    - No transposition table, so repetition-heavy endgames re-search heavily and
      the engine can shuffle in drawn-but-winnable king-and-pawn positions.
    - Threefold detection compares full position keys including castling rights
      and en-passant square, which is correct, but the key is a string built per
      played move — game-level only, never inside the search.
    - All state is in memory. A page refresh restarts the game.
*/
(function () {
  var G = window.RREGames;
  if (!G) return;

  /* ---------------- Board representation ----------------
     0x88: square = rank*16 + file. a1 = 0, h1 = 7, a8 = 112, h8 = 119.
     A square is off-board iff (sq & 0x88) !== 0, which makes every sliding
     and knight move a single mask test instead of two bounds checks. */
  var EMPTY = 0, PAWN = 1, KNIGHT = 2, BISHOP = 3, ROOK = 4, QUEEN = 5, KING = 6;
  var WHITE = 1, BLACK = -1;
  var MATE = 100000;

  var KNIGHT_D = [31, 33, 14, 18, -31, -33, -14, -18];
  var BISHOP_D = [15, 17, -15, -17];
  var ROOK_D = [16, -16, 1, -1];
  var KING_D = [15, 16, 17, 1, -15, -16, -17, -1];

  /* Castling rights bitmask */
  var WK = 1, WQ = 2, BK = 4, BQ = 8;
  /* Moving from or capturing on these squares kills the matching right. */
  var RIGHTS_MASK = {};
  RIGHTS_MASK[4] = ~(WK | WQ); RIGHTS_MASK[7] = ~WK; RIGHTS_MASK[0] = ~WQ;
  RIGHTS_MASK[116] = ~(BK | BQ); RIGHTS_MASK[119] = ~BK; RIGHTS_MASK[112] = ~BQ;

  /* Move packing: from | to<<7 | promo<<14 | flag<<17 */
  var F_NONE = 0, F_EP = 1, F_CASTLE = 2, F_DOUBLE = 3;
  function mk(from, to, promo, flag) { return from | (to << 7) | ((promo || 0) << 14) | ((flag || 0) << 17); }
  function mFrom(m) { return m & 127; }
  function mTo(m) { return (m >> 7) & 127; }
  function mPromo(m) { return (m >> 14) & 7; }
  function mFlag(m) { return (m >> 17) & 7; }

  var VALUE = [0, 100, 320, 330, 500, 900, 0];

  /* Piece-square tables, written from White's point of view with index 0 = a8
     and index 63 = h1 (i.e. reading order of a printed board). Black reads the
     same table vertically mirrored. Values are the long-standing "simplified
     evaluation" tables; they exist to give the search positional direction, not
     to be finely tuned. */
  var PST_P = [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0];
  var PST_N = [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50];
  var PST_B = [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20];
  var PST_R = [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0];
  var PST_Q = [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20];
  var PST_K_MID = [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20];
  var PST_K_END = [
    -50, -40, -30, -20, -20, -30, -40, -50,
    -30, -20, -10, 0, 0, -10, -20, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -30, 0, 0, 0, 0, -30, -30,
    -50, -30, -30, -30, -30, -30, -30, -50];
  var PST = [null, PST_P, PST_N, PST_B, PST_R, PST_Q, null];

  /* 0x88 square -> table index, for White. rank 0 (a1..h1) must map to the
     BOTTOM row of the table, which is index 56..63. */
  function idxW(sq) { return (7 - (sq >> 4)) * 8 + (sq & 7); }
  function idxB(sq) { return (sq >> 4) * 8 + (sq & 7); }

  /* ---------------- Position ---------------- */
  function Position() {
    this.board = new Int8Array(128);
    this.side = WHITE;
    this.castling = WK | WQ | BK | BQ;
    this.ep = -1;
    this.half = 0;
    this.kingSq = [0, 0]; /* [white, black] */
    /* Preallocated undo stack. Search depth + quiescence never exceeds this. */
    this.uCap = new Int8Array(256);
    this.uEp = new Int16Array(256);
    this.uCastle = new Int8Array(256);
    this.uHalf = new Int16Array(256);
    this.uPly = 0;
    this.reset();
  }

  Position.prototype.reset = function () {
    var b = this.board;
    for (var i = 0; i < 128; i++) b[i] = 0;
    var back = [ROOK, KNIGHT, BISHOP, QUEEN, KING, BISHOP, KNIGHT, ROOK];
    for (var f = 0; f < 8; f++) {
      b[f] = back[f];
      b[16 + f] = PAWN;
      b[96 + f] = -PAWN;
      b[112 + f] = -back[f];
    }
    this.side = WHITE;
    this.castling = WK | WQ | BK | BQ;
    this.ep = -1;
    this.half = 0;
    this.kingSq[0] = 4;
    this.kingSq[1] = 116;
    this.uPly = 0;
  };

  /* FEN loader. Not used by the UI, which always starts from the initial
     position, but it is what makes the move generator testable: the perft
     harness in tools/perft.js loads the standard test positions through it. */
  Position.prototype.fromFEN = function (fen) {
    var parts = fen.trim().split(/\s+/);
    var b = this.board, i;
    for (i = 0; i < 128; i++) b[i] = 0;
    var rows = parts[0].split("/");
    var MAPC = { p: PAWN, n: KNIGHT, b: BISHOP, r: ROOK, q: QUEEN, k: KING };
    for (var r = 0; r < 8; r++) {
      var f = 0, row = rows[r];
      for (i = 0; i < row.length; i++) {
        var ch = row[i];
        if (ch >= "1" && ch <= "8") { f += parseInt(ch, 10); continue; }
        var lower = ch.toLowerCase();
        var sq = (7 - r) * 16 + f;   /* FEN rank 8 is listed first */
        b[sq] = MAPC[lower] * (ch === lower ? BLACK : WHITE);
        if (lower === "k") this.kingSq[ch === lower ? 1 : 0] = sq;
        f++;
      }
    }
    this.side = parts[1] === "w" ? WHITE : BLACK;
    this.castling = 0;
    if (parts[2].indexOf("K") >= 0) this.castling |= WK;
    if (parts[2].indexOf("Q") >= 0) this.castling |= WQ;
    if (parts[2].indexOf("k") >= 0) this.castling |= BK;
    if (parts[2].indexOf("q") >= 0) this.castling |= BQ;
    this.ep = (parts[3] && parts[3] !== "-")
      ? (parts[3].charCodeAt(0) - 97) + (parseInt(parts[3][1], 10) - 1) * 16 : -1;
    this.half = parts[4] ? parseInt(parts[4], 10) : 0;
    this.uPly = 0;
    return this;
  };

  Position.prototype.clone = function () {
    var p = new Position();
    p.board.set(this.board);
    p.side = this.side;
    p.castling = this.castling;
    p.ep = this.ep;
    p.half = this.half;
    p.kingSq[0] = this.kingSq[0];
    p.kingSq[1] = this.kingSq[1];
    return p;
  };

  /* Position key for repetition detection. Includes castling rights and the
     en-passant square, because two positions differing in either are NOT the
     same position under FIDE rules. */
  Position.prototype.key = function () {
    var s = "", b = this.board;
    for (var r = 0; r < 8; r++) for (var f = 0; f < 8; f++) s += String.fromCharCode(65 + b[r * 16 + f] + 6);
    return s + "|" + this.side + "|" + this.castling + "|" + this.ep;
  };

  /* Is `sq` attacked by any piece of colour `by`? */
  Position.prototype.attacked = function (sq, by) {
    var b = this.board, i, t, d, s;

    /* Pawns. A white pawn attacking `sq` sits one rank below it, diagonally. */
    if (by === WHITE) {
      if (!((sq - 15) & 0x88) && b[sq - 15] === PAWN) return true;
      if (!((sq - 17) & 0x88) && b[sq - 17] === PAWN) return true;
    } else {
      if (!((sq + 15) & 0x88) && b[sq + 15] === -PAWN) return true;
      if (!((sq + 17) & 0x88) && b[sq + 17] === -PAWN) return true;
    }

    for (i = 0; i < 8; i++) {
      s = sq + KNIGHT_D[i];
      if (!(s & 0x88) && b[s] === KNIGHT * by) return true;
    }
    for (i = 0; i < 8; i++) {
      s = sq + KING_D[i];
      if (!(s & 0x88) && b[s] === KING * by) return true;
    }
    for (i = 0; i < 4; i++) {
      d = BISHOP_D[i]; s = sq + d;
      while (!(s & 0x88)) {
        t = b[s];
        if (t) { if (t * by > 0 && (t * by === BISHOP || t * by === QUEEN)) return true; break; }
        s += d;
      }
    }
    for (i = 0; i < 4; i++) {
      d = ROOK_D[i]; s = sq + d;
      while (!(s & 0x88)) {
        t = b[s];
        if (t) { if (t * by > 0 && (t * by === ROOK || t * by === QUEEN)) return true; break; }
        s += d;
      }
    }
    return false;
  };

  Position.prototype.inCheck = function (side) {
    return this.attacked(this.kingSq[side === WHITE ? 0 : 1], -side);
  };

  /* Pseudo-legal move generation. Legality (own king left in check) is filtered
     by legalMoves() or discovered by the search when it makes the move. */
  Position.prototype.genMoves = function (capturesOnly) {
    var b = this.board, me = this.side, out = [], i, d, s, sq, p, ap;

    for (sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      p = b[sq];
      if (!p || p * me < 0) continue;
      ap = p * me; /* absolute piece type for the side to move */

      if (ap === PAWN) {
        var fwd = me === WHITE ? 16 : -16;
        var startRank = me === WHITE ? 1 : 6;
        var promoRank = me === WHITE ? 6 : 1;
        var onPromoRank = (sq >> 4) === promoRank;

        if (!capturesOnly) {
          s = sq + fwd;
          if (!(s & 0x88) && !b[s]) {
            if (onPromoRank) pushPromos(out, sq, s);
            else {
              out.push(mk(sq, s, 0, F_NONE));
              if ((sq >> 4) === startRank && !b[s + fwd]) out.push(mk(sq, s + fwd, 0, F_DOUBLE));
            }
          }
        }
        var caps = me === WHITE ? [15, 17] : [-15, -17];
        for (i = 0; i < 2; i++) {
          s = sq + caps[i];
          if (s & 0x88) continue;
          if (b[s] && b[s] * me < 0) {
            if (onPromoRank) pushPromos(out, sq, s);
            else out.push(mk(sq, s, 0, F_NONE));
          } else if (s === this.ep) {
            out.push(mk(sq, s, 0, F_EP));
          }
        }
        continue;
      }

      if (ap === KNIGHT || ap === KING) {
        var dirs = ap === KNIGHT ? KNIGHT_D : KING_D;
        for (i = 0; i < 8; i++) {
          s = sq + dirs[i];
          if (s & 0x88) continue;
          if (b[s] * me > 0) continue;              /* own piece */
          if (capturesOnly && !b[s]) continue;
          out.push(mk(sq, s, 0, F_NONE));
        }
        continue;
      }

      /* Sliding pieces */
      var slide = ap === BISHOP ? BISHOP_D : ap === ROOK ? ROOK_D : KING_D;
      var n = ap === QUEEN ? 8 : 4;
      for (i = 0; i < n; i++) {
        d = slide[i]; s = sq + d;
        while (!(s & 0x88)) {
          if (b[s]) {
            if (b[s] * me < 0) out.push(mk(sq, s, 0, F_NONE));
            break;
          }
          if (!capturesOnly) out.push(mk(sq, s, 0, F_NONE));
          s += d;
        }
      }
    }

    /* Castling. Generated last, never in a captures-only (quiescence) pass.
       The king must not start in check, nor cross an attacked square; ending in
       check is caught by the normal legality filter. */
    if (!capturesOnly) {
      var them = -me;
      if (me === WHITE) {
        if ((this.castling & WK) && !b[5] && !b[6] &&
            !this.attacked(4, them) && !this.attacked(5, them)) out.push(mk(4, 6, 0, F_CASTLE));
        if ((this.castling & WQ) && !b[3] && !b[2] && !b[1] &&
            !this.attacked(4, them) && !this.attacked(3, them)) out.push(mk(4, 2, 0, F_CASTLE));
      } else {
        if ((this.castling & BK) && !b[117] && !b[118] &&
            !this.attacked(116, them) && !this.attacked(117, them)) out.push(mk(116, 118, 0, F_CASTLE));
        if ((this.castling & BQ) && !b[115] && !b[114] && !b[113] &&
            !this.attacked(116, them) && !this.attacked(115, them)) out.push(mk(116, 114, 0, F_CASTLE));
      }
    }
    return out;
  };

  function pushPromos(out, from, to) {
    out.push(mk(from, to, QUEEN, F_NONE));
    out.push(mk(from, to, ROOK, F_NONE));
    out.push(mk(from, to, BISHOP, F_NONE));
    out.push(mk(from, to, KNIGHT, F_NONE));
  }

  Position.prototype.make = function (m) {
    var b = this.board, me = this.side;
    var from = mFrom(m), to = mTo(m), promo = mPromo(m), flag = mFlag(m);
    var piece = b[from], captured = b[to];
    var ply = this.uPly;

    this.uEp[ply] = this.ep;
    this.uCastle[ply] = this.castling;
    this.uHalf[ply] = this.half;

    if (flag === F_EP) {
      /* The captured pawn is beside the destination, not on it. */
      var capSq = to - (me === WHITE ? 16 : -16);
      this.uCap[ply] = b[capSq];
      b[capSq] = EMPTY;
    } else {
      this.uCap[ply] = captured;
    }
    this.uPly++;

    b[to] = promo ? promo * me : piece;
    b[from] = EMPTY;

    if (flag === F_CASTLE) {
      /* King already moved above; relocate the rook. */
      if (to === 6) { b[5] = b[7]; b[7] = EMPTY; }
      else if (to === 2) { b[3] = b[0]; b[0] = EMPTY; }
      else if (to === 118) { b[117] = b[119]; b[119] = EMPTY; }
      else if (to === 114) { b[115] = b[112]; b[112] = EMPTY; }
    }

    if (piece * me === KING) this.kingSq[me === WHITE ? 0 : 1] = to;

    if (RIGHTS_MASK[from] !== undefined) this.castling &= RIGHTS_MASK[from];
    if (RIGHTS_MASK[to] !== undefined) this.castling &= RIGHTS_MASK[to];

    this.ep = flag === F_DOUBLE ? (from + to) / 2 : -1;
    this.half = (piece * me === PAWN || captured || flag === F_EP) ? 0 : this.half + 1;
    this.side = -me;
  };

  Position.prototype.unmake = function (m) {
    var b = this.board;
    var ply = --this.uPly;
    var me = -this.side; /* the side that made the move */
    var from = mFrom(m), to = mTo(m), promo = mPromo(m), flag = mFlag(m);

    this.side = me;
    this.ep = this.uEp[ply];
    this.castling = this.uCastle[ply];
    this.half = this.uHalf[ply];

    b[from] = promo ? PAWN * me : b[to];
    b[to] = EMPTY;

    if (flag === F_EP) {
      b[to - (me === WHITE ? 16 : -16)] = this.uCap[ply];
    } else {
      b[to] = this.uCap[ply];
    }

    if (flag === F_CASTLE) {
      if (to === 6) { b[7] = b[5]; b[5] = EMPTY; }
      else if (to === 2) { b[0] = b[3]; b[3] = EMPTY; }
      else if (to === 118) { b[119] = b[117]; b[117] = EMPTY; }
      else if (to === 114) { b[112] = b[115]; b[115] = EMPTY; }
    }

    if (b[from] * me === KING) this.kingSq[me === WHITE ? 0 : 1] = from;
  };

  Position.prototype.legalMoves = function () {
    var ps = this.genMoves(false), out = [], me = this.side;
    for (var i = 0; i < ps.length; i++) {
      this.make(ps[i]);
      if (!this.attacked(this.kingSq[me === WHITE ? 0 : 1], -me)) out.push(ps[i]);
      this.unmake(ps[i]);
    }
    return out;
  };

  /* Evaluation, POSITIVE = good for the side to move (negamax convention). */
  Position.prototype.evaluate = function () {
    var b = this.board, sq, p, ap, score = 0;
    var wb = 0, bb = 0, nonPawn = 0;

    for (sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      p = b[sq];
      if (!p) continue;
      ap = p > 0 ? p : -p;
      if (ap !== PAWN && ap !== KING) nonPawn += VALUE[ap];
      if (ap === BISHOP) { if (p > 0) wb++; else bb++; }
    }
    /* One king table for the middlegame, another for the endgame. The switch is
       on remaining non-pawn material, not move number, so trades drive it. */
    var endgame = nonPawn <= 1800;
    PST[KING] = endgame ? PST_K_END : PST_K_MID;

    for (sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      p = b[sq];
      if (!p) continue;
      if (p > 0) score += VALUE[p] + PST[p][idxW(sq)];
      else score -= VALUE[-p] + PST[-p][idxB(sq)];
    }
    if (wb >= 2) score += 30;  /* bishop pair */
    if (bb >= 2) score -= 30;

    return this.side === WHITE ? score : -score;
  };

  /* ---------------- Search ----------------
     Negamax + alpha-beta + iterative deepening + quiescence.
     Quiescence is the reason this does not use js/games/search.js: without it
     the engine evaluates mid-capture positions and hangs material every game. */
  function Engine() {
    this.nodes = 0;
    this.deadline = 0;
    this.aborted = false;
  }

  Engine.prototype.think = function (pos, maxDepth, ms) {
    this.nodes = 0;
    this.deadline = Date.now() + ms;
    this.aborted = false;

    var root = pos.legalMoves();
    if (!root.length) return null;

    var best = root[0], bestScore = 0;
    for (var depth = 1; depth <= maxDepth; depth++) {
      var res = this.searchRoot(pos, depth, best);
      if (this.aborted) break; /* discard the partial iteration */
      best = res.move; bestScore = res.score;
      if (Math.abs(bestScore) > MATE - 1000) break; /* forced mate found */
    }
    return { move: best, score: bestScore, nodes: this.nodes };
  };

  Engine.prototype.searchRoot = function (pos, depth, prevBest) {
    var moves = this.order(pos, pos.legalMoves());
    if (prevBest != null) {
      var i = moves.indexOf(prevBest);
      if (i > 0) { moves.splice(i, 1); moves.unshift(prevBest); }
    }
    var alpha = -MATE * 2, beta = MATE * 2;
    var bm = moves[0], bs = -MATE * 2;
    for (var k = 0; k < moves.length; k++) {
      pos.make(moves[k]);
      var sc = -this.negamax(pos, depth - 1, -beta, -alpha, 1);
      pos.unmake(moves[k]);
      if (this.aborted) return { move: bm, score: bs };
      if (sc > bs) { bs = sc; bm = moves[k]; }
      if (sc > alpha) alpha = sc;
    }
    return { move: bm, score: bs };
  };

  Engine.prototype.negamax = function (pos, depth, alpha, beta, ply) {
    if ((++this.nodes & 1023) === 0 && Date.now() > this.deadline) this.aborted = true;
    if (this.aborted) return 0;
    if (pos.half >= 100) return 0; /* fifty-move rule */
    if (depth <= 0) return this.quiesce(pos, alpha, beta, ply);

    var me = pos.side;
    var moves = this.order(pos, pos.genMoves(false));
    var legal = 0, bs = -MATE * 2;

    for (var k = 0; k < moves.length; k++) {
      pos.make(moves[k]);
      if (pos.attacked(pos.kingSq[me === WHITE ? 0 : 1], -me)) { pos.unmake(moves[k]); continue; }
      legal++;
      var sc = -this.negamax(pos, depth - 1, -beta, -alpha, ply + 1);
      pos.unmake(moves[k]);
      if (this.aborted) return bs === -MATE * 2 ? 0 : bs;
      if (sc > bs) bs = sc;
      if (sc > alpha) alpha = sc;
      if (alpha >= beta) break;
    }

    if (!legal) {
      /* Mate score is offset by ply so the search prefers the FASTEST mate and
         the most delayed loss. Without this it finds mate-in-5 and mate-in-1
         equally attractive and can shuffle forever. */
      return pos.inCheck(me) ? -MATE + ply : 0;
    }
    return bs;
  };

  /* Search on past the horizon until the position is quiet, considering only
     captures and promotions. Stand-pat lets a side decline the whole sequence. */
  Engine.prototype.quiesce = function (pos, alpha, beta, ply) {
    if ((++this.nodes & 1023) === 0 && Date.now() > this.deadline) this.aborted = true;
    if (this.aborted) return 0;

    var stand = pos.evaluate();
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    if (ply > 24) return stand; /* hard ceiling: long forced capture chains */

    var me = pos.side;
    var moves = this.order(pos, pos.genMoves(true));
    var bs = stand;

    for (var k = 0; k < moves.length; k++) {
      pos.make(moves[k]);
      if (pos.attacked(pos.kingSq[me === WHITE ? 0 : 1], -me)) { pos.unmake(moves[k]); continue; }
      var sc = -this.quiesce(pos, -beta, -alpha, ply + 1);
      pos.unmake(moves[k]);
      if (this.aborted) return bs;
      if (sc > bs) bs = sc;
      if (sc > alpha) alpha = sc;
      if (alpha >= beta) break;
    }
    return bs;
  };

  /* MVV-LVA: try capturing the most valuable victim with the least valuable
     attacker first. Cheap to compute and it drives most of the cutoffs. */
  Engine.prototype.order = function (pos, moves) {
    var b = pos.board;
    var scored = moves.map(function (m) {
      var victim = b[mTo(m)], attacker = b[mFrom(m)];
      var s = 0;
      if (victim) s = 10 * VALUE[victim > 0 ? victim : -victim] - VALUE[attacker > 0 ? attacker : -attacker];
      if (mPromo(m)) s += 8000 + VALUE[mPromo(m)];
      if (mFlag(m) === F_EP) s += 1000;
      return { m: m, s: s };
    });
    scored.sort(function (a, b2) { return b2.s - a.s; });
    return scored.map(function (x) { return x.m; });
  };

  /* ---------------- Game-level rules ---------------- */
  function insufficient(pos) {
    var b = pos.board, w = [], bl = [], sq, p;
    for (sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      p = b[sq];
      if (!p || p === KING || p === -KING) continue;
      if (p > 0) w.push({ t: p, sq: sq }); else bl.push({ t: -p, sq: sq });
    }
    if (w.length === 0 && bl.length === 0) return true;                 /* K v K */
    if (w.length === 1 && bl.length === 0 && (w[0].t === KNIGHT || w[0].t === BISHOP)) return true;
    if (bl.length === 1 && w.length === 0 && (bl[0].t === KNIGHT || bl[0].t === BISHOP)) return true;
    if (w.length === 1 && bl.length === 1 && w[0].t === BISHOP && bl[0].t === BISHOP) {
      /* Two bishops on the same colour complex can never mate. */
      var cw = ((w[0].sq >> 4) + (w[0].sq & 7)) & 1;
      var cb = ((bl[0].sq >> 4) + (bl[0].sq & 7)) & 1;
      if (cw === cb) return true;
    }
    return false;
  }

  /* ---------------- UI ---------------- */
  var GLYPH = { 1: "♙", 2: "♘", 3: "♗", 4: "♖", 5: "♕", 6: "♔", "-1": "♟", "-2": "♞", "-3": "♝", "-4": "♜", "-5": "♛", "-6": "♚" };
  var FILES = "abcdefgh";
  var PROMO_LETTER = {}; PROMO_LETTER[KNIGHT] = "N"; PROMO_LETTER[BISHOP] = "B";
  PROMO_LETTER[ROOK] = "R"; PROMO_LETTER[QUEEN] = "Q";
  var LEVELS = {
    easy: { depth: 2, ms: 250, label: "Easy" },
    medium: { depth: 4, ms: 700, label: "Medium" },
    hard: { depth: 6, ms: 1400, label: "Hard" }
  };

  function sqName(sq) { return FILES[sq & 7] + ((sq >> 4) + 1); }

  function mountChess(root) {
    var pos = new Position();
    var engine = new Engine();
    var mode = "medium";       /* easy | medium | hard | human */
    var humanSide = WHITE;
    var selected = -1;
    var targets = [];          /* legal moves from `selected` */
    var history = [];          /* {san, move, key} */
    var repCount = {};
    var over = false;
    var thinking = false;
    var flipped = false;
    var timer = null;

    var head = G.head([
      { key: "cap", label: "Material", value: "0" },
      { key: "mv", label: "Move", value: "1" }
    ]);
    root.appendChild(head.node);

    var modeSeg = G.seg([
      { value: "easy", label: "Easy" },
      { value: "medium", label: "Medium" },
      { value: "hard", label: "Hard" },
      { value: "human", label: "2 Player" }
    ], mode, function (v) { mode = v; newGame(); });
    head.left.appendChild(modeSeg);

    var msg = G.el("div", "g-msg");
    root.appendChild(msg);

    var boardEl = G.el("div", "chess-board");
    root.appendChild(boardEl);

    var cells = [];
    for (var i = 0; i < 64; i++) {
      var c = G.el("button", "chess-sq");
      c.type = "button";
      cells.push(c);
      boardEl.appendChild(c);
      bindCell(c, i);
    }

    var moveList = G.el("div", "chess-moves");
    root.appendChild(moveList);

    var bar = G.el("div", "g-actions");
    var bNew = G.btn("New game");
    var bUndo = G.btn("Undo");
    var bFlip = G.btn("Flip board");
    var bSide = G.btn("Play as Black");
    bar.appendChild(bNew); bar.appendChild(bUndo); bar.appendChild(bFlip); bar.appendChild(bSide);
    root.appendChild(bar);
    root.appendChild(G.el("p", "g-hint", "Click a piece, then a highlighted square. Castling: move the king two squares."));

    /* Promotion picker, shown only when a pawn actually reaches the last rank. */
    var promoWrap = G.el("div", "chess-promo hidden");
    var pendingPromo = null;
    [QUEEN, ROOK, BISHOP, KNIGHT].forEach(function (t) {
      var b = G.el("button", "chess-promo-btn", GLYPH[String(humanSide > 0 ? t : -t)]);
      b.type = "button";
      b.dataset.type = String(t);
      b.addEventListener("click", function () {
        if (!pendingPromo) return;
        var m = mk(pendingPromo.from, pendingPromo.to, t, F_NONE);
        pendingPromo = null;
        promoWrap.classList.add("hidden");
        applyMove(m);
      });
      promoWrap.appendChild(b);
    });
    root.appendChild(promoWrap);

    bNew.addEventListener("click", newGame);
    bFlip.addEventListener("click", function () { flipped = !flipped; draw(); });
    bSide.addEventListener("click", function () {
      humanSide = -humanSide;
      bSide.textContent = humanSide === WHITE ? "Play as Black" : "Play as White";
      flipped = humanSide === BLACK;
      newGame();
    });
    bUndo.addEventListener("click", function () {
      if (thinking || !history.length) return;
      /* In engine mode undo a full pair so it stays the human's turn. */
      var n = (mode === "human" || history.length === 1) ? 1 : 2;
      while (n-- > 0 && history.length) {
        var h = history.pop();
        pos.unmake(h.move);
        repCount[h.key] = (repCount[h.key] || 1) - 1;
      }
      over = false;
      selected = -1; targets = [];
      draw();
      status();
    });

    function bindCell(cell, viewIdx) {
      cell.addEventListener("click", function () {
        if (over || thinking) return;
        if (mode !== "human" && pos.side !== humanSide) return;
        var sq = viewToSq(viewIdx);
        onSquare(sq);
      });
    }

    /* View index 0 is the top-left rendered square. Unflipped that is a8. */
    function viewToSq(v) {
      var r = Math.floor(v / 8), f = v % 8;
      return flipped ? (r * 16 + (7 - f)) : ((7 - r) * 16 + f);
    }
    function sqToView(sq) {
      var r = sq >> 4, f = sq & 7;
      return flipped ? (r * 8 + (7 - f)) : ((7 - r) * 8 + f);
    }

    function onSquare(sq) {
      var p = pos.board[sq];
      /* Clicking one of the highlighted targets plays the move. */
      for (var i = 0; i < targets.length; i++) {
        if (mTo(targets[i]) === sq) {
          var promos = targets.filter(function (m) { return mTo(m) === sq && mPromo(m); });
          if (promos.length) {
            pendingPromo = { from: selected, to: sq };
            showPromoPicker();
            selected = -1; targets = [];
            draw();
            return;
          }
          var mv = targets[i];
          selected = -1; targets = [];
          applyMove(mv);
          return;
        }
      }
      /* Otherwise select / deselect. */
      if (p && p * pos.side > 0) {
        selected = sq;
        targets = pos.legalMoves().filter(function (m) { return mFrom(m) === sq; });
      } else {
        selected = -1; targets = [];
      }
      draw();
    }

    function showPromoPicker() {
      var side = pos.side;
      promoWrap.querySelectorAll(".chess-promo-btn").forEach(function (b) {
        var t = parseInt(b.dataset.type, 10);
        b.innerHTML = GLYPH[String(side > 0 ? t : -t)];
      });
      promoWrap.classList.remove("hidden");
    }

    function applyMove(m) {
      var san = describe(pos, m);
      pos.make(m);
      var k = pos.key();
      repCount[k] = (repCount[k] || 0) + 1;
      history.push({ san: san, move: m, key: k });
      selected = -1; targets = [];
      draw();
      if (status()) return;
      if (mode !== "human" && pos.side !== humanSide) engineMove();
    }

    function engineMove() {
      thinking = true;
      msg.textContent = "Thinking…";
      msg.className = "g-msg";
      /* Defer so the human's move is painted before the search blocks the
         main thread. Without this the board appears frozen mid-move. */
      timer = setTimeout(function () {
        timer = null;
        var lvl = LEVELS[mode] || LEVELS.medium;
        var res = engine.think(pos, lvl.depth, lvl.ms);
        thinking = false;
        if (!res || res.move == null) { status(); return; }
        var san = describe(pos, res.move);
        pos.make(res.move);
        var k = pos.key();
        repCount[k] = (repCount[k] || 0) + 1;
        history.push({ san: san, move: res.move, key: k });
        draw();
        status();
      }, 30);
    }

    /* Move text. Long algebraic (e2-e4, Ng1-f3, exd5, O-O) rather than strict
       SAN: strict SAN needs full disambiguation logic that adds no value on a
       board the player is looking at. */
    function describe(p, m) {
      var from = mFrom(m), to = mTo(m), flag = mFlag(m), promo = mPromo(m);
      if (flag === F_CASTLE) return (to === 6 || to === 118) ? "O-O" : "O-O-O";
      var piece = p.board[from];
      var ap = piece > 0 ? piece : -piece;
      var letter = ap === PAWN ? "" : "NBRQK"[ap - 2];
      var cap = (p.board[to] || flag === F_EP) ? "x" : "-";
      var s = letter + sqName(from) + cap + sqName(to);
      if (promo) s += "=" + PROMO_LETTER[promo];
      if (flag === F_EP) s += " e.p.";
      return s;
    }

    function material() {
      var b = pos.board, s = 0;
      for (var sq = 0; sq < 128; sq++) {
        if (sq & 0x88) { sq += 7; continue; }
        var p = b[sq];
        if (!p) continue;
        var ap = p > 0 ? p : -p;
        if (ap === KING) continue;
        s += p > 0 ? VALUE[ap] : -VALUE[ap];
      }
      return Math.round(s / 100);
    }

    function draw() {
      var lastFrom = -1, lastTo = -1;
      if (history.length) {
        var lm = history[history.length - 1].move;
        lastFrom = mFrom(lm); lastTo = mTo(lm);
      }
      var checkSq = pos.inCheck(pos.side) ? pos.kingSq[pos.side === WHITE ? 0 : 1] : -1;

      for (var v = 0; v < 64; v++) {
        var sq = viewToSq(v), p = pos.board[sq], cell = cells[v];
        var dark = (((sq >> 4) + (sq & 7)) & 1) === 0;
        var cls = "chess-sq " + (dark ? "dark" : "light");
        if (sq === selected) cls += " sel";
        if (sq === lastFrom || sq === lastTo) cls += " last";
        if (sq === checkSq) cls += " check";
        for (var t = 0; t < targets.length; t++) {
          if (mTo(targets[t]) === sq) { cls += pos.board[sq] || mFlag(targets[t]) === F_EP ? " tgt-cap" : " tgt"; break; }
        }
        cell.className = cls;
        cell.innerHTML = p ? '<span class="cp' + (p > 0 ? " w" : " b") + '">' + GLYPH[String(p)] + "</span>" : "";
        cell.setAttribute("aria-label", sqName(sq) + (p ? " " + GLYPH[String(p)] : " empty"));
      }

      var mat = material();
      head.set("cap", (mat > 0 ? "+" : "") + mat);
      head.set("mv", Math.floor(history.length / 2) + 1);

      moveList.innerHTML = "";
      for (var i = 0; i < history.length; i += 2) {
        var row = G.el("span", "cm-row");
        row.appendChild(G.el("i", "cm-n", (i / 2 + 1) + "."));
        row.appendChild(G.el("b", null, history[i].san));
        if (history[i + 1]) row.appendChild(G.el("b", null, history[i + 1].san));
        moveList.appendChild(row);
      }
      moveList.scrollTop = moveList.scrollHeight;
    }

    /* Returns true when the game has ended. */
    function status() {
      var legal = pos.legalMoves();
      var check = pos.inCheck(pos.side);
      var mover = pos.side === WHITE ? "White" : "Black";

      if (!legal.length) {
        over = true;
        if (check) { msg.textContent = "Checkmate. " + (pos.side === WHITE ? "Black" : "White") + " wins."; msg.className = "g-msg ok"; }
        else { msg.textContent = "Stalemate. Draw."; msg.className = "g-msg"; }
        return true;
      }
      if (pos.half >= 100) { over = true; msg.textContent = "Draw by the fifty-move rule."; msg.className = "g-msg"; return true; }
      if (repCount[pos.key()] >= 3) { over = true; msg.textContent = "Draw by threefold repetition."; msg.className = "g-msg"; return true; }
      if (insufficient(pos)) { over = true; msg.textContent = "Draw by insufficient material."; msg.className = "g-msg"; return true; }

      msg.textContent = check ? mover + " is in check." : mover + " to move.";
      msg.className = check ? "g-msg err" : "g-msg";
      return false;
    }

    function newGame() {
      if (timer) { clearTimeout(timer); timer = null; }
      pos.reset();
      history = []; repCount = {}; over = false; thinking = false;
      selected = -1; targets = []; pendingPromo = null;
      promoWrap.classList.add("hidden");
      repCount[pos.key()] = 1;
      draw();
      status();
      if (mode !== "human" && pos.side !== humanSide) engineMove();
    }

    newGame();

    /* Cleanup: the hub calls this before switching tabs. A pending engine
       timeout here would otherwise fire into a detached DOM. */
    return function () { if (timer) clearTimeout(timer); };
  }

  G.add({ id: "chess", name: "Chess", icon: "♞", mount: mountChess });

  /* Test hook. The perft harness (tools/perft.js, dev-only, not deployed) needs
     the position and search internals. Exposing them costs nothing at runtime
     and is the difference between a move generator that is claimed correct and
     one that is demonstrated correct. */
  window.RREChess = { Position: Position, Engine: Engine, mFrom: mFrom, mTo: mTo, mPromo: mPromo };
})();
