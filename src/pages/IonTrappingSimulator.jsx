import { ionTrappingCompounds } from "../data/ionTrappingCompounds.js";
import { equilibriumDistribution, ionizedFraction, logD, neutralFraction, trappingCurve } from "../utils/ionTrapping.js";

const root = document.getElementById("app");
const colors = { a: "#1a5faa", b: "#c04830", neutral: "#666", grid: "#e0e0dc", text: "#1c1c1c" };

const scenarios = {
  lidocaineAcidicTissue: {
    name: "Lidocaine — plasma ↔ acidic tissue",
    compound: "lidocaine",
    pHA: 7.4,
    pHB: 6.5,
    volumeA: 1.0,
    volumeB: 1.0,
    note: "Real pharmacological context; pH values are illustrative rather than patient-specific."
  },
  naproxenAlkalineUrine: {
    name: "Naproxen — plasma ↔ alkaline urine",
    compound: "naproxen",
    pHA: 7.4,
    pHB: 8.0,
    volumeA: 1.0,
    volumeB: 1.0,
    note: "Real renal ion-trapping principle; compartment pH values are illustrative."
  },
  amphetamineAcidicUrine: {
    name: "Amphetamine — plasma ↔ acidic urine",
    compound: "amphetamine",
    pHA: 7.4,
    pHB: 5.5,
    volumeA: 1.0,
    volumeB: 1.0,
    note: "Real acid-base principle shown for teaching; not a treatment recommendation."
  },
  syntheticAcid: {
    name: "Synthetic example — weak acid",
    compound: "customAcid",
    pHA: 5.0,
    pHB: 8.0,
    volumeA: 1.0,
    volumeB: 1.0,
    note: "Invented compound and pH gradient. All parameters remain editable."
  },
  syntheticBase: {
    name: "Synthetic example — weak base",
    compound: "customBase",
    pHA: 7.0,
    pHB: 5.0,
    volumeA: 1.0,
    volumeB: 1.0,
    note: "Invented compound and pH gradient. All parameters remain editable."
  }
};

let selectedKey = "lidocaine";
let selectedScenario = "lidocaineAcidicTissue";
let state = {
  type: "base",
  pKa: 7.94,
  logP: 2.30,
  pHA: 7.4,
  pHB: 6.5,
  volumeA: 1.0,
  volumeB: 1.0,
  totalAmount: 100
};

root.innerHTML = `
  <header id="topbar">
    <h1>Ion Trapping Simulator</h1>
    <span class="sub">pH gradients, ionization and equilibrium accumulation</span>
    <span class="spacer"></span>
    <a href="../index.html">Home</a>
  </header>

  <aside id="panel">
    <p class="section-hdr">Example</p>
    <div class="ctrl">
      <label><span class="lname">Scenario</span></label>
      <select id="scenario"></select>
      <p class="hint" id="scenarioNote"></p>
    </div>

    <p class="section-hdr">Compound</p>
    <div class="ctrl">
      <label><span class="lname">Preset</span></label>
      <select id="compound"></select>
      <p class="hint" id="compoundNote"></p>
    </div>

    <p class="section-hdr">Ionization</p>
    <div class="ctrl">
      <label><span class="lname">Type</span></label>
      <select id="type">
        <option value="acid">Weak acid</option>
        <option value="base">Weak base</option>
      </select>
    </div>
    ${slider("pKa", "pKa", 1, 13, 0.05)}
    ${slider("logP", "logP (neutral form)", -2, 6, 0.05)}

    <p class="section-hdr">Compartment A</p>
    ${slider("pHA", "pH A", 0, 14, 0.1)}
    ${slider("volumeA", "Relative volume A", 0.2, 5, 0.1)}

    <p class="section-hdr">Compartment B</p>
    ${slider("pHB", "pH B", 0, 14, 0.1)}
    ${slider("volumeB", "Relative volume B", 0.2, 5, 0.1)}

    <p class="section-hdr">Model</p>
    <div class="equation-box" id="equationBox"></div>
    <p class="hint">Assumes a monoprotic weak acid/base, rapid acid-base equilibrium, only the neutral species freely crosses the membrane, and no active transport or protein binding.</p>
  </aside>

  <main id="workspace">
    <section id="stats"></section>
    <section class="visual-grid">
      <div class="card compartment-card" id="compartments"></div>
      <div class="card chart-card">
        <div class="card-title">Effect of pH in compartment B</div>
        <canvas id="trappingChart"></canvas>
      </div>
    </section>
    <section class="card theory-card" id="readout"></section>
  </main>
`;

