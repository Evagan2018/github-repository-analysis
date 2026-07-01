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
├── docs/
│   ├── SQLite_Database_Diagram.txt
│   └── THREAD_PLAN.md
├── scripts/
│   ├── 01_Get_Repositories.py
│   ├── 02_Create_Summary_Raw_List.py
│   ├── 03_Get_Reviewed_Repositories.py
│   ├── 04_Get_Repositories_to_screen.py
│   └── 05_Create_SQLite_Database.py
├── data/
│   ├── raw/
│   ├── reviewed/
│   ├── screening/
│   └── db/
├── sql/
└── monitor-config.yml
```

## Workflow Overview

```text
GitHub organizations
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
        +--> 03_Get_Reviewed_Repositories.py
        |         |
        |         v
        |   data/reviewed/Summary_Reviewed_List_use_access.csv
        |
        +--> 04_Get_Repositories_to_screen.py
                  |
                  v
          data/screening/Summary_Reviewed_List_to_screen.xlsx
                  |
                  v
          05_Create_SQLite_Database.py
                  |
                  v
          data/db/Repository_Analysis.sqlite
```

## Script Order

1. Export raw repository data for each organization.
2. Build the Excel workbook for manual review.
3. Review the workbook in Excel and save the result as `Summary_Reviewed_List.xlsx`.
4. Optionally validate GitHub access for the reviewed `USE` rows.
5. Create the screening workbook for database seeding.
6. Create the SQLite database.

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

## SQLite Schema

The seeded database contains:

- `repositories`: stable repository metadata and context fields
- `screening_snapshot`: initial rolling 14-day screening values
- `daily_traffic`: empty fact table reserved for later daily updates
- `import_runs`: audit trail of database imports

## Notes

- Generated data under `data/` is ignored by git by default.
- Choose and add a license before publishing the repository if one is required.
- The next planned script is a daily collector for populating `daily_traffic`.
