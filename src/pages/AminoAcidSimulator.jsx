import { aminoAcids } from "../data/aminoacids.js";
import { calculateIsoelectricPoint, calculateSpeciation, getSpeciesLabels } from "../utils/speciation.js";

const colors = ["#1a5faa", "#c04830", "#2a8a2a", "#8a56ac"];
const padding = { top: 26, right: 24, bottom: 42, left: 54 };
let selectedKey = "glycine";
let selectedPh = 7.0;

const root = document.getElementById("app");

root.innerHTML = `
  <header id="topbar">
    <h1>Amino Acid Speciation Simulator</h1>
    <span class="sub">Relative acid-base species distribution vs pH</span>
    <span class="spacer"></span>
    <a href="../index.html">Home</a>
  </header>
  <aside id="panel">
    <p class="section-hdr">Amino acid</p>
    <div class="ctrl">
      <label for="aminoAcid"><span class="lname">Compound</span></label>
      <select id="aminoAcid"></select>
      <p class="hint">20 standard amino acids plus selected peptides.</p>
    </div>
    <p class="section-hdr">pKa values</p>
    <div id="pkaList" class="pka-list"></div>
    <p class="section-hdr">pH probe</p>
    <div class="ctrl">
      <label for="phSlider"><span class="lname">pH</span><span class="lval" id="phValue">7.0</span></label>
      <input id="phSlider" type="range" min="0" max="14" step="0.1" value="7.0">
      <p class="hint">Move to inspect species percentages at a selected pH.</p>
    </div>
    <div id="speciesReadout" class="species-list"></div>
  </aside>
  <main id="workspace">
    <section id="stats"></section>
    <section class="chart-wrap">
      <canvas id="speciationChart"></canvas>
    </section>
  </main>
`;

const select = document.getElementById("aminoAcid");
select.innerHTML = Object.entries(aminoAcids)
  .map(([key, aminoAcid]) => `<option value="${key}">${aminoAcid.name}</option>`)
  .join("");
select.value = selectedKey;
select.addEventListener("change", () => {
  selectedKey = select.value;
  render();
});

const phSlider = document.getElementById("phSlider");
phSlider.addEventListener("input", () => {
  selectedPh = Number(phSlider.value);
  render();
});

window.addEventListener("resize", render);
render();

function render() {
  const aminoAcid = aminoAcids[selectedKey];
  const points = calculateSpeciation(aminoAcid);
  const labels = getSpeciesLabels(aminoAcid);
  const pI = calculateIsoelectricPoint(aminoAcid);

  const selectedPoint = points[Math.round(selectedPh * 10)];

  renderStats(aminoAcid, pI, selectedPoint);
  renderPkaList(aminoAcid);
  renderSpeciesReadout(labels, selectedPoint);
  drawChart(points, labels, aminoAcid, pI, selectedPh);
}

function renderStats(aminoAcid, pI, selectedPoint) {
  document.getElementById("stats").innerHTML = `
    <div class="stat"><div class="sval">${aminoAcid.name}</div><div class="slabel">Selected compound</div></div>
    <div class="stat"><div class="sval">${pI.toFixed(2)}</div><div class="slabel">Isoelectric point</div></div>
    <div class="stat"><div class="sval">${selectedPoint.pH.toFixed(1)}</div><div class="slabel">Probe pH</div></div>
    <div class="stat"><div class="sval">${aminoAcid.pKaR === null ? "2" : "3"}</div><div class="slabel">Ionizable groups</div></div>
  `;
}

function renderPkaList(aminoAcid) {
  const values = [
    ["pKa1", aminoAcid.pKa1],
    ["pKa2", aminoAcid.pKa2],
    ["pKaR", aminoAcid.pKaR]
  ].filter(([, value]) => value !== null);

  document.getElementById("pkaList").innerHTML = values
    .map(([label, value]) => `<div class="pka-row"><span>${label}</span><strong>${value.toFixed(2)}</strong></div>`)
    .join("");
}

function renderSpeciesReadout(labels, selectedPoint) {
  document.getElementById("phValue").textContent = selectedPoint.pH.toFixed(1);
  document.getElementById("speciesReadout").innerHTML = labels
    .map((label, index) => `
      <div class="species-row">
        <span><i style="background:${colors[index]}"></i>${label}</span>
        <strong>${(selectedPoint.species[index] * 100).toFixed(1)}%</strong>
      </div>
    `)
    .join("");
}

