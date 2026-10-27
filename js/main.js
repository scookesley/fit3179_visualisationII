/* Loads every <div class="chart" data-spec="..."> with vega-embed.
 *
 *  - Shared look & feel lives in THEME below (applied to every chart).
 *  - Add ?dev to the URL to show each spec's TODO list above its chart.
 *  - A .view-toggle switches between two charts in one card (see setupViewToggles).
 *  - The species dropdown sets the `species_sel` parameter in any spec that declares it.
 *  - Annotation boxes that change with the species dropdown: see SPECIES_ANNOTATIONS below.
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
  "Humpback Whale":              { colour: "#e7b9d5", image: "images/humpback_whale.jpg",
  description: "Humpback whales are found all over the world's seas and oceans. They are known for their size, distinctive 'humped' shape and unique behaviours, including producing songs to communicate with one another. As a migratory species, they spend only a small portion of the year close to Australian coasts." 
},
  "Green Turtle":                { colour: "#a7b3ce", image: "images/green_turtle.jpg",
  description: "Green sea turtles are also known as black sea turtles, green turtles or Pacific green turtles. Their name comes from the colour of the fat underneath their shell - green due to their seagrass-only diet. This diet draws green turtles to warmer waters containing seagrass habitats. Interestingly, green sea turtles can live to be over 100 years old."
},
  "White Shark":                 { colour: "#c6a9e2", image: "images/great_white.jpg",
  description: "Great white sharks are one of the largest living fish species in the world. In Australia, they are commonly referred to as 'white pointers'. These sharks are highly migratory but tend to be found in Australia's cooler southern and southeastern coastal areas."
},
  "Eastern Blue Groper":         { colour: "#0e7c86", image: "images/blue_groper.jpg",
  description: "Eastern blue gropers are native to southeastern Australia, being found all the way from Hervey Bay in Queensland to Wilson's Promonotory in southern Victoria. In 1998, it was made the official state fish of New South Wales. Males carry the distinctive bright blue colour, while females and juveniles tend to be brown with blue and orange markings."
},
  "Giant Australian Cuttlefish": { colour: "#ffb89a", image: "images/giant_cuttlefish.jpg",
  description: "Giant cuttlefish is the largest cuttlefish species in the world, growing up to 1 metre in length and over 10 kilograms in weight. Giant cuttlefish have special cells that allow them to change colour quickly to blend in with their environment. It's native to Australia's subtropical and temperate waters."
}
};

/* ---------------------------------------------------------------------------------------------
   REUSABLE ANNOTATION BOXES THAT CHANGE WITH THE SPECIES DROPDOWN

   In the HTML, wrap a chart in a stage and give the stage a key:

     <div class="annot-stage" style="--stage-w: 820px" data-annotations="map">
       <div class="chart" data-spec="specs/....json"></div>
     </div>

   Below, each species lists its boxes under that key. Every entry becomes one .map-note box:

     text      the words in the box
     left / right / top / bottom     position in px, measured from the stage's edges (use any two)
     width     optional box width in px (default 220)
     x, y      optional: draws a leader line from the box to this point (px from the stage's top-left)
     lon, lat  optional: leader to a map point (only for specs with a fixed mercator/orthographic projection)
     bar, barX optional: leader to a point on a fixed-size bar chart (see drawGlobeLeaders)

   Add a new chart by choosing a new key (say "heatmap") and adding data-annotations="heatmap" to its
   stage; add a "heatmap" list to each species. A species with no list for a key simply shows no boxes.
   --------------------------------------------------------------------------------------------- */
