#!/usr/bin/env python3
"""Turn the EPBC species report into the two small CSVs the threatened-species charts need:

    data/threatened_marine_by_state.csv   state, n_species          (choropleth)
    data/threatened_marine_by_group.csv   group, status, n          (stacked bar)

SOURCE: a report exported from the Species Profile and Threats Database (SPRAT), Department of
Climate Change, Energy, the Environment and Water. The file has TWO header rows (a section name,
then the column name) and one row per listed taxon. Cite SPRAT and the download date in the credits.

WHICH ROWS ARE COUNTED
  - Threatened  = "EPBC Threat Status" is Vulnerable, Endangered or Critically Endangered
                  (Extinct and Conservation Dependent are left out).
  - Marine      = "Commonwealth Marine Area" says Present, i.e. the taxon is recorded in
                  Commonwealth waters. This is a choice. The report also has a "Marine Status"
                  column (the EPBC listed marine species list), but that list has no whales or
                  sharks and includes shorebirds and a parrot, so it is not used here.
  - In a state  = that state's column says Present or Endemic (Vagrant, Historic and
                  Translocated are not counted). A taxon can be in several states.
  - A row is a listed taxon, which can be a species, a subspecies or a population (for example
    the east coast and west coast Grey Nurse Shark populations are two rows).

It prints the totals so you can check them and write the captions.

Standard library only.

Usage (run from the project root):
    python scripts/prep_threatened.py data/12102026-044553-report.csv
"""
import argparse
import csv
import sys
from collections import Counter
from pathlib import Path

STATUSES = ["Vulnerable", "Endangered", "Critically Endangered"]
# names exactly as in data/aus_states.geojson (properties.STATE_NAME); they match the report's columns
STATES = ["New South Wales", "Victoria", "Queensland", "South Australia", "Western Australia",
          "Tasmania", "Northern Territory", "Australian Capital Territory"]
# "Taxon Group" in the report -> label on the chart
GROUPS = {
    "birds": "Birds",
    "mammals": "Mammals",
    "reptiles": "Reptiles",
    "sharks": "Sharks and sawfishes",
    "ray-finned fishes": "Bony fishes",
}


def main() -> None:
    ap = argparse.ArgumentParser(description="Build the threatened marine species CSVs from a SPRAT report.")
    ap.add_argument("csv", help="the SPRAT report, e.g. data/12102026-044553-report.csv")
    ap.add_argument("--outdir", default="data")
    args = ap.parse_args()

    src = Path(args.csv)
    if not src.is_file():
        sys.exit(f"ERROR: cannot find '{src}'. Run this from the project root.")
    with src.open(newline="", encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))
    header, data = rows[1], rows[2:]          # rows[0] is the section-name row
    col = {name: i for i, name in reversed(list(enumerate(header)))}   # first column wins for repeated names
    needed = ["EPBC Threat Status", "Taxon Group", "Commonwealth Marine Area"] + STATES
    missing = [c for c in needed if c not in col]
    if missing:
        sys.exit(f"ERROR: the report has no column(s) {missing}. Is this the SPRAT report?")

    kept = [r for r in data
            if r[col["EPBC Threat Status"]] in STATUSES and "Present" in r[col["Commonwealth Marine Area"]]]
    if not kept:
        sys.exit("ERROR: no threatened marine rows found.")

    out = Path(args.outdir)
    out.mkdir(parents=True, exist_ok=True)

    by_state = {s: sum(1 for r in kept if "Present" in r[col[s]] or "Endemic" in r[col[s]]) for s in STATES}
    with (out / "threatened_marine_by_state.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["state", "n_species"])
        w.writerows(by_state.items())

    by_group = Counter((GROUPS.get(r[col["Taxon Group"]], r[col["Taxon Group"]]), r[col["EPBC Threat Status"]])
                       for r in kept)
    group_totals = Counter()
    for (group, _), n in by_group.items():
        group_totals[group] += n
    with (out / "threatened_marine_by_group.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["group", "status", "n"])
        for group, _ in group_totals.most_common():
            for status in STATUSES:
                if by_group[(group, status)]:
                    w.writerow([group, status, by_group[(group, status)]])

    print(f"{len(kept)} threatened marine taxa kept (of {len(data)} rows in the report).")
    print("By status: " + ", ".join(f"{s} {sum(1 for r in kept if r[col['EPBC Threat Status']] == s)}" for s in STATUSES))
    print("By group:  " + ", ".join(f"{g} {n}" for g, n in group_totals.most_common()))
    print("By state (a taxon can count in several):")
    for state, n in sorted(by_state.items(), key=lambda kv: -kv[1]):
        print(f"  {n:3d}  {state}")
    print(f"Wrote {out / 'threatened_marine_by_state.csv'} and {out / 'threatened_marine_by_group.csv'}.")


if __name__ == "__main__":
    main()
