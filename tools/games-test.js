/*
  File: tools/games-test.js
  Purpose: Rule and invariant tests for Draughts, Sudoku and Connect Four.
           Chess has its own harness in tools/perft.js.
  Engine: Node.js. DEV ONLY — this directory is not part of the deployed site.
  Usage: node tools/games-test.js
  Dependencies: the test hooks exported at the bottom of each game module
           (window.RREDraughts / RRESudoku / RREConnect4).
  Expected output: one PASS line per assertion, then a pass/fail tally.
           Exit code 0 on a clean run, 1 otherwise.
  Known failure modes: the Sudoku section generates real puzzles, so it takes a
           few seconds and its runtime varies with the random grids drawn.
*/
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.join(__dirname, "..");
var sandbox = { window: {}, console: console, Date: Date, Math: Math, Set: Set, Object: Object, Array: Array, Uint8Array: Uint8Array, Int8Array: Int8Array };
sandbox.window.RREGames = { add: function () {}, el: function () {}, head: function () {}, seg: function () {}, btn: function () {} };
vm.createContext(sandbox);
["js/games/search.js", "js/games/draughts.js", "js/games/sudoku.js", "js/games/connect4.js"].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), sandbox, { filename: f });
});

var D = sandbox.window.RREDraughts;
var SU = sandbox.window.RRESudoku;
var C4 = sandbox.window.RREConnect4;
var S = sandbox.window.RRESearch;

var pass = 0, fail = 0;
function chk(name, cond, detail) {
  if (cond) { pass++; console.log("PASS  " + name); }
  else { fail++; console.log("FAIL  " + name + "   " + (detail || "")); }
}
function section(t) { console.log("\n--- " + t + " ---"); }

/* ================= Draughts ================= */
section("International draughts (10x10)");
function I(r, c) { return r * 10 + c; }
function blank(side) { var g = new D.Game(); g.b.fill(0); g.side = side || 1; return g; }

function perftD(g, d) {
  if (d === 0) return 1;
  var ms = g.moves();
  if (d === 1) return ms.length;
  var n = 0;
  for (var i = 0; i < ms.length; i++) { g.make(ms[i]); n += perftD(g, d - 1); g.unmake(ms[i]); }
  return n;
}

/* Published perft series for the international draughts opening position. */
var EXPECT_D = [9, 81, 658, 4265, 27117, 167140];
for (var d = 1; d <= EXPECT_D.length; d++) {
  var got = perftD(new D.Game(), d);
  chk("perft depth " + d + " = " + EXPECT_D[d - 1], got === EXPECT_D[d - 1], "got " + got);
}

var gi = new D.Game(), snapD = Array.from(gi.b).join(",");
perftD(gi, 4);
chk("unmake restores the board byte for byte",
  Array.from(gi.b).join(",") === snapD && gi.side === 1 && gi.ply === 0);

var g1 = blank(1); g1.b[I(9, 0)] = 2; g1.b[I(6, 3)] = -1;
var m1 = g1.moves();
chk("flying king lands on any empty square beyond the victim (6)",
  m1.length === 6 && m1.every(function (m) { return m.caps.length === 1; }), "got " + m1.length);

var g2 = blank(1); g2.b[I(9, 0)] = 2; g2.b[I(6, 3)] = -1; g2.b[I(5, 4)] = -1;
chk("flying king cannot jump two adjacent pieces",
  g2.moves().every(function (m) { return m.caps.length <= 1; }));

var g3 = blank(1); g3.b[I(5, 4)] = 1; g3.b[I(6, 5)] = -1;
var m3 = g3.moves();
chk("men capture backwards (international, unlike American checkers)",
  m3.length === 1 && m3[0].to === I(7, 6));

var g4 = blank(1);
g4.b[I(7, 2)] = 1; g4.b[I(6, 1)] = -1; g4.b[I(6, 3)] = -1; g4.b[I(4, 5)] = -1;
var m4 = g4.moves();
chk("maximum capture is compulsory (the 1-capture branch is discarded)",
  m4.length === 1 && m4[0].caps.length === 2 && m4[0].to === I(3, 6),
  "got " + m4.length + " caps=" + m4.map(function (m) { return m.caps.length; }).join("/"));

var g5 = blank(1);
g5.b[I(4, 1)] = 1; g5.b[I(3, 2)] = -1; g5.b[I(1, 4)] = -1; g5.b[I(1, 6)] = -1;
var m5 = g5.moves();
chk("a man passing over the last row mid-jump does NOT promote",
  m5.length === 1 && m5[0].caps.length === 3 && m5[0].to === I(2, 7) && m5[0].promote === false);

var g6 = blank(1); g6.b[I(2, 1)] = 1; g6.b[I(1, 2)] = -1;
var m6 = g6.moves();
chk("a man ending on the last row DOES promote",
  m6.length === 1 && m6[0].to === I(0, 3) && m6[0].promote === true);

