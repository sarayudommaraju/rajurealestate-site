/*
  File: js/emi.js
  Purpose: Standalone home-loan EMI calculator page logic.
  Engine: Vanilla JS. Depends on site.js (formatPrice).
  Formula: reducing-balance EMI = P·r·(1+r)^n / ((1+r)^n − 1),
    P = loan principal, r = monthly rate, n = months.
*/
(function () {
  var el = {
    price: id("e-price"), down: id("e-down"), rate: id("e-rate"), years: id("e-years"),
    loan: id("e-loan"), emi: id("e-emi"), interest: id("e-interest"), total: id("e-total"),
    barP: id("e-bar-p"), barI: id("e-bar-i")
  };
  function id(x) { return document.getElementById(x); }
  if (!el.price) return;

  function rupee(n) { return "₹ " + Math.round(n).toLocaleString("en-IN"); }

  function calc() {
    var price = +el.price.value || 0;
    var P = price * (1 - (+el.down.value || 0) / 100);
    var r = (+el.rate.value || 0) / 12 / 100;
    var n = (+el.years.value || 0) * 12;

    var emi = (n > 0 && r > 0) ? P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1) : (n > 0 ? P / n : 0);
    var total = emi * n;
    var interest = total - P;

    el.loan.textContent = P > 0 ? (window.formatPrice ? formatPrice(Math.round(P)) : rupee(P)) : "—";
    el.emi.textContent = emi ? rupee(emi) + " /mo" : "—";
    el.interest.textContent = interest > 0 ? rupee(interest) : "—";
    el.total.textContent = total > 0 ? rupee(total) : "—";

    // Principal vs interest split bar
    if (total > 0) {
      var pPct = Math.max(2, Math.min(98, (P / total) * 100));
      el.barP.style.width = pPct + "%";
      el.barI.style.width = (100 - pPct) + "%";
    }
  }

  [el.price, el.down, el.rate, el.years].forEach(function (i) { i.addEventListener("input", calc); });
  document.addEventListener("DOMContentLoaded", calc);
  calc();
})();