function drawChart(points, labels, aminoAcid, pI, probePh) {
  const canvas = document.getElementById("speciationChart");
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const plot = {
    x: padding.left,
    y: padding.top,
    w: rect.width - padding.left - padding.right,
    h: rect.height - padding.top - padding.bottom
  };

  drawGrid(ctx, plot);
  drawPkaMarkers(ctx, plot, aminoAcid);
  drawIsoelectricMarker(ctx, plot, pI);
  drawProbeMarker(ctx, plot, probePh);
  drawSeries(ctx, plot, points, labels);
  drawAxes(ctx, plot);
  drawLegend(ctx, labels, plot);
}

function drawGrid(ctx, plot) {
  ctx.strokeStyle = "#e0e0dc";
  ctx.lineWidth = 1;
  ctx.font = "11px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.fillStyle = "#666";

  for (let pH = 0; pH <= 14; pH += 2) {
    const x = xForPh(pH, plot);
    ctx.beginPath();
    ctx.moveTo(x, plot.y);
    ctx.lineTo(x, plot.y + plot.h);
    ctx.stroke();
    ctx.fillText(pH.toString(), x - 4, plot.y + plot.h + 18);
  }

  for (let fraction = 0; fraction <= 1.001; fraction += 0.25) {
    const y = yForFraction(fraction, plot);
    ctx.beginPath();
    ctx.moveTo(plot.x, y);
    ctx.lineTo(plot.x + plot.w, y);
    ctx.stroke();
    ctx.fillText(fraction.toFixed(2), 12, y + 4);
  }
}

function drawPkaMarkers(ctx, plot, aminoAcid) {
  [["pKa1", aminoAcid.pKa1], ["pKa2", aminoAcid.pKa2], ["pKaR", aminoAcid.pKaR]]
    .filter(([, value]) => value !== null)
    .forEach(([label, value], index) => {
      const x = xForPh(value, plot);
      ctx.strokeStyle = "rgba(26, 95, 170, 0.35)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, plot.y);
      ctx.lineTo(x, plot.y + plot.h);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#1a5faa";
      ctx.fillText(`${label} ${value.toFixed(2)}`, x + 4, plot.y + 14 + index * 14);
    });
}

function drawIsoelectricMarker(ctx, plot, pI) {
  const x = xForPh(pI, plot);
  ctx.strokeStyle = "rgba(192, 72, 48, 0.55)";
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.moveTo(x, plot.y);
  ctx.lineTo(x, plot.y + plot.h);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#c04830";
  ctx.fillText(`pI ${pI.toFixed(2)}`, x + 4, plot.y + plot.h - 8);
}

function drawProbeMarker(ctx, plot, probePh) {
  const x = xForPh(probePh, plot);
  ctx.strokeStyle = "rgba(28, 28, 28, 0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, plot.y);
  ctx.lineTo(x, plot.y + plot.h);
  ctx.stroke();
}

function drawSeries(ctx, plot, points, labels) {
  labels.forEach((label, speciesIndex) => {
    ctx.strokeStyle = colors[speciesIndex];
    ctx.lineWidth = 2;
    ctx.beginPath();

    points.forEach((point, pointIndex) => {
      const x = xForPh(point.pH, plot);
      const y = yForFraction(point.species[speciesIndex], plot);

      if (pointIndex === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();
  });
}

function drawAxes(ctx, plot) {
  ctx.strokeStyle = "#1c1c1c";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(plot.x, plot.y);
  ctx.lineTo(plot.x, plot.y + plot.h);
  ctx.lineTo(plot.x + plot.w, plot.y + plot.h);
  ctx.stroke();

  ctx.fillStyle = "#1c1c1c";
  ctx.font = "12px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.fillText("pH", plot.x + plot.w / 2 - 8, plot.y + plot.h + 34);
  ctx.save();
  ctx.translate(16, plot.y + plot.h / 2 + 46);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Relative fraction", 0, 0);
  ctx.restore();
}

function drawLegend(ctx, labels, plot) {
  let x = plot.x;
  const y = 14;

  labels.forEach((label, index) => {
    ctx.fillStyle = colors[index];
    ctx.fillRect(x, y - 8, 16, 3);
    ctx.fillStyle = "#1c1c1c";
    ctx.fillText(label, x + 22, y - 4);
    x += ctx.measureText(label).width + 58;
  });
}

function xForPh(pH, plot) {
  return plot.x + (pH / 14) * plot.w;
}

function yForFraction(fraction, plot) {
  return plot.y + plot.h - fraction * plot.h;
}
