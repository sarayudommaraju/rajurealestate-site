/*
  File: js/games/search.js
  Purpose: Generic negamax + alpha-beta search with iterative deepening and a
           wall-clock budget. Shared by Connect Four and Draughts.
  Engine: Vanilla JS (ES5 syntax, no build step).
  Platform: Cloudflare Pages static hosting under strict CSP. No WASM, so this
           is plain interpreted JS and the practical depth ceiling on a mid-range
           phone is low. See "Known failure modes".
  Constraints: Runs on the main thread. No Web Worker, because a Worker script
           is a separate 'self' request and the added lifecycle complexity is not
           worth it at these depths — instead the caller defers the search behind
           a setTimeout so the UI paints the human's move first.
  Dependencies: none. Loaded after core.js, before the games that use it.

  Interface: game object supplied by the caller must implement
    moves()        -> array of move tokens for the side to move (any type)
    make(m)        -> apply move, flip side to move
    unmake(m)      -> exactly undo make(m)
    evaluate()     -> score in centipawn-equivalents, POSITIVE = good for the
                      side currently to move (negamax convention)
    terminal()     -> null if the game continues, otherwise a score from the
                      perspective of the side to move (use -MATE for "I am lost")

  Expected behaviour: bestMove(game, maxDepth, msBudget) returns
    {move, score, depth, nodes} for the side to move, or {move:null} when
    moves() is empty. Deeper iterations are abandoned once msBudget is exceeded,
    and the result from the last COMPLETED iteration is returned — a partial
    iteration is never used, so the move is always the product of a full search.

  Known failure modes:
    - Pure JS, single-threaded: expect ~6-9 ply in Connect Four and ~5-7 ply in
      10x10 draughts within a 1s budget on desktop, materially less on a phone.
      This engine will lose to any dedicated engine and to a strong human.
    - No transposition table. Repeated positions are re-searched, which roughly
      doubles the work in draughts endgames with king shuffling.
    - Budget is checked every 2048 nodes, so a single very slow evaluate() can
      overshoot msBudget. Keep evaluate() allocation-free.
*/
(function () {
  var MATE = 1000000;
  var CHECK_MASK = 2047; /* check the clock every 2048 nodes, not every node */

  function bestMove(game, maxDepth, msBudget) {
    var deadline = Date.now() + (msBudget || 800);
    var nodes = 0;
    var aborted = false;
    var best = { move: null, score: 0, depth: 0, nodes: 0 };

    var root = game.moves();
    if (!root.length) return best;
    best.move = root[0];

    for (var depth = 1; depth <= maxDepth; depth++) {
      var iter = searchRoot(depth);
      /* Discard a half-finished iteration: its move ordering is biased toward
         whichever branch happened to be searched first. */
      if (aborted) break;
      best = { move: iter.move, score: iter.score, depth: depth, nodes: nodes };
      /* A forced win or loss is found; deeper search cannot improve on it. */
      if (Math.abs(iter.score) > MATE - 1000) break;
    }
    best.nodes = nodes;
    return best;

    function searchRoot(depth) {
      var alpha = -MATE * 2, beta = MATE * 2;
      var moves = game.moves();
      /* Search the previous iteration's best move first: on a stable position
         that alone produces most of the alpha-beta cutoffs. */
      if (best.move != null) {
        var i = moves.indexOf(best.move);
        if (i > 0) { moves.splice(i, 1); moves.unshift(best.move); }
      }
      var bm = moves[0], bs = -MATE * 2;
      for (var k = 0; k < moves.length; k++) {
        game.make(moves[k]);
        var sc = -negamax(depth - 1, -beta, -alpha);
        game.unmake(moves[k]);
        if (aborted) return { move: bm, score: bs };
        if (sc > bs) { bs = sc; bm = moves[k]; }
        if (sc > alpha) alpha = sc;
      }
      return { move: bm, score: bs };
    }

    function negamax(depth, alpha, beta) {
      if ((++nodes & CHECK_MASK) === 0 && Date.now() > deadline) aborted = true;
      if (aborted) return 0;

      var t = game.terminal();
      if (t !== null) return t;
      if (depth <= 0) return game.evaluate();

      var moves = game.moves();
      if (!moves.length) return game.evaluate();

      var bs = -MATE * 2;
      for (var k = 0; k < moves.length; k++) {
        game.make(moves[k]);
        var sc = -negamax(depth - 1, -beta, -alpha);
        game.unmake(moves[k]);
        if (aborted) return bs === -MATE * 2 ? 0 : bs;
        if (sc > bs) bs = sc;
        if (sc > alpha) alpha = sc;
        if (alpha >= beta) break; /* fail-soft beta cutoff */
      }
      return bs;
    }
  }

  window.RRESearch = { bestMove: bestMove, MATE: MATE };
})();
