/*
  File: tools/perft.js
  Purpose: Correctness test for the chess move generator in js/games/chess.js.
           Perft counts leaf nodes in the legal move tree to a fixed depth. The
           expected counts below are the long-published values for the standard
           test positions, so any deviation is a bug in movegen, make or unmake.
  Engine: Node.js. DEV ONLY — this directory is not part of the deployed site.
  Usage: node tools/perft.js
  Expected output: one PASS line per position, then "ALL PASS". Any FAIL prints
           expected vs actual.
  Known failure modes: depth 5 on the start position and depth 4 on Kiwipete
           take a few seconds each under plain Node; that is the price of an
           interpreted generator and is not itself a defect.
*/
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.join(__dirname, "..");
var sandbox = { window: {}, document: undefined, console: console, Date: Date, Math: Math };
sandbox.window.RREGames = { add: function () {}, el: function () {}, head: function () {}, seg: function () {}, btn: function () {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "js/games/chess.js"), "utf8"), sandbox, { filename: "chess.js" });

var Chess = sandbox.window.RREChess;
if (!Chess) { console.error("chess.js did not export the test hook"); process.exit(1); }

function perft(pos, depth) {
  if (depth === 0) return 1;
  var moves = pos.genMoves(false);
  var me = pos.side;
  var n = 0;
  for (var i = 0; i < moves.length; i++) {
    pos.make(moves[i]);
    if (!pos.attacked(pos.kingSq[me === 1 ? 0 : 1], -me)) {
      n += depth === 1 ? 1 : perft(pos, depth - 1);
    }
    pos.unmake(moves[i]);
  }
  return n;
}

var START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
var TESTS = [
  { name: "Start position", fen: START, expect: [20, 400, 8902, 197281, 4865609] },
  { name: "Kiwipete", fen: "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1", expect: [48, 2039, 97862, 4085603] },
  { name: "Position 3 (ep/pins)", fen: "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1", expect: [14, 191, 2812, 43238, 674624] },
  { name: "Position 4 (promotions)", fen: "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1", expect: [6, 264, 9467, 422333] },
  { name: "Position 5", fen: "rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8", expect: [44, 1486, 62379, 2103487] },
  { name: "Position 6", fen: "r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10", expect: [46, 2079, 89890, 3894594] }
];

var fail = 0;
TESTS.forEach(function (t) {
  for (var d = 1; d <= t.expect.length; d++) {
    var pos = new Chess.Position();
    pos.fromFEN(t.fen);
    var got = perft(pos, d);
    var want = t.expect[d - 1];
    if (got === want) {
      console.log("PASS  " + t.name + " depth " + d + " = " + got);
    } else {
      console.log("FAIL  " + t.name + " depth " + d + " expected " + want + " got " + got);
      fail++;
    }
  }
});

console.log(fail === 0 ? "\nALL PASS" : "\n" + fail + " FAILURE(S)");
process.exit(fail === 0 ? 0 : 1);