function slider(id, label, min, max, step) {
  return `<div class="ctrl">
    <label for="${id}"><span class="lname">${label}</span><span class="lval" id="${id}Value"></span></label>
    <input id="${id}" type="range" min="${min}" max="${max}" step="${step}">
  </div>`;
}

const scenarioSelect = document.getElementById("scenario");
scenarioSelect.innerHTML = Object.entries(scenarios)
  .map(([key, s]) => `<option value="${key}">${s.name}</option>`)
  .join("");
scenarioSelect.value = selectedScenario;
scenarioSelect.addEventListener("change", () => {
  selectedScenario = scenarioSelect.value;
  applyScenario(scenarios[selectedScenario]);
});

const compoundSelect = document.getElementById("compound");
compoundSelect.innerHTML = Object.entries(ionTrappingCompounds)
  .map(([key, c]) => `<option value="${key}">${c.name}${c.real ? "" : " — editable"}</option>`)
  .join("");
compoundSelect.value = selectedKey;
compoundSelect.addEventListener("change", () => {
  selectedKey = compoundSelect.value;
  const c = ionTrappingCompounds[selectedKey];
  state.type = c.type;
  state.pKa = c.pKa;
  state.logP = c.logP;
  syncControls();
  render();
});

["type", "pKa", "logP", "pHA", "pHB", "volumeA", "volumeB"].forEach(id => {
  document.getElementById(id).addEventListener("input", event => {
    state[id] = id === "type" ? event.target.value : Number(event.target.value);
    render();
  });
});

window.addEventListener("resize", render);
syncControls();
render();

function applyScenario(scenario) {
  selectedKey = scenario.compound;
  const compound = ionTrappingCompounds[selectedKey];
  state.type = compound.type;
  state.pKa = compound.pKa;
  state.logP = compound.logP;
  state.pHA = scenario.pHA;
  state.pHB = scenario.pHB;
  state.volumeA = scenario.volumeA;
  state.volumeB = scenario.volumeB;
  compoundSelect.value = selectedKey;
  syncControls();
  render();
}

function syncControls() {
  Object.entries(state).forEach(([key, value]) => {
    const el = document.getElementById(key);
    if (el) el.value = value;
  });
}

function render() {
  const preset = ionTrappingCompounds[selectedKey];
  const scenario = scenarios[selectedScenario];
  const eq = equilibriumDistribution(state);
  const neutralA = neutralFraction(state.type, state.pHA, state.pKa);
  const neutralB = neutralFraction(state.type, state.pHB, state.pKa);
  const ionA = ionizedFraction(state.type, state.pHA, state.pKa);
  const ionB = ionizedFraction(state.type, state.pHB, state.pKa);
  const logDA = logD(state.type, state.pHA, state.pKa, state.logP);
  const logDB = logD(state.type, state.pHB, state.pKa, state.logP);

  document.getElementById("scenarioNote").textContent = scenario.note;
  document.getElementById("compoundNote").textContent = preset.note;
  document.getElementById("type").value = state.type;
  ["pKa", "logP", "pHA", "pHB", "volumeA", "volumeB"].forEach(id => {
    document.getElementById(`${id}Value`).textContent = formatControl(id, state[id]);
  });

  const trapped = eq.ratioBA > 1.001 ? "B" : eq.ratioBA < 0.999 ? "A" : "Neither";
  document.getElementById("stats").innerHTML = `
    <div class="stat"><div class="sval">${formatRatio(eq.ratioBA)}</div><div class="slabel">C total B / A</div></div>
    <div class="stat"><div class="sval">${(eq.fractionAmountB * 100).toFixed(1)}%</div><div class="slabel">Amount in B</div></div>
    <div class="stat"><div class="sval">${trapped}</div><div class="slabel">Favored compartment</div></div>
    <div class="stat"><div class="sval">${state.type === "acid" ? "Acid" : "Base"}</div><div class="slabel">Ionization type</div></div>
  `;

  renderEquation();
  renderCompartments({ neutralA, neutralB, ionA, ionB, logDA, logDB, eq });
  renderReadout({ neutralA, neutralB, ionA, ionB, logDA, logDB, eq });
  drawChart(trappingCurve(state));
}

