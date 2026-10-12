# Australian Marine Life: Vega-Lite data story

A static site (no build step). Open it through a local web server, because browsers block `fetch()` of local files.

```bash
cd marine-life-site
python3 -m http.server 8000
# then visit http://localhost:8000/        (add ?dev for per-chart TODO panels)
```

## Project layout

```
marine-life-site/
├── index.html            # page structure + captions (one <div class="chart" data-spec="..."> per chart)
├── css/style.css         # all styling
├── js/main.js            # loads every spec, shared chart theme, species dropdown
├── specs/                # one Vega-Lite JSON file per chart (01 … 13)
├── data/                 # CSV / GeoJSON the specs load
├── scripts/              # data-prep scripts (not needed at runtime)
└── README.md
```

**Why one spec per file:** each chart can be edited, debugged and replaced on its own; `?dev` shows each spec's TODO list; and
the page shows a "View Vega-Lite spec" disclosure under each chart. HTML stays in `index.html`, CSS in `css/style.css`, and the only JavaScript is the small loader in `js/main.js`.
The shared look (fonts, axis colours, palette) is defined once in `THEME` in `js/main.js`.

## What counts towards the brief

Needs 10+ charts, 8+ advanced, including the 3 required map idioms.

| # | Chart | Idiom | Advanced? |
|---|---|---|---|
| 01 | Marine parks map | Map (polygons) | Yes (required map) |
| 02 | Sightings over parks | Map (binned density) | Yes (required map) |
| 03 | Threatened species by state | Map (choropleth) | Yes (required map) |
| 04 | Species × month | Heatmap | Yes |
| 05 | Seasonal streamgraph | Streamgraph | Yes |
| 06 | Latitude ridgeline | Ridgeline | Yes |
| 07 | Fish biomass by region | Boxplot | Yes |
| 08 | Reef profiles | Parallel coordinates | Yes |
| 09 | A year in sightings | Radial chart | Borderline: confirm with your tutor |
| 10 | Threat status by group | Stacked bar | No |
| 11 | Coral cover over time | Multi-line | No |
| 12 | Starfish vs coral | Scatter | No |
| 13 | GBR zoning | Map (optional 4th) | Yes (spare) |

Charts 1-8 already make 8 advanced. 9 and 13 are spares.

## Data files the specs expect

| File | Columns | Used by |
|---|---|---|
| `data/aus_states.geojson` | features with a `properties.STATE_NAME` (state name) | 01, 02, 03, 13 |
| `data/australian_marine_parks.geojson` | features with `NETNAME`, `RESNAME`, `ZONENAME` (**guesses: check**) | 01, 02 |
| `data/gbr_zoning.geojson` | features with `TYPE` | 13 |
| `data/ala_occurrences.csv` | `species, scientific, lat, lon, year, month` | 02, 04, 05, 06, 09 |
| `data/reef_fish_transects.csv` | `region, latitude, biomass_kg` | 07 |
| `data/threatened_marine_by_state.csv` | `state, n_species` | 03 |
| `data/threatened_marine_by_group.csv` | `group, status, n` | 10 |
| `data/aims_ltmp_reef_year.csv` | `reef, sector, shelf, year, hard_coral, hard_coral_lower, hard_coral_upper, lat, lon` (hard coral only: the download has no starfish, soft or dead coral) | 08, 11, 12 |

Nothing is bundled: you need to fetch the data yourself.

## Steps

1. **Boundaries.** Download Australian Marine Parks (GeoJSON, data.gov.au / DCCEEW), the GBR Marine Park zoning layer
   (Reef Authority; read their data-use terms), and a states GeoJSON (Natural Earth admin-1 filtered to Australia,
   or the ABS/Geoscape file). Check property names against the specs, then simplify big files with
   [mapshaper](https://mapshaper.org) (`-simplify 5%`).
2. **Species sightings.** `python3 scripts/fetch_ala.py --cap 200` as a test, then a bigger run. Check the script's
   docstring: it has not been run against the live API.
3. **Threatened species.** Download the EPBC threatened species CSV into `data/raw/`, run
   `python3 scripts/prep_threatened.py --inspect <file>`, fill in the CONFIG block, then run it for real.
4. **Reef fish.** From the AODN Portal, search "NRMN" and download the reef fish abundance and biomass dataset plus site
   information. Join on site, compute biomass per transect, keep ~6-10 regions, save as `reef_fish_transects.csv`.
5. **Coral.** Request the AIMS Long-term Monitoring Program data (a short form), save it as
   `data/AIMS_LTMP-GBR-manta-tow.csv`, then run `python scripts/prep_aims_ltmp.py` to reshape it into
   `aims_ltmp_reef_year.csv`.
6. Open the site with `?dev`, work down each chart's TODO list, then write the captions in `index.html`.

## Troubleshooting

- **A map is one solid block of colour, or the land/parks look "inside-out".** Vega/d3 expects polygon outer rings wound
  *clockwise*; many GeoJSON files (anything following RFC 7946) are the opposite. Re-wind the file (turf's `rewind` with default
  settings, or re-export from mapshaper) and check by rendering it.
- **A chart shows a red error box.** Open the browser console. Usually the file is missing, or a field name in the spec does
  not match your data (property names such as `NETNAME` are guesses until you have opened your own files).
- **A map is tiny, off-centre or cut off.** Adjust `projection.center` and `projection.scale` in that spec (bigger scale = more zoomed in).
- **Page is slow.** Simplify GeoJSON, and cap or bin the sightings data.

## Before you submit

- [ ] Every chart loads without a red error box (check the browser console)
- [ ] Captions state a finding, not just a description
- [ ] Credits section lists each dataset, access date and licence
- [ ] Confirm with your tutor that chart 9 and the other non-standard idioms count as advanced
- [ ] Remove the placeholder text and the `?dev` TODO panels from anything you hand in
