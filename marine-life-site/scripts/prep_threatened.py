#!/usr/bin/env python3
"""Turn the EPBC threatened species list into the two small CSVs the charts need:

    data/threatened_marine_by_state.csv   state, n_species          (chart 3, choropleth)
    data/threatened_marine_by_group.csv   group, status, n          (chart 10, stacked bar)

STATUS: skeleton. I have not seen the real column layout of the download, so the
column names below are placeholders you must fill in. Work through it like this:

  1. Download the "Threatened Species of National Environmental Significance" CSV from
     data.gov.au (README step 3) into data/raw/.
  2. Inspect it:
         python3 scripts/prep_threatened.py --inspect data/raw/threatened_species.csv
  3. Edit the CONFIG block so each name matches a real column / value.
  4. Run it:
         python3 scripts/prep_threatened.py data/raw/threatened_species.csv
  5. Open the outputs and sanity-check the counts against the source.
"""
import argparse
import sys
from pathlib import Path

import pandas as pd

# ------------------------------- CONFIG: EDIT ME -------------------------------
STATUS_COL = "Threatened Status"          # TODO confirm column name
GROUP_COL = "Group"                       # TODO confirm: a taxon group such as Fish / Mammal / Reptile / Bird
NAME_COL = "Scientific Name"              # TODO confirm

# How is marine-ness recorded? Options:
#   (a) a column with a flag, e.g. MARINE_COL = "Marine", MARINE_VALUE = "Yes"
#   (b) the state/occurrence columns include a marine area (e.g. "Commonwealth Marine Area")
#   (c) a hand-made list of marine species names in MARINE_NAMES
MARINE_COL = None                         # TODO or leave None
MARINE_VALUE = None
MARINE_NAMES: set[str] = set()            # TODO fallback: names you know are marine

# How is state occurrence recorded? Two common shapes:
#   (a) one column per state with a Yes/blank or similar flag  -> set STATE_COLUMNS
#   (b) one column holding a list of states                    -> set STATE_LIST_COL
STATE_COLUMNS: dict[str, str] = {
    # "column in file": "name exactly as in your states GeoJSON (properties.name)"
    # "NSW": "New South Wales",
}
STATE_LIST_COL = None                     # TODO e.g. "State" with values like "NSW, QLD"
STATE_ABBREV = {
    "NSW": "New South Wales", "VIC": "Victoria", "QLD": "Queensland", "SA": "South Australia",
    "WA": "Western Australia", "TAS": "Tasmania", "NT": "Northern Territory",
    "ACT": "Australian Capital Territory",
}
KEEP_STATUSES = ["Vulnerable", "Endangered", "Critically Endangered"]
# -------------------------------------------------------------------------------


def load(path: str) -> pd.DataFrame:
    return pd.read_csv(path, dtype=str, encoding="utf-8-sig").fillna("")


def inspect(path: str) -> None:
    df = load(path)
    print(f"{len(df)} rows, {len(df.columns)} columns\n")
    for c in df.columns:
        sample = df[c].replace("", pd.NA).dropna().unique()[:6]
        print(f"- {c!r}: {list(sample)}")


def is_marine(df: pd.DataFrame) -> pd.Series:
    if MARINE_COL:
        return df[MARINE_COL].str.strip().str.lower() == str(MARINE_VALUE).lower()
    if MARINE_NAMES:
        return df[NAME_COL].isin(MARINE_NAMES)
    sys.exit("Set MARINE_COL, or MARINE_NAMES, in CONFIG so the script knows which species are marine.")


def explode_states(df: pd.DataFrame) -> pd.DataFrame:
    rows = []
    if STATE_COLUMNS:
        for col, state in STATE_COLUMNS.items():
            hit = df[df[col].str.strip() != ""]
            rows.append(pd.DataFrame({"species": hit[NAME_COL], "state": state}))
    elif STATE_LIST_COL:
        for _, r in df.iterrows():
            for token in r[STATE_LIST_COL].replace(";", ",").split(","):
                token = token.strip()
                if token:
                    rows.append(pd.DataFrame({"species": [r[NAME_COL]], "state": [STATE_ABBREV.get(token, token)]}))
    else:
        sys.exit("Set STATE_COLUMNS or STATE_LIST_COL in CONFIG.")
    return pd.concat(rows, ignore_index=True).drop_duplicates()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("csv")
    ap.add_argument("--inspect", action="store_true", help="print columns and sample values, then exit")
    ap.add_argument("--outdir", default="data")
    args = ap.parse_args()

    if args.inspect:
        inspect(args.csv)
        return

    df = load(args.csv)
    df = df[df[STATUS_COL].isin(KEEP_STATUSES)]
    df = df[is_marine(df)]
    print(f"{len(df)} threatened marine species kept")

    out = Path(args.outdir)
    out.mkdir(parents=True, exist_ok=True)

    by_state = explode_states(df).groupby("state")["species"].nunique().rename("n_species").reset_index()
    by_state.to_csv(out / "threatened_marine_by_state.csv", index=False)

    by_group = df.groupby([GROUP_COL, STATUS_COL]).size().rename("n").reset_index()
    by_group.columns = ["group", "status", "n"]
    by_group.to_csv(out / "threatened_marine_by_group.csv", index=False)

    print(by_state.to_string(index=False))
    print(by_group.to_string(index=False))


if __name__ == "__main__":
    main()