const SPECIES_ANNOTATIONS = {
  "Humpback Whale": {
    map: [
      {
        text: "Peak sightings in Southern areas occur from September through to October/November. Following calving season, whales move slower during these months as they travel with their newborn offspring, increasing sighting chances",
        left: 760,
        top: 590, 
        width: 210
      },
      {
        text: "Northern sightings peak around June/July, as whales travel north to breed in warmer waters",
        left: -100,
        top: 200,
        width: 215
      }
    ],
    butterfly: [
      { text: "Of all SUAs, Gold Coast in southeastern Queensland received the highest number of local sighting reports", 
        left: 400, top: 380, width: 160, x: 370, y: 518}
    ],
    radial: [
      { text: "Humpback whales migrate slowly south after the winter months, with sightings peaking in September", 
        left: -50, top: 570, width: 140, x: 83, y: 440}
    ]
  },

  "Green Turtle": {
    map: [
      {
        text: "Green Turtles tend towards warmer waters with seagrass habitats",
        left: 790,
        top: 400,
        width: 180
      },
      {
        text: "Sightings are common around Western Australia's Ningaloo Reef, a common tourist destination",
        left: -210,
        top: 260,
        width: 225
      }
    ],
    butterfly: [
      { text: "Despite its relatively small rural population, Gladstone records the highest count of green turtle sightings by far", 
        left: -15, top: 500, width: 160, x: 170, y: 535}
    ],
    radial: [
      { text: "Green turtles see relatively consistent exposure year-round, but sightings have historically peaked in November with 474 total recorded", 
        left: -37, top: 110, width: 190, x: 130, y: 270}
    ]
  },

  "White Shark": {
    map: [
      {
        text: "Port Lincoln on the South Australian peninsula is a hot spot for Great Whites",
        left: 190,
        top: 610,
        width: 220
      },
      {
        text: "Great White sharks tend towards southeastern waters near sea lion and seal colonies",
        left: 760,
        top: 590,
        width: 210
      }
    ],
    butterfly: [
      { text: "", 
      left: 400, top: 380, width: 160, x: 370, y: 204},
      { text: "Sydney and Coffs Harbour are popular surfing destinations along the New South Wales coast, where swimmers and surfers may be likely to spot great whites", 
        left: 380, top: 350, width: 180, x: 370, y: 518}
    ],
    radial: [
      { text: "March has historically been the least common month for great white sightings, with around 80% less reports than the peak month of October", 
        left: 350, top: 570, width: 180, x: 290, y: 380}
    ]
  },

  "Eastern Blue Groper": {
    map: [
      {
        text: "Temperate waters off the New South Wales coast host plenty, with close to 2,000 official sightings recorded in Sydney alone over the years",
        left: 810,
        top: 590,
        width: 200
      },
      {
        text: "Melbourne and its surrounding peninsula beaches are home to many Gropers living in cooler waters",
        left: 330,
        top: 690,
        width: 200
      }
    ],
    butterfly: [
      { text: "Sydney dominates urban sighting locations at over 2,000 recorded sightings over the years", 
        left: 390, top: 215, width: 180, x: 370, y: 204 }
    ],
    radial: [
      { text: "November and December compete for the most popular month in which to spot Eastern blue gropers", 
        left: -20, top: 115, width: 190, x:  175, y: 242 },
      { text: "November and December compete for the most popular month in which to spot Eastern blue gropers", 
        left: -20, top: 115, width: 190, x: 125, y: 274 }
    ]
  },

  "Giant Australian Cuttlefish": {
    map: [
      {
        text: "Whyalla, South Australia, is the site of the world's only known aggregation (mass breeding event) of giant cuttlefish, resulting in huge numbers of cuttlefish to swarm to the area around June/July",
        left: 190,
        top: 610,
        width: 230
      },
      {
        text: "Shark Bay, Western Australia, is home to a diverse set of marine flora and fauna, including a significant population of cuttlefish",
        left: -190,
        top: 490,
        width: 220
      }
    ],
    butterfly: [
      { text: "Geelong has reported historical sightings in rough proportion to its 2025 population", 
        left: -15, top: 470, width: 160, x: 185, y: 568 }
    ],
    radial: [
      { text: "Sightings are most prominent from March through to July, the typical breeding season for Australian cuttlefish.", 
        left: 350, top: 570, width: 180}
    ]
  }
};

// Rebuilds the boxes in every stage that has data-annotations="<key>" for the chosen species.
function updateAnnotations(name) {
  document.querySelectorAll("[data-annotations]").forEach(stage => {
    const list = (SPECIES_ANNOTATIONS[name] || {})[stage.dataset.annotations] || [];

    stage.querySelectorAll(".map-note[data-dyn]").forEach(n => n.remove());

    list.forEach(a => {
      const note = document.createElement("aside");
      note.className = "map-note";
      note.setAttribute("data-dyn", "");
      note.textContent = a.text;

      ["left", "right", "top", "bottom"].forEach(side => {
        if (a[side] !== undefined) note.style[side] = `${a[side]}px`;
      });
      if (a.width !== undefined) note.style.width = `${a.width}px`;

      // optional leader-line target (read by drawGlobeLeaders)
      ["x", "y", "lon", "lat", "bar", "barX"].forEach(k => {
        if (a[k] !== undefined) note.dataset[k] = a[k];
      });

      stage.appendChild(note);
    });

    if (stage._spec) drawGlobeLeaders(stage, stage._spec);   // charts already drawn: refresh the leader lines
  });
}

