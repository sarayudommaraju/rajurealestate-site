/*
  File: js/calc.js
  Purpose: A real, interactive pocket calculator for the EMI page. Click keys or
           type on the keyboard. Standard four-function + percent, decimal, clear,
           backspace, chained operations and equals.
  Engine: Vanilla JS. Self-contained; only touches #calc-display and .calc-key.
  Known failure modes: divide-by-zero shows "Error" and resets on next digit.
*/
(function () {
  var display = document.getElementById("calc-display");
  var calc = document.getElementById("calc");
  if (!display || !calc) return;

  var value = "0";        // string shown on screen
  var firstOperand = null; // number
  var operator = null;     // "+","-","*","/"
  var waiting = false;     // true = next digit starts a new operand
  var errored = false;

  function round(n) { return Math.round((n + Number.EPSILON) * 1e8) / 1e8; }
  function render() {
    var v = value;
    if (v.length > 14 && v.indexOf("e") === -1 && !isNaN(+v)) v = (+v).toPrecision(10).replace(/\.?0+$/, "");
    display.textContent = v;
  }
  function clearAll() { value = "0"; firstOperand = null; operator = null; waiting = false; errored = false; render(); }
  function inputDigit(d) {
    if (errored) clearAll();
    if (waiting) { value = d; waiting = false; }
    else { value = value === "0" ? d : value + d; }
    render();
  }
  function inputDot() {
    if (errored) clearAll();
    if (waiting) { value = "0."; waiting = false; render(); return; }
    if (value.indexOf(".") === -1) { value += "."; render(); }
  }
  function compute(a, b, op) {
    if (op === "+") return a + b;
    if (op === "-") return a - b;
    if (op === "*") return a * b;
    if (op === "/") return b === 0 ? NaN : a / b;
    return b;
  }
  function handleOp(nextOp) {
    if (errored) return;
    var input = parseFloat(value);
    if (operator && waiting) { operator = nextOp; return; } // just swap the pending operator
    if (firstOperand === null) { firstOperand = input; }
    else if (operator) {
      var r = compute(firstOperand, input, operator);
      if (!isFinite(r)) { value = "Error"; errored = true; render(); firstOperand = null; operator = null; return; }
      value = String(round(r)); firstOperand = r; render();
    }
    waiting = true; operator = nextOp;
  }
  function equals() {
    if (operator === null || waiting || errored) return;
    var r = compute(firstOperand, parseFloat(value), operator);
    if (!isFinite(r)) { value = "Error"; errored = true; render(); }
    else { value = String(round(r)); render(); }
    firstOperand = null; operator = null; waiting = false;
  }
  function percent() {
    if (errored) return;
    value = String(round(parseFloat(value) / 100)); render();
  }
  function backspace() {
    if (errored) { clearAll(); return; }
    if (waiting) return;
    value = value.length > 1 ? value.slice(0, -1) : "0"; render();
  }

  function press(k) {
    if (/^[0-9]$/.test(k)) inputDigit(k);
    else if (k === ".") inputDot();
    else if (k === "+" || k === "-" || k === "*" || k === "/") handleOp(k);
    else if (k === "=") equals();
    else if (k === "clear") clearAll();
    else if (k === "back") backspace();
    else if (k === "percent") percent();
  }

  calc.addEventListener("click", function (e) {
    var b = e.target.closest(".calc-key"); if (!b) return;
    press(b.getAttribute("data-k"));
  });

  // Keyboard support, only while the calculator is on screen
  document.addEventListener("keydown", function (e) {
    var r = calc.getBoundingClientRect();
    if (r.bottom < 0 || r.top > (window.innerHeight || 800)) return; // off-screen, ignore
    var k = e.key;
    if (/^[0-9]$/.test(k)) { press(k); }
    else if (k === "." || k === "+" || k === "-" || k === "*" || k === "/") { press(k); }
    else if (k === "Enter" || k === "=") { e.preventDefault(); press("="); }
    else if (k === "Backspace") { press("back"); }
    else if (k === "Escape") { press("clear"); }
    else if (k === "%") { press("percent"); }
    else return;
    // flash the matching key for feedback
    var map = { Enter: "=", Escape: "clear", Backspace: "back", "%": "percent" };
    var sel = map[k] || k;
    var btn = calc.querySelector('.calc-key[data-k="' + (sel === "*" ? "*" : sel).replace(/"/g, '\\"') + '"]');
    if (btn) { btn.classList.add("active"); setTimeout(function () { btn.classList.remove("active"); }, 90); }
  });

  render();
})();