function renderEquation() {
  const expression = state.type === "acid"
    ? "F = 1 + 10^(pH − pKa)"
    : "F = 1 + 10^(pKa − pH)";
  document.getElementById("equationBox").innerHTML = `
    <div><strong>${expression}</strong></div>
    <div>C<sub>B</sub>/C<sub>A</sub> = F<sub>B</sub>/F<sub>A</sub></div>
    <div>f<sub>neutral</sub> = 1/F</div>
  `;
}

function renderCompartments({ neutralA, neutralB, ionA, ionB, logDA, logDB, eq }) {
  const arrow = eq.ratioBA > 1.05 ? "A → B" : eq.ratioBA < 0.95 ? "B → A" : "A ⇄ B";
  document.getElementById("compartments").innerHTML = `
    <div class="card-title">Two-compartment equilibrium</div>
    <div class="compartment-wrap">
      ${compartment("A", state.pHA, neutralA, ionA, logDA, eq.fractionAmountA, colors.a)}
      <div class="membrane">
        <span class="membrane-label">membrane</span>
        <span class="flow">${arrow}</span>
        <span class="membrane-note">neutral species crosses</span>
      </div>
      ${compartment("B", state.pHB, neutralB, ionB, logDB, eq.fractionAmountB, colors.b)}
    </div>
  `;
}

function compartment(label, pH, neutral, ionized, logDValue, amountFraction, color) {
  return `<div class="compartment">
    <div class="compartment-head"><strong>Compartment ${label}</strong><span>pH ${pH.toFixed(1)}</span></div>
    <div class="bar"><span style="width:${neutral * 100}%;background:${color}"></span></div>
    <div class="metric"><span>Neutral</span><strong>${(neutral * 100).toFixed(2)}%</strong></div>
    <div class="metric"><span>Ionized</span><strong>${(ionized * 100).toFixed(2)}%</strong></div>
    <div class="metric"><span>Estimated logD</span><strong>${logDValue.toFixed(2)}</strong></div>
    <div class="metric"><span>Total amount</span><strong>${(amountFraction * 100).toFixed(1)}%</strong></div>
  </div>`;
}

function renderReadout({ neutralA, neutralB, logDA, logDB, eq }) {
  const direction = eq.ratioBA > 1.001
    ? "The total concentration is higher in B because the neutral form becomes more ionized there."
    : eq.ratioBA < 0.999
      ? "The total concentration is higher in A because the neutral form becomes more ionized there."
      : "There is essentially no pH-driven concentration gradient.";

  const typeRule = state.type === "acid"
    ? "Weak acids become more ionized as pH rises, so they are trapped preferentially in the more alkaline compartment."
    : "Weak bases become more ionized as pH falls, so they are trapped preferentially in the more acidic compartment.";

  document.getElementById("readout").innerHTML = `
    <div class="card-title">Interpretation</div>
    <div class="readout-grid">
      <div><span class="rlabel">Rule</span><p>${typeRule}</p></div>
      <div><span class="rlabel">Current result</span><p>${direction} Ratio B/A = <strong>${formatRatio(eq.ratioBA)}</strong>.</p></div>
      <div><span class="rlabel">Neutral fractions</span><p>A: ${(neutralA * 100).toFixed(2)}% · B: ${(neutralB * 100).toFixed(2)}%</p></div>
      <div><span class="rlabel">Lipophilicity</span><p>logP = ${state.logP.toFixed(2)}; estimated logD: A ${logDA.toFixed(2)}, B ${logDB.toFixed(2)}.</p></div>
    </div>
  `;
}

