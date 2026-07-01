# GitHub Repository Analysis

Python workflow for screening GitHub repositories and storing traffic metrics in SQLite.

## Purpose

This project collects repository data from selected GitHub organizations, prepares
the data for manual review in Excel, filters the reviewed repositories for
screening, and seeds a normalized SQLite database for later trend analysis,
graphs, and heatmaps.

## Repository Layout

```text
github-repository-analysis/
├── README.md
├── .gitignore
├── .github/
│   └── workflows/
│       └── collect-daily-traffic.yml
├── docs/
│   ├── assets/
│   ├── data/
│   ├── dashboard.html
│   ├── index.html
│   ├── SQLite_Database_Diagram.txt
│   └── THREAD_PLAN.md
├── scripts/
│   ├── 01_Get_Repositories.py
│   ├── 02_Create_Summary_Raw_List.py
│   ├── 03_Get_Reviewed_Repositories.py
│   ├── 04_Get_Repositories_to_screen.py
│   ├── 05_Create_SQLite_Database.py
│   ├── 06_Export_SQLite_To_JSON.py
│   └── 07_Collect_Daily_Traffic.py
├── data/
│   ├── raw/
│   ├── reviewed/
│   ├── screening/
│   └── db/
└── sql/
```

## Workflow Overview

```text
GitHub organizations (arm-examples, arm-software, open-cmsis-packs, mdk-packs)
        |
        v
01_Get_Repositories.py
        |
        v
data/raw/*.csv
        |
        v
02_Create_Summary_Raw_List.py
        |
        v
data/reviewed/Summary_Raw_List.xlsx
        |
        v
Manual review in Excel
        |
        v
data/reviewed/Summary_Reviewed_List.xlsx
        |
        v
03_Get_Reviewed_Repositories.py
        |
        v
data/reviewed/Summary_Reviewed_List_use_access.csv
        |
        v
04_Get_Repositories_to_screen.py
        |
        v
          data/screening/Summary_Reviewed_List_to_screen.xlsx
                  |
                  v
          05_Create_SQLite_Database.py
                  |
                  v
          data/db/Repository_Analysis.sqlite
                  |
                  v
          07_Collect_Daily_Traffic.py
                  |
                  v
          repositories + screening_snapshot + daily_traffic updated
                  |
                  v
          06_Export_SQLite_To_JSON.py
                  |
                  v
          docs/data/dashboard_data.json
                  |
                  v
          docs/index.html (GitHub Pages)
```

## Script Order

1. Export raw repository data for each organization.
2. Build the Excel workbook for manual review.
3. Review the workbook in Excel and save the result as `Summary_Reviewed_List.xlsx`.
4. Optionally validate GitHub access for the reviewed `USE` rows.
5. Create the screening workbook for database seeding.
6. Create the SQLite database.
7. Collect daily traffic buckets and refresh rolling screening snapshots.
8. Export the database to dashboard JSON.
9. Publish or preview the static dashboard from `docs/`.

## Typical Commands

Export raw CSV files:

```powershell
python scripts/01_Get_Repositories.py arm-software data/raw/arm-software_raw_list.csv
python scripts/01_Get_Repositories.py arm-examples data/raw/arm-examples_raw_list.csv
python scripts/01_Get_Repositories.py open-cmisis-pack data/raw/open-cmisis-pack_raw_list.csv
python scripts/01_Get_Repositories.py mdk-packs data/raw/mdk-packs_raw_list.csv
```

Create the raw summary workbook:

```powershell
python scripts/02_Create_Summary_Raw_List.py
```

Validate reviewed `USE` rows through the GitHub API:

```powershell
python scripts/03_Get_Reviewed_Repositories.py data/reviewed/Summary_Reviewed_List.xlsx
```

Create the screening workbook:

```powershell
python scripts/04_Get_Repositories_to_screen.py data/reviewed/Summary_Reviewed_List.xlsx
```

Create the SQLite database:

```powershell
python scripts/05_Create_SQLite_Database.py data/screening/Summary_Reviewed_List_to_screen.xlsx --replace
```

Export dashboard JSON:

```powershell
python scripts/06_Export_SQLite_To_JSON.py
```

Collect daily traffic from GitHub and update the SQLite database:

```powershell
python scripts/07_Collect_Daily_Traffic.py data/db/Repository_Analysis.sqlite
```

## GitHub Actions Workflow

The repository includes a scheduled workflow:

- `.github/workflows/collect-daily-traffic.yml`

Workflow responsibilities:

- run `07_Collect_Daily_Traffic.py`
- run `06_Export_SQLite_To_JSON.py`
- commit the updated SQLite database and dashboard data files back to the repository

Required repository secret:

- `REPOSITORY_ANALYSIS_TOKEN`
  This token is passed to `07_Collect_Daily_Traffic.py` as `GH_TOKEN` so the
  workflow can read GitHub repository traffic for the tracked repositories.

Workflow permission note:

- The workflow commits updated files back to the repository. If GitHub Actions
  is configured with read-only workflow permissions in the repository settings,
  change it to allow write access for repository contents.

## SQLite Schema

The seeded database contains:

- `repositories`: stable repository metadata and context fields
- `screening_snapshot`: rolling 14-day screening values collected over time
- `daily_traffic`: per-day GitHub traffic buckets built by the daily collector
- `import_runs`: audit trail of database imports

## Static Dashboard

The `docs/` folder contains a static dashboard designed for GitHub Pages.

- `docs/index.html`: main dashboard entry point
- `docs/dashboard.html`: redirect to `index.html`
- `docs/assets/`: dashboard CSS and JavaScript
- `docs/data/dashboard_data.json`: generated JSON export from SQLite
- `docs/data/dashboard_data.js`: generated JavaScript data export for direct `file://` viewing

After updating the database, rerun:

```powershell
python scripts/06_Export_SQLite_To_JSON.py
```

The export regenerates both `dashboard_data.json` and `dashboard_data.js`.
GitHub Pages uses the JSON file, while direct local `file://` opening uses the
JavaScript data file. The dashboard can therefore be opened either through
GitHub Pages or directly from the local `docs/dashboard.html` file in a browser.

## Notes

- Generated data under `data/` is ignored by git by default.
- Choose and add a license before publishing the repository if one is required.
- After each daily collection run, rerun `python scripts/06_Export_SQLite_To_JSON.py`
  to refresh the dashboard data files.
