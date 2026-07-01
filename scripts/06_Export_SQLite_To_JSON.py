"""Export the SQLite repository analysis database to dashboard assets.

Description:
Read ``Repository_Analysis.sqlite`` and export dashboard-friendly data files
for the static dashboard. The export contains summary metrics, latest
screening snapshot data, screening snapshot history, daily traffic records,
and recent import history.

Parameters:
- ``input_database``: path to ``Repository_Analysis.sqlite``. Default:
  ``<repo_root>/data/db/Repository_Analysis.sqlite``.
- ``output_json``: target JSON file. Default:
  ``<repo_root>/docs/data/dashboard_data.json``. A matching JavaScript data
  file named ``dashboard_data.js`` is generated automatically next to it.

Calling format:
    python scripts/06_Export_SQLite_To_JSON.py
    python scripts/06_Export_SQLite_To_JSON.py <input_database> [output_json]

Example:
    python scripts/06_Export_SQLite_To_JSON.py

Dependencies:
The script uses the Python standard library only.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from datetime import UTC, datetime
from pathlib import Path


SCRIPT_VERSION = "1.1.0"
DEFAULT_DATABASE_SUBDIR = Path("data") / "db"
DEFAULT_DATABASE_NAME = "Repository_Analysis.sqlite"
DEFAULT_OUTPUT_SUBDIR = Path("docs") / "data"
DEFAULT_OUTPUT_NAME = "dashboard_data.json"


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Read Repository_Analysis.sqlite and export a JSON file for the "
            "static GitHub Pages dashboard."
        )
    )
    parser.add_argument(
        "input_database",
        nargs="?",
        type=Path,
        help="Source SQLite database path. Default: <repo_root>/data/db/Repository_Analysis.sqlite.",
    )
    parser.add_argument(
        "output_json",
        nargs="?",
        type=Path,
        help="Output JSON path. Default: <repo_root>/docs/data/dashboard_data.json.",
    )
    parser.add_argument(
        "--version",
        action="version",
        version=f"%(prog)s {SCRIPT_VERSION}",
    )
    return parser.parse_args(argv)


def get_repository_root() -> Path:
    return Path(__file__).resolve().parent.parent


def resolve_input_database(input_database: Path | None) -> Path:
    if input_database is not None:
        return input_database.expanduser().resolve()
    return get_repository_root() / DEFAULT_DATABASE_SUBDIR / DEFAULT_DATABASE_NAME


def resolve_output_json(output_json: Path | None) -> Path:
    if output_json is not None:
        return output_json.expanduser().resolve()
    return get_repository_root() / DEFAULT_OUTPUT_SUBDIR / DEFAULT_OUTPUT_NAME


def fetch_rows(connection: sqlite3.Connection, query: str, parameters: tuple = ()) -> list[dict]:
    cursor = connection.execute(query, parameters)
    column_names = [description[0] for description in cursor.description]
    rows: list[dict] = []
    for record in cursor.fetchall():
        rows.append(
            {
                column_name: normalize_value(value)
                for column_name, value in zip(column_names, record, strict=True)
            }
        )
    return rows


def fetch_one(connection: sqlite3.Connection, query: str, parameters: tuple = ()) -> dict:
    rows = fetch_rows(connection, query, parameters)
    if not rows:
        return {}
    return rows[0]


def normalize_value(value):
    if isinstance(value, str):
        return value
    return value


def build_export_payload(input_database: Path) -> dict:
    with sqlite3.connect(input_database) as connection:
        connection.row_factory = sqlite3.Row

        summary = fetch_one(
            connection,
            """
            SELECT
                (SELECT COUNT(*) FROM repositories) AS repository_count,
                (SELECT COUNT(DISTINCT organization) FROM repositories) AS organization_count,
                (SELECT COUNT(*) FROM screening_snapshot) AS screening_snapshot_count,
                (SELECT COUNT(*) FROM daily_traffic) AS daily_traffic_count,
                (SELECT COUNT(*) FROM import_runs) AS import_run_count,
                (SELECT MAX(snapshot_date) FROM screening_snapshot) AS latest_snapshot_date,
                (SELECT MAX(metric_date) FROM daily_traffic) AS latest_metric_date
            """
        )

        organizations = [
            row["organization"]
            for row in fetch_rows(
                connection,
                """
                SELECT DISTINCT organization
                FROM repositories
                WHERE organization IS NOT NULL AND organization <> ''
                ORDER BY organization
                """,
            )
        ]

        latest_snapshot_date = summary.get("latest_snapshot_date")

        current_snapshot = []
        organization_snapshot_totals = []
        if latest_snapshot_date:
            current_snapshot = fetch_rows(
                connection,
                """
                SELECT
                    r.repository_full_name,
                    r.repository,
                    r.organization,
                    r.link_2_repository,
                    r.visibility,
                    r.archived,
                    r.last_push,
                    r.days_since_last_push,
                    r.traffic_status,
                    r.forks_count,
                    r.stargazers_count,
                    r.open_issues_count,
                    s.snapshot_date,
                    s.unique_visitors_14d,
                    s.unique_cloners_14d,
                    s.total_views_14d,
                    s.collected_at
                FROM screening_snapshot AS s
                INNER JOIN repositories AS r
                    ON r.repository_id = s.repository_id
                WHERE s.snapshot_date = ?
                ORDER BY COALESCE(s.total_views_14d, 0) DESC, r.repository_full_name
                """,
                (latest_snapshot_date,),
            )

            organization_snapshot_totals = fetch_rows(
                connection,
                """
                SELECT
                    r.organization,
                    COUNT(*) AS repository_count,
                    SUM(COALESCE(s.unique_visitors_14d, 0)) AS unique_visitors_14d,
                    SUM(COALESCE(s.unique_cloners_14d, 0)) AS unique_cloners_14d,
                    SUM(COALESCE(s.total_views_14d, 0)) AS total_views_14d
                FROM screening_snapshot AS s
                INNER JOIN repositories AS r
                    ON r.repository_id = s.repository_id
                WHERE s.snapshot_date = ?
                GROUP BY r.organization
                ORDER BY total_views_14d DESC, r.organization
                """,
                (latest_snapshot_date,),
            )

        snapshot_history = fetch_rows(
            connection,
            """
            SELECT
                r.repository_full_name,
                r.repository,
                r.organization,
                s.snapshot_date,
                s.unique_visitors_14d,
                s.unique_cloners_14d,
                s.total_views_14d
            FROM screening_snapshot AS s
            INNER JOIN repositories AS r
                ON r.repository_id = s.repository_id
            ORDER BY s.snapshot_date, r.repository_full_name
            """
        )

        daily_traffic = fetch_rows(
            connection,
            """
            SELECT
                r.repository_full_name,
                r.repository,
                r.organization,
                d.metric_date,
                d.views_count,
                d.views_uniques,
                d.clones_count,
                d.clones_uniques,
                d.collected_at
            FROM daily_traffic AS d
            INNER JOIN repositories AS r
                ON r.repository_id = d.repository_id
            ORDER BY d.metric_date, r.repository_full_name
            """
        )

        import_runs = fetch_rows(
            connection,
            """
            SELECT
                import_run_id,
                imported_at,
                source_workbook,
                source_script,
                output_database,
                rows_read,
                repositories_processed,
                screening_snapshots_processed,
                daily_traffic_processed,
                replace_mode,
                notes
            FROM import_runs
            ORDER BY import_run_id DESC
            LIMIT 20
            """
        )

    payload = {
        "meta": {
            "generated_at": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "source_database": str(input_database),
            "source_script": f"06_Export_SQLite_To_JSON.py v{SCRIPT_VERSION}",
        },
        "summary": summary,
        "organizations": organizations,
        "current_snapshot": current_snapshot,
        "organization_snapshot_totals": organization_snapshot_totals,
        "snapshot_history": snapshot_history,
        "daily_traffic": daily_traffic,
        "import_runs": import_runs,
    }
    return payload


def write_json(output_json: Path, payload: dict) -> None:
    output_json.parent.mkdir(parents=True, exist_ok=True)
    output_json.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def write_javascript(output_javascript: Path, payload: dict) -> None:
    output_javascript.parent.mkdir(parents=True, exist_ok=True)
    script_content = (
        "// Auto-generated by 06_Export_SQLite_To_JSON.py. Do not edit manually.\n"
        "window.DASHBOARD_DATA = "
        f"{json.dumps(payload, indent=2)};\n"
    )
    output_javascript.write_text(script_content, encoding="utf-8")


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    input_database = resolve_input_database(args.input_database)
    if not input_database.is_file():
        raise SystemExit(f"Input database not found: {input_database}")

    output_json = resolve_output_json(args.output_json)
    output_javascript = output_json.with_suffix(".js")
    payload = build_export_payload(input_database)
    write_json(output_json, payload)
    write_javascript(output_javascript, payload)
    print(f"Input database: {input_database}")
    print(f"Output JSON: {output_json}")
    print(f"Output JavaScript: {output_javascript}")
    print(f"Repositories exported: {payload['summary'].get('repository_count', 0)}")
    print(f"Daily traffic rows exported: {payload['summary'].get('daily_traffic_count', 0)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