function applySpeciesPanel(name) {
  const info = SPECIES_INFO[name];
  if (!info) return;
  document.getElementById("species-panel").style.setProperty("--sp", info.colour);
  const img = document.getElementById("species-photo");
  img.style.display = "";
  img.onerror = () => { img.style.display = "none"; };   // fall back to the gradient placeholder
  img.src = info.image;
  img.alt = name;
  document.getElementById("species-desc").textContent = SPECIES_INFO[name].description;
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
    views.push({ view: result.view, el, spec });
    const sel = document.getElementById("species-select");
    if (sel) { try { result.view.signal("species_sel", sel.value).run(); } catch (_) {} }
    const stage = el.closest(".globe-stage, .annot-stage, .ridgeline-stage, .stacked-stage, .choropleth-stage");
    if (stage) {
      stage._spec = spec;                                          // so updateAnnotations can redraw the leaders later
      document.fonts.ready.then(() => drawGlobeLeaders(stage, spec));
    }

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
  updateAnnotations(select.value);

  select.addEventListener("change", () => {
    applySpeciesPanel(select.value);
    updateAnnotations(select.value);

    views.forEach(({ view }) => {
      try {
        view.signal("species_sel", select.value).run();
      } catch (_) {
        // This chart has no species_sel parameter.
      }
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
/* Leader lines: every element inside a stage with a target gets a line from its nearest edge to that
   target. A target is one of:
     data-x / data-y       a point in stage pixels (works for any chart)
     data-lon / data-lat   a map point; positions come from the spec's own projection and padding,
                           so they follow any change to scale / translate / rotate (rotate's roll is ignored)
     data-bar [/ data-bar-x]   a point on a fixed-size bar chart (0..1 up the axis / across the bar)  */
function drawGlobeLeaders(stage, spec) {
  const proj = spec.projection || {};
  const pad = spec.padding;
  const padL = typeof pad === "number" ? pad : (pad && pad.left) || 0;
  const padT = typeof pad === "number" ? pad : (pad && pad.top) || 0;
  const rad = Math.PI / 180;
  const translate = proj.translate || [spec.width / 2, spec.height / 2];

  let project = () => [0, 0];
  if (proj.type === "mercator") {
    const [lc, pc] = proj.center || [0, 0];
    const merc = p => Math.log(Math.tan(Math.PI / 4 + (p * rad) / 2));
    project = (lon, lat) => [
      padL + translate[0] + proj.scale * (lon - lc) * rad,
      padT + translate[1] - proj.scale * (merc(lat) - merc(pc))
    ];
  } else if (proj.rotate) {                                      // orthographic (the globe); rotate's roll is ignored
    const lon0 = -proj.rotate[0] * rad, lat0 = -proj.rotate[1] * rad;
    project = (lon, lat) => {
      const dl = lon * rad - lon0, p = lat * rad;
      const x = Math.cos(p) * Math.sin(dl);
      const y = Math.cos(lat0) * Math.sin(p) - Math.sin(lat0) * Math.cos(p) * Math.cos(dl);
      return [padL + translate[0] + proj.scale * x, padT + translate[1] - proj.scale * y];
    };
  }
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const NS = "http://www.w3.org/2000/svg";
  stage.querySelector(".globe-leaders")?.remove();
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "globe-leaders");
  svg.setAttribute("width", stage.offsetWidth);
  svg.setAttribute("height", stage.offsetHeight);
  stage.appendChild(svg);

  const box = stage.getBoundingClientRect();
  const inset = 16;                                              // keep lines off the corners

  stage.querySelectorAll("[data-lon][data-lat], [data-bar], [data-x][data-y]").forEach(el => {
    const r = el.getBoundingClientRect();
    const left = r.left - box.left, right = r.right - box.left;
    const top = r.top - box.top, bottom = r.bottom - box.top;

    let tx, ty;
    if (el.dataset.x !== undefined && el.dataset.y !== undefined) {   // a point in stage pixels
      tx = +el.dataset.x;
      ty = +el.dataset.y;
    } else if (el.dataset.bar !== undefined) {                   // a point on a bar chart
      const fx = el.dataset.barX !== undefined ? +el.dataset.barX : 0.5;
      tx = padL + spec.width * fx;
      ty = padT + spec.height * (1 - +el.dataset.bar);
    } else {
      [tx, ty] = project(+el.dataset.lon, +el.dataset.lat);      // a point on a map
    }

    // nearest point on the element's edge
    const dx = tx < left ? left - tx : tx > right ? tx - right : 0;
    const dy = ty < top ? top - ty : ty > bottom ? ty - bottom : 0;
    let ax, ay;
    if (dx >= dy) { ax = tx < left ? left : right; ay = clamp(ty, top + inset, bottom - inset); }
    else          { ay = ty < top ? top : bottom;  ax = clamp(tx, left + inset, right - inset); }

    ["halo", "core"].forEach(cls => {                            // white halo keeps it legible over the chart
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