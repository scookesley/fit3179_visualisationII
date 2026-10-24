/* Loads every <div class="chart" data-spec="..."> with vega-embed.
 *
 *  - Shared look & feel lives in THEME below (applied to every chart).
 *  - Add ?dev to the URL to show each spec's TODO list above its chart.
 *  - A .view-toggle switches between two charts in one card (see setupViewToggles).
 *  - The species dropdown sets the `species_sel` parameter in any spec that declares it.
 */

const DEV = new URLSearchParams(location.search).has("dev");

// Must match the common names written by scripts/fetch_ala.py
const SPECIES = [
  "Humpback Whale",
  "Green Turtle",
  "White Shark",
  "Eastern Blue Groper",
  "Giant Australian Cuttlefish"
];

// Colours match the ridgeline (THEME.range.category, in the order the species appear there)
const SPECIES_INFO = {
  "Humpback Whale":              { colour: "#81b29a", image: "images/humpback_whale.jpg" },
  "Green Turtle":                { colour: "#3d5a80", image: "images/green_turtle.jpg" },
  "White Shark":                 { colour: "#f2cc8f", image: "images/great_white.jpg" },
  "Eastern Blue Groper":         { colour: "#0e7c86", image: "images/eastern_blue_groper.jpg" },
  "Giant Australian Cuttlefish": { colour: "#e07a5f", image: "images/giant_cuttlefish.jpg" }
};

function applySpeciesPanel(name) {
  const info = SPECIES_INFO[name];
  if (!info) return;
  document.getElementById("species-panel").style.setProperty("--sp", info.colour);
  const img = document.getElementById("species-photo");
  img.style.display = "";
  img.onerror = () => { img.style.display = "none"; };   // fall back to the gradient placeholder
  img.src = info.image;
  img.alt = name;
  document.getElementById("species-desc").textContent =
    `[Placeholder: two or three sentences about the ${name.toLowerCase()}, where it lives and why it matters for Australia's marine parks.]`;
}

const THEME = {
  background: null,
  font: "Inter, 'Segoe UI', system-ui, sans-serif",
  title: { anchor: "start", fontSize: 18, fontWeight: 600, color: "#0C616E", subtitleColor: "#6b7f8c", subtitleFontSize: 12 },
  axis: {
    labelColor: "#3d4f5c", titleColor: "#3d4f5c", labelFontSize: 11, titleFontSize: 12,
    gridColor: "#e3ebef", domainColor: "#9fb3bf", tickColor: "#9fb3bf"
  },
  legend: { labelColor: "#3d4f5c", titleColor: "#3d4f5c", labelFontSize: 11, titleFontSize: 12 },
  view: { stroke: null },
  range: {
    category: ["#0e7c86", "#e07a5f", "#3d5a80", "#81b29a", "#f2cc8f", "#6d597a", "#b56576", "#355070"]
  }
};

const views = [];   // { view, el } for every successfully embedded chart