function drawChart(points) {
  const canvas = document.getElementById("trappingChart");
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, rect.width * dpr);
  canvas.height = Math.max(1, rect.height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const pad = { left: 54, right: 22, top: 22, bottom: 38 };
  const plot = { x: pad.left, y: pad.top, w: rect.width - pad.left - pad.right, h: rect.height - pad.top - pad.bottom };
  if (plot.w <= 0 || plot.h <= 0) return;

  const values = points.map(p => p.logRatioBA).concat([0]);
  let yMin = Math.min(...values);
  let yMax = Math.max(...values);
  const span = Math.max(1, yMax - yMin);
  yMin = Math.floor(yMin - span * 0.08);
  yMax = Math.ceil(yMax + span * 0.08);
  if (yMin === yMax) { yMin -= 1; yMax += 1; }

  ctx.font = "11px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.strokeStyle = colors.grid;
  ctx.fillStyle = "#666";
  for (let pH = 0; pH <= 14; pH += 2) {
    const x = plot.x + (pH / 14) * plot.w;
    ctx.beginPath(); ctx.moveTo(x, plot.y); ctx.lineTo(x, plot.y + plot.h); ctx.stroke();
    ctx.fillText(String(pH), x - 4, plot.y + plot.h + 18);
  }
  for (let i = 0; i <= 4; i++) {
    const v = yMin + ((yMax - yMin) * i / 4);
    const y = yFor(v, yMin, yMax, plot);
    ctx.beginPath(); ctx.moveTo(plot.x, y); ctx.lineTo(plot.x + plot.w, y); ctx.stroke();
    ctx.fillText(v.toFixed(1), 12, y + 4);
  }

  const zeroY = yFor(0, yMin, yMax, plot);
  ctx.strokeStyle = "#999";
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(plot.x, zeroY); ctx.lineTo(plot.x + plot.w, zeroY); ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = colors.b;
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = plot.x + (p.pHB / 14) * plot.w;
    const y = yFor(p.logRatioBA, yMin, yMax, plot);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  const probe = equilibriumDistribution(state).logRatioBA;
  const px = plot.x + (state.pHB / 14) * plot.w;
  const py = yFor(probe, yMin, yMax, plot);
  ctx.fillStyle = colors.text;
  ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = colors.text;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(plot.x, plot.y); ctx.lineTo(plot.x, plot.y + plot.h); ctx.lineTo(plot.x + plot.w, plot.y + plot.h); ctx.stroke();

  ctx.fillStyle = colors.text;
  ctx.fillText("pH B", plot.x + plot.w / 2 - 12, plot.y + plot.h + 32);
  ctx.save();
  ctx.translate(15, plot.y + plot.h / 2 + 40);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("log10(CB / CA)", 0, 0);
  ctx.restore();
}

function yFor(value, min, max, plot) {
  return plot.y + plot.h - ((value - min) / (max - min)) * plot.h;
}

function formatControl(id, value) {
  if (id === "pKa" || id === "logP") return value.toFixed(2);
  if (id === "pHA" || id === "pHB" || id === "volumeA" || id === "volumeB") return value.toFixed(1);
  return String(value);
}

function formatRatio(ratio) {
  if (!Number.isFinite(ratio)) return "∞";
  if (ratio >= 1000 || ratio < 0.001) return ratio.toExponential(2);
  if (ratio >= 10) return ratio.toFixed(1);
  return ratio.toFixed(2);
}
