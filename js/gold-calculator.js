// ---------- Configuration ----------
const XAUUSD_CONFIG = {
  contractSize: 100, // oz per standard lot
  pipSize: 0.01,
  currency: "USD",
};

// ---------- Pure calculation engine ----------
function toNumber(value) {
  if (value === "" || value === null || value === undefined) return NaN;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function calculatePipsFromDelta(absoluteDelta) {
  return absoluteDelta / XAUUSD_CONFIG.pipSize;
}

function calculateDollarValue(delta, lotSize) {
  return delta * XAUUSD_CONFIG.contractSize * lotSize;
}

function calculateValuePerPip(lotSize) {
  return XAUUSD_CONFIG.pipSize * XAUUSD_CONFIG.contractSize * lotSize;
}

function calculateTargetPrice(entryPrice, priceMovement, direction) {
  return direction === "buy"
    ? entryPrice + priceMovement
    : entryPrice - priceMovement;
}

function calculateProfitLoss(entryPrice, exitPrice, lotSize, direction) {
  const directional =
    direction === "buy" ? exitPrice - entryPrice : entryPrice - exitPrice;
  return calculateDollarValue(directional, lotSize);
}

// Mode A: entry + exit -> everything
function calculateFromPrice({ entryPrice, exitPrice, lotSize, direction }) {
  const rawDelta = exitPrice - entryPrice;
  const absoluteDelta = Math.abs(rawDelta);
  const pips = calculatePipsFromDelta(absoluteDelta);
  const profitLoss = calculateProfitLoss(entryPrice, exitPrice, lotSize, direction);
  return {
    rawDelta,
    absoluteDelta,
    pips,
    targetPrice: exitPrice,
    profitLoss,
    valuePerPip: calculateValuePerPip(lotSize),
  };
}

// Mode B: entry + pips -> exit + pnl
function calculateFromPips({ entryPrice, pips, lotSize, direction }) {
  const priceMovement = Math.abs(pips) * XAUUSD_CONFIG.pipSize;
  const targetPrice = calculateTargetPrice(entryPrice, priceMovement, direction);
  const rawDelta = targetPrice - entryPrice;
  const profitLoss = calculateDollarValue(priceMovement, lotSize) * (pips < 0 ? -1 : 1);
  return {
    rawDelta,
    absoluteDelta: priceMovement,
    pips: Math.abs(pips),
    targetPrice,
    profitLoss,
    valuePerPip: calculateValuePerPip(lotSize),
  };
}

// Mode C: entry + dollar target -> pips + exit
function calculateFromDollarAmount({ entryPrice, dollarAmount, lotSize, direction }) {
  if (lotSize === 0) {
    return null; // caller validates lotSize > 0 beforehand
  }
  const priceMovement = Math.abs(dollarAmount) / (XAUUSD_CONFIG.contractSize * lotSize);
  const pips = calculatePipsFromDelta(priceMovement);
  const targetPrice = calculateTargetPrice(entryPrice, priceMovement, direction);
  const rawDelta = targetPrice - entryPrice;
  const profitLoss = dollarAmount;
  return {
    rawDelta,
    absoluteDelta: priceMovement,
    pips,
    targetPrice,
    profitLoss,
    valuePerPip: calculateValuePerPip(lotSize),
  };
}

// ---------- Formatting ----------
function formatCurrency(value) {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  return `${sign}$${abs.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatSignedCurrency(value) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  const abs = Math.abs(value);
  return `${sign}$${abs.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPips(value) {
  return `${Math.round(value).toLocaleString()} pips`;
}

function formatPrice(value) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDelta(value) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ---------- UI state ----------
let mode = "price"; // price | pips | dollar
let direction = "buy"; // buy | sell

const el = {
  modeBtns: document.querySelectorAll(".mode-btn"),
  dirBtns: document.querySelectorAll(".dir-btn"),
  entryPrice: document.getElementById("entryPrice"),
  exitPrice: document.getElementById("exitPrice"),
  exitPriceGroup: document.getElementById("exitPriceGroup"),
  pipsInput: document.getElementById("pipsInput"),
  pipsGroup: document.getElementById("pipsGroup"),
  dollarInput: document.getElementById("dollarInput"),
  dollarGroup: document.getElementById("dollarGroup"),
  lotSize: document.getElementById("lotSize"),
  quickLots: document.querySelectorAll(".quick-lot"),
  resetBtn: document.getElementById("resetBtn"),
  errorMsg: document.getElementById("errorMsg"),

  outDelta: document.getElementById("outDelta"),
  outPips: document.getElementById("outPips"),
  outFlowPnl: document.getElementById("outFlowPnl"),
  pnlBox: document.getElementById("pnlBox"),
  outPnl: document.getElementById("outPnl"),
  outTarget: document.getElementById("outTarget"),
  outValuePerPip: document.getElementById("outValuePerPip"),
  outAbsDelta: document.getElementById("outAbsDelta"),
  outRawDelta: document.getElementById("outRawDelta"),

  stopPrice: document.getElementById("stopPrice"),
  tpPrice: document.getElementById("tpPrice"),
  rrSection: document.getElementById("rrSection"),
  rrRisk: document.getElementById("rrRisk"),
  rrReward: document.getElementById("rrReward"),
  rrRatio: document.getElementById("rrRatio"),
};

const DEFAULTS = {
  entryPrice: "3300.00",
  exitPrice: "3305.00",
  pipsInput: "500",
  dollarInput: "100",
  lotSize: "0.10",
};

function setMode(newMode) {
  mode = newMode;
  el.modeBtns.forEach((btn) => btn.classList.toggle("active", btn.dataset.mode === newMode));
  el.exitPriceGroup.style.display = newMode === "price" ? "grid" : "none";
  el.pipsGroup.style.display = newMode === "pips" ? "grid" : "none";
  el.dollarGroup.style.display = newMode === "dollar" ? "grid" : "none";
  recalculate();
}

function setDirection(newDir) {
  direction = newDir;
  el.dirBtns.forEach((btn) => btn.classList.toggle("active", btn.dataset.dir === newDir));
  recalculate();
}

function showError(message) {
  el.errorMsg.textContent = message;
  el.errorMsg.style.display = "block";
}

function hideError() {
  el.errorMsg.style.display = "none";
}

function recalculate() {
  hideError();

  const entryPrice = toNumber(el.entryPrice.value);
  const lotSize = toNumber(el.lotSize.value);

  if (!Number.isFinite(entryPrice)) {
    showError("Enter a valid entry price.");
    return;
  }
  if (!Number.isFinite(lotSize) || lotSize <= 0) {
    showError("Enter a valid lot size greater than zero.");
    return;
  }

  let result = null;

  if (mode === "price") {
    const exitPrice = toNumber(el.exitPrice.value);
    if (!Number.isFinite(exitPrice)) {
      showError("Enter an entry price and either an exit price, pip value, or dollar amount.");
      return;
    }
    result = calculateFromPrice({ entryPrice, exitPrice, lotSize, direction });
  } else if (mode === "pips") {
    const pips = toNumber(el.pipsInput.value);
    if (!Number.isFinite(pips) || pips < 0) {
      showError("Enter a valid (non-negative) pip value.");
      return;
    }
    result = calculateFromPips({ entryPrice, pips, lotSize, direction });
  } else if (mode === "dollar") {
    const dollarAmount = toNumber(el.dollarInput.value);
    if (!Number.isFinite(dollarAmount)) {
      showError("Enter a valid dollar amount.");
      return;
    }
    result = calculateFromDollarAmount({ entryPrice, dollarAmount, lotSize, direction });
  }

  if (!result) {
    showError("Unable to calculate. Check your inputs.");
    return;
  }

  renderResults(result);
  renderRiskReward({ entryPrice, lotSize });
}

function renderResults(result) {
  el.outDelta.textContent = formatDelta(result.rawDelta);
  el.outPips.textContent = formatPips(result.pips);
  el.outFlowPnl.textContent = formatSignedCurrency(result.profitLoss);
  el.outPnl.textContent = formatSignedCurrency(result.profitLoss);
  el.pnlBox.classList.toggle("negative", result.profitLoss < 0);
  el.outTarget.textContent = formatPrice(result.targetPrice);
  el.outValuePerPip.textContent = `${formatCurrency(result.valuePerPip)}/pip`;
  el.outAbsDelta.textContent = formatPrice(result.absoluteDelta);
  el.outRawDelta.textContent = formatDelta(result.rawDelta);
}

function renderRiskReward({ entryPrice, lotSize }) {
  const stop = toNumber(el.stopPrice.value);
  const tp = toNumber(el.tpPrice.value);

  if (!Number.isFinite(stop) || !Number.isFinite(tp)) {
    el.rrSection.style.display = "none";
    return;
  }

  const riskDelta = Math.abs(entryPrice - stop);
  const rewardDelta = Math.abs(tp - entryPrice);
  const riskPips = calculatePipsFromDelta(riskDelta);
  const rewardPips = calculatePipsFromDelta(rewardDelta);
  const riskDollar = calculateDollarValue(riskDelta, lotSize);
  const rewardDollar = calculateDollarValue(rewardDelta, lotSize);

  el.rrSection.style.display = "block";
  el.rrRisk.textContent = `${formatPips(riskPips)} / ${formatCurrency(riskDollar)}`;
  el.rrReward.textContent = `${formatPips(rewardPips)} / ${formatCurrency(rewardDollar)}`;

  if (riskDollar > 0) {
    const ratio = rewardDollar / riskDollar;
    el.rrRatio.textContent = `1 : ${ratio.toFixed(2)}`;
  } else {
    el.rrRatio.textContent = "—";
  }
}

function resetAll() {
  el.entryPrice.value = DEFAULTS.entryPrice;
  el.exitPrice.value = DEFAULTS.exitPrice;
  el.pipsInput.value = DEFAULTS.pipsInput;
  el.dollarInput.value = DEFAULTS.dollarInput;
  el.lotSize.value = DEFAULTS.lotSize;
  el.stopPrice.value = "";
  el.tpPrice.value = "";
  setDirection("buy");
  setMode("price");
}

// ---------- Event wiring ----------
el.modeBtns.forEach((btn) => btn.addEventListener("click", () => setMode(btn.dataset.mode)));
el.dirBtns.forEach((btn) => btn.addEventListener("click", () => setDirection(btn.dataset.dir)));
el.quickLots.forEach((btn) =>
  btn.addEventListener("click", () => {
    el.lotSize.value = btn.dataset.lot;
    recalculate();
  }),
);
[
  el.entryPrice,
  el.exitPrice,
  el.pipsInput,
  el.dollarInput,
  el.lotSize,
  el.stopPrice,
  el.tpPrice,
].forEach((input) => {
  input.addEventListener("input", recalculate);
});
el.resetBtn.addEventListener("click", resetAll);

// ---------- Init ----------
recalculate();