async function embedChart(el) {
  const url = el.dataset.spec;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not load spec (${res.status})`);
    const text = await res.text();
    const spec = JSON.parse(text);

    if (DEV && spec.usermeta && spec.usermeta.todo) {
      const panel = document.createElement("div");
      panel.className = "todo-panel";
      panel.innerHTML = `<strong>TODO · ${url}</strong><ul>${spec.usermeta.todo.map(t => `<li>${t}</li>`).join("")}</ul>`;
      el.before(panel);
    }

    const target = document.createElement("div");
    el.appendChild(target);

    const result = await vegaEmbed(target, spec, {
      config: THEME,
      actions: { export: true, source: false, compiled: false, editor: false },
      renderer: "svg"
    });
    views.push({ view: result.view, el });
    const sel = document.getElementById("species-select");
    if (sel) { try { result.view.signal("species_sel", sel.value).run(); } catch (_) {} }
    const stage = el.closest(".globe-stage");
    if (stage) document.fonts.ready.then(() => drawGlobeLeaders(stage, spec));

    // "View Vega-Lite spec" disclosure (nice for markers; delete if you don't want it)
    const details = document.createElement("details");
    details.className = "spec-view";
    details.innerHTML = "<summary>View Vega-Lite spec</summary><pre></pre>";
    details.querySelector("pre").textContent = JSON.stringify(spec, null, 2);
    el.appendChild(details);

    return result.view;
  } catch (err) {
    console.error(url, err);
    el.innerHTML = `<div class="chart-error"><strong>This chart could not be drawn.</strong><br>
      <code>${url}</code>: ${err.message}<br>
      Most likely a data file in <code>data/</code> is missing or a field name does not match. Check the browser console and the README.</div>`;
    return null;
  }
}

function setupSpeciesControl() {
  const select = document.getElementById("species-select");
  if (!select) return;
  select.innerHTML = SPECIES.map(s => `<option>${s}</option>`).join("");
  applySpeciesPanel(select.value);
  select.addEventListener("change", () => {
    applySpeciesPanel(select.value);
    views.forEach(({ view }) => {
      try { view.signal("species_sel", select.value).run(); } catch (_) { /* spec has no species_sel */ }
    });
  });
}

// A .view-toggle holds buttons with data-view="<id of a .chart in the same card>".
// Clicking one shows that chart and hides the other charts the toggle controls.
function setupViewToggles() {
  document.querySelectorAll(".view-toggle").forEach(toggle => {
    const buttons = [...toggle.querySelectorAll("button[data-view]")];
    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        buttons.forEach(b => {
          const on = b === btn;
          b.setAttribute("aria-pressed", on);
          document.getElementById(b.dataset.view).hidden = !on;
        });
      });
    });
  });
}
/* Leader lines: every element inside .globe-stage with data-lon / data-lat gets a line from its
   nearest edge to that point on the globe. Positions come from the spec's own projection and
   padding, so they follow any change to scale / translate / rotate (rotate's roll is ignored). */
function drawGlobeLeaders(stage, spec) {
  const { rotate, scale, translate } = spec.projection;
  const pad = spec.padding;
  const padL = typeof pad === "number" ? pad : (pad && pad.left) || 0;
  const padT = typeof pad === "number" ? pad : (pad && pad.top) || 0;
  const rad = Math.PI / 180;
  const lon0 = -rotate[0] * rad, lat0 = -rotate[1] * rad;      // centre of the view

  const project = (lon, lat) => {
    const dl = lon * rad - lon0, p = lat * rad;
    const x = Math.cos(p) * Math.sin(dl);
    const y = Math.cos(lat0) * Math.sin(p) - Math.sin(lat0) * Math.cos(p) * Math.cos(dl);
    return [padL + translate[0] + scale * x, padT + translate[1] - scale * y];
  };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const NS = "http://www.w3.org/2000/svg";
  stage.querySelector(".globe-leaders")?.remove();
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "globe-leaders");
  svg.setAttribute("width", stage.offsetWidth);
  svg.setAttribute("height", stage.offsetHeight);
  stage.appendChild(svg);

  const box = stage.getBoundingClientRect();
  const inset = 16;                                            // keep lines off the corners

  stage.querySelectorAll("[data-lon][data-lat]").forEach(el => {
    const r = el.getBoundingClientRect();
    const left = r.left - box.left, right = r.right - box.left;
    const top = r.top - box.top, bottom = r.bottom - box.top;
    const [tx, ty] = project(+el.dataset.lon, +el.dataset.lat);

    // nearest point on the element's edge
    const dx = tx < left ? left - tx : tx > right ? tx - right : 0;
    const dy = ty < top ? top - ty : ty > bottom ? ty - bottom : 0;
    let ax, ay;
    if (dx >= dy) { ax = tx < left ? left : right; ay = clamp(ty, top + inset, bottom - inset); }
    else          { ay = ty < top ? top : bottom;  ax = clamp(tx, left + inset, right - inset); }

    ["halo", "core"].forEach(cls => {                          // white halo keeps it legible over the map
      const line = document.createElementNS(NS, "line");
      line.setAttribute("class", cls);
      line.setAttribute("x1", ax); line.setAttribute("y1", ay);
      line.setAttribute("x2", tx); line.setAttribute("y2", ty);
      svg.appendChild(line);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupSpeciesControl();
  setupViewToggles();
  document.querySelectorAll(".chart[data-spec]").forEach(embedChart);
});
