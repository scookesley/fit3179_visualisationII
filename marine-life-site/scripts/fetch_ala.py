#!/usr/bin/env python3
"""Download marine species occurrence records from the Atlas of Living Australia
and write data/ala_occurrences.csv for the Vega-Lite charts.

Output columns: species, scientific, lat, lon, year, month

STATUS: run against the live service in October 2026. Two limits found then:
  - pageSize above 100 is rejected (503), so pages are 100 records.
  - startIndex stops returning records at 5000, so one query cannot page through a
    whole species. This script therefore queries one year at a time.
Records are limited to a box around Australia (see BBOX below).

For a citable, properly sampled download, prefer the ALA web interface or the `galah`
package (it can mint a DOI), then reshape the result into the same columns:
    galah::galah_call() |> galah::identify("Megaptera novaeangliae") |> galah::atlas_occurrences(mint_doi = TRUE)

LIMITATION: within each year, records come back in index order, not as a random sample,
so a capped download can be biased (e.g. towards one data provider). --cap is per species
PER YEAR, which spreads the sample across years. Raise --cap, or use an offline download,
if the maps look odd.

Usage (from the project root):
    python3 scripts/fetch_ala.py --cap 200
"""
import argparse
import csv
import datetime
import time
from pathlib import Path

import requests

BASE = "https://biocache-ws.ala.org.au/ws/occurrences/search"

# common name used on the site (must match SPECIES in js/main.js)  ->  scientific name
SPECIES = {
    "Humpback Whale": "Megaptera novaeangliae",
    "Green Turtle": "Chelonia mydas",
    "White Shark": "Carcharodon carcharias",
    "Eastern Blue Groper": "Achoerodus viridis",
    "Giant Australian Cuttlefish": "Ascarosepion apama",  # ALA files it under this name, not Sepia apama
}

FIELDS = "decimalLatitude,decimalLongitude,year,month,scientificName"
PAGE_SIZE = 100   # the service returns 503 for larger pages
# rough box around Australia, so overseas records do not skew the seasonal charts
BBOX = ["decimalLatitude:[-48 TO -8]", "decimalLongitude:[108 TO 162]"]


def fetch_year(scientific: str, year: int, cap: int) -> list[dict]:
    rows: list[dict] = []
    start = 0
    while len(rows) < cap:
        params = {
            "q": f'taxon_name:"{scientific}"',
            # drop records ALA flags as geospatially suspect
            "fq": ["geospatial_kosher:true", f"year:{year}"] + BBOX,
            "fl": FIELDS,
            "pageSize": min(PAGE_SIZE, cap - len(rows)),
            "startIndex": start,
        }
        resp = requests.get(BASE, params=params, timeout=60)
        resp.raise_for_status()
        batch = resp.json().get("occurrences", [])
        if not batch:
            break
        rows.extend(batch)
        start += len(batch)
        time.sleep(0.3)  # be polite to a public API
    return rows[:cap]


def fetch_species(scientific: str, cap: int, since_year: int) -> list[dict]:
    rows: list[dict] = []
    for year in range(since_year, datetime.date.today().year + 1):
        rows.extend(fetch_year(scientific, year, cap))
    return rows


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cap", type=int, default=200, help="max records per species per year")
    ap.add_argument("--since", type=int, default=2000, help="earliest year to keep")
    ap.add_argument("--out", default="data/ala_occurrences.csv")
    args = ap.parse_args()

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)

    with out.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["species", "scientific", "lat", "lon", "year", "month"])
        for common, scientific in SPECIES.items():
            recs = fetch_species(scientific, args.cap, args.since)
            kept = 0
            for r in recs:
                lat, lon = r.get("decimalLatitude"), r.get("decimalLongitude")
                if lat is None or lon is None:
                    continue
                month = r.get("month")
                month = int(month) if month else ""   # the API returns "07"; the charts want 7
                w.writerow([common, scientific, round(lat, 4), round(lon, 4), r.get("year", ""), month])
                kept += 1
            print(f"{common}: {kept} records")

    print(f"Wrote {out}. Record the download date and cite ALA in the site's credits.")


if __name__ == "__main__":
    main()