var g7 = blank(1);
g7.b[I(5, 0)] = 2; g7.b[I(4, 1)] = -1; g7.b[I(2, 1)] = -1; g7.b[I(1, 4)] = -1;
chk("Turkish strike: no piece is captured twice in one sequence",
  g7.moves().every(function (m) { return new Set(m.caps).size === m.caps.length; }));

var g8 = blank(1); g8.b[I(5, 4)] = 1;
var m8 = g8.moves();
chk("quiet men move forward only",
  m8.length === 2 && m8.every(function (m) { return ((m.to / 10) | 0) === 4; }));

var g9 = blank(1); g9.b[I(7, 2)] = 1; g9.b[I(6, 3)] = -2;
var mv9 = g9.moves()[0], snap9 = Array.from(g9.b).join(",");
g9.make(mv9); g9.unmake(mv9);
chk("unmake restores a captured king as a king",
  Array.from(g9.b).join(",") === snap9 && g9.b[I(6, 3)] === -2);

var gT = blank(1); gT.b[I(5, 4)] = 1; gT.b[I(4, 3)] = -1; gT.b[I(4, 5)] = -1;
gT.b[I(3, 2)] = -1; gT.b[I(3, 4)] = -1; gT.b[I(3, 6)] = -1;
chk("a fully blocked side has no moves and is terminal",
  blank(1).moves().length === 0 && blank(1).terminal() !== null);

/* ================= Sudoku ================= */
section("Sudoku");
function solutionsOf(grid) {
  var work = new Uint8Array(81); work.set(grid);
  return SU.countSolutions(work, 3);
}
function validComplete(g) {
  for (var i = 0; i < 81; i++) {
    var v = g[i];
    if (!v) return false;
    g[i] = 0;
    var good = SU.ok(g, i, v);
    g[i] = v;
    if (!good) return false;
  }
  return true;
}

["easy", "medium", "hard", "expert"].forEach(function (lvl) {
  var t = Date.now();
  var res = SU.generate(SU.LEVELS[lvl].remove);
  var ms = Date.now() - t;
  var sol = new Uint8Array(81); sol.set(res.solution);
  chk(lvl + ": solution is a valid complete grid", validComplete(sol));
  chk(lvl + ": puzzle has EXACTLY one solution", solutionsOf(res.puzzle) === 1);
  var clues = 0;
  for (var i = 0; i < 81; i++) if (res.puzzle[i]) clues++;
  chk(lvl + ": clue count reported correctly (" + clues + ") and generated in " + ms + "ms",
    clues === res.clues && ms < 5000, "clues=" + clues + " reported=" + res.clues + " ms=" + ms);
  var agrees = true;
  for (i = 0; i < 81; i++) if (res.puzzle[i] && res.puzzle[i] !== res.solution[i]) agrees = false;
  chk(lvl + ": every clue matches the stored solution", agrees);
});

/* ================= Connect Four ================= */
section("Connect Four");
var c = new C4.Game();
chk("69 four-in-a-row windows exist on a 7x6 board", C4.LINES.length === 69, "got " + C4.LINES.length);

c.reset();
[3, 0, 3, 1, 3, 2, 3].forEach(function (col) { c.make(col); });
chk("vertical four is detected", c.winLine(1) !== null);

c.reset();
[0, 0, 1, 1, 2, 2, 3].forEach(function (col) { c.make(col); });
chk("horizontal four is detected", c.winLine(1) !== null);

c.reset();
[0, 1, 1, 2, 2, 3, 2, 3, 3, 0, 3].forEach(function (col) { c.make(col); });
chk("diagonal four is detected", c.winLine(1) !== null);

c.reset();
var snapC = Array.from(c.b).join(",");
(function walk(g, d) {
  if (d === 0) return;
  var ms = g.moves();
  for (var i = 0; i < ms.length; i++) { g.make(ms[i]); walk(g, d - 1); g.unmake(ms[i]); }
})(c, 5);
chk("unmake restores the board byte for byte",
  Array.from(c.b).join(",") === snapC && c.side === 1 && c.ply === 0);

/* The engine must take an immediate win, and must block an immediate threat. */
c.reset();
[3, 0, 3, 1, 3, 2].forEach(function (col) { c.make(col); });  /* red threatens col 3 */
var win = S.bestMove(c, 8, 800);
chk("engine plays the immediate winning move", win.move === 3, "played " + win.move);

c.reset();
[0, 3, 6, 3, 5, 3].forEach(function (col) { c.make(col); });  /* yellow threatens col 3 */
var block = S.bestMove(c, 8, 800);
chk("engine blocks an immediate loss", block.move === 3, "played " + block.move);

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
