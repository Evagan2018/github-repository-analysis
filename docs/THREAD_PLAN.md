# Repository Analysis Thread Plan

## Purpose

Use this workspace for the multi-day analysis of GitHub repository data exported
from the following organizations:

- `arm-software`
- `arm-examples`
- `open-cmisis-pack`
- `mdk-packs`

The initial input set for this workspace is expected to be:

- `01_Get_Repositories.py`
- `arm-software_raw_list.csv`
- `arm-examples_raw_list.csv`
- `open-cmisis-pack_raw_list.csv`
- `mdk-packs_raw_list.csv`

## Goal

Build a clean, reproducible analysis workflow around the exported repository
lists and traffic metrics, and prepare follow-on scripts or reports without
mixing temporary work into the original thread workspace.

## Recommended Workspace Use

Keep the initial delivered artifacts in the workspace root while the project is
being set up.

Suggested later structure if the project grows:

- `work/` for temporary scripts, scratch files, and intermediate outputs
- `outputs/` for final user-facing reports and deliverables
- `notes/` for assumptions, decisions, and review notes

## Planned Work Phases

### 1. Intake And Validation

- Confirm that all five expected input files are present.
- Verify the CSV format and identify where the descriptive header ends and the
  data table begins.
- Check whether the organization alias `open-cmisis-pack` should continue to be
  treated as `Open-CMSIS-Pack` during analysis.

### 2. Data Normalization

- Load all CSV files into a consistent internal structure.
- Normalize timestamps, Boolean fields, and traffic status values.
- Separate descriptive header rows from the actual comma-separated data table.
- Flag rows with missing or restricted traffic metrics.

### 3. Analysis

- Compare organizations by repository count, activity, and traffic availability.
- Identify recent repositories, low-activity repositories, and repositories with
  unavailable traffic metrics.
- Prepare filtered views for manual review or Excel-based follow-on processing.

### 4. Automation And Reporting

- Add reusable scripts for repeated analysis steps.
- Generate summary CSV or Markdown reports if needed.
- Keep all transformations reproducible from the raw exported inputs.

## Assumptions To Recheck In The Next Thread

- The CSV header section uses comment-style rows beginning with `#`.
- The data section starts with the field row:
  `repository,last_push,visibility,archived,unique_visitors_14d,unique_cloners_14d,total_views_14d,traffic_status`
- `traffic_status` may contain values such as `OK` or a restricted-access note.

## Suggested Kickoff Prompt For The Next Thread

Use the files in this folder as the baseline dataset. First validate the four
raw CSV exports and the `01_Get_Repositories.py` script, then propose the next
analysis steps and implement the data-loading and normalization stage.
