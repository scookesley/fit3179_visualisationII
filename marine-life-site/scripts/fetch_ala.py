#!/usr/bin/env python3
"""Download marine species occurrence records from the Atlas of Living Australia
and write data/ala_occurrences.csv for the Vega-Lite charts.

Output columns: species, scientific, lat, lon, year, month

STATUS: written from the ALA biocache API documentation but NOT run against the live
service. Before relying on it:
  1. Open https://biocache-ws.ala.org.au/ws/swagger-ui/index.html and confirm the
     /occurrences/search parameters (q, fq, fl, pageSize, startIndex) and the field
     names below.
  2. Run with a small --cap first (e.g. --cap 200) and look at the CSV.

For a citable, properly sampled download, prefer the ALA web interface or the `galah`
package (it can mint a DOI), then reshape the result into the same columns:
    galah::galah_call() |> galah::identify("Megaptera novaeangliae") |> galah::atlas_occurrences(mint_doi = TRUE)

LIMITATION: paging through /occurrences/search returns records in index order, not a
random sample, so a capped download can be biased (e.g. towards one data provider).
Raise --cap, or use an offline download, if the maps look odd.

Usage (from the project root):
    python3 scripts/fetch_ala.py --cap 5000
"""
import argparse
import csv
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
    "Giant Australian Cuttlefish": "Sepia apama",
}

FIELDS = "decimalLatitude,decimalLongitude,year,month,scientificName"
PAGE_SIZE = 1000


def fetch_species(scientific: str, cap: int, since_year: int) -> list[dict]:
    rows: list[dict] = []
    start = 0
    while len(rows) < cap:
        params = {
            "q": f'taxon_name:"{scientific}"',
            # drop records ALA flags as geospatially suspect, and very old records
            "fq": ["geospatial_kosher:true", f"year:[{since_year} TO *]"],
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
        time.sleep(0.5)  # be polite to a public API
    return rows[:cap]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cap", type=int, default=5000, help="max records per species")
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
                w.writerow([common, scientific, round(lat, 4), round(lon, 4), r.get("year", ""), r.get("month", "")])
                kept += 1
            print(f"{common}: {kept} records")

    print(f"Wrote {out}. Record the download date and cite ALA in the site's credits.")


if __name__ == "__main__":
    main()
