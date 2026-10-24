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
  select.addEventListener("change", () => {
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

document.addEventListener("DOMContentLoaded", () => {
  setupSpeciesControl();
  setupViewToggles();
  document.querySelectorAll(".chart[data-spec]").forEach(embedChart);
});
