"""Collect daily GitHub traffic into Repository_Analysis.sqlite.

Description:
Read tracked repositories from ``Repository_Analysis.sqlite``, call the GitHub
repository API plus the repository traffic ``views`` and ``clones`` endpoints,
refresh repository metadata, update the rolling 14-day screening snapshot for
the collection date, and upsert the daily traffic buckets into
``daily_traffic``.

Parameters:
- ``input_database``: path to ``Repository_Analysis.sqlite``. Default:
  ``<repo_root>/data/db/Repository_Analysis.sqlite``.
- ``--organization``: optional organization filter. Only repositories for this
  organization are processed.
- ``--max-repositories``: optional integer limit for the number of repositories
  to process.
- ``--collection-date``: optional date in ``YYYY-MM-DD`` format. This is used
  for ``screening_snapshot.snapshot_date`` and for
  ``repositories.days_since_last_push``. Default: today's UTC date.
- ``--request-delay-seconds``: optional delay between repositories. Default:
  ``0.0``.

Calling format:
    python scripts/07_Collect_Daily_Traffic.py [input_database]
    python scripts/07_Collect_Daily_Traffic.py [input_database] --organization <organization>
    python scripts/07_Collect_Daily_Traffic.py [input_database] --max-repositories <count>

Example:
    python scripts/07_Collect_Daily_Traffic.py data/db/Repository_Analysis.sqlite

Authentication:
The script uses ``GITHUB_TOKEN`` or ``GH_TOKEN`` when available and otherwise
tries ``gh auth token``. Public repository metadata can often be read without a
token, but the GitHub traffic endpoints usually require authenticated access
with sufficient repository permissions.

Dependencies:
The script uses the Python standard library only.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sqlite3
import subprocess
import sys
import time
from dataclasses import dataclass
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen


SCRIPT_VERSION = "1.0.0"
API_ROOT = "https://api.github.com"
API_VERSION = "2026-03-10"
REQUEST_TIMEOUT_SECONDS = 30
DEFAULT_DATABASE_SUBDIR = Path("data") / "db"
DEFAULT_DATABASE_NAME = "Repository_Analysis.sqlite"
DEFAULT_REQUEST_DELAY_SECONDS = 0.0
SOURCE_LABEL = f"07_Collect_Daily_Traffic.py v{SCRIPT_VERSION}"

STATUS_OK = "OK"
STATUS_PARTIAL = "PARTIAL"
STATUS_RESTRICTED = "RESTRICTED"
STATUS_NOT_FOUND = "NOT_FOUND"
STATUS_ERROR = "ERROR"

REQUIRED_TABLES = (
    "repositories",
    "screening_snapshot",
    "daily_traffic",
)


@dataclass(frozen=True)
class RepositoryRecord:
    repository_id: int
    repository_full_name: str
    repository: str
    organization: str


@dataclass(frozen=True)
class EndpointResult:
    status: str
    payload: Any | None
    message: str

    @property
    def ok(self) -> bool:
        return self.status == STATUS_OK


@dataclass(frozen=True)
class CollectionResult:
    repository_full_name: str
    traffic_status: str
    status_message: str
    screening_snapshot_upserted: int
    daily_rows_upserted: int


class GitHubApiError(RuntimeError):
    """Raised when the GitHub API returns an error response."""

    def __init__(self, path: str, status_code: int | None, message: str) -> None:
        super().__init__(message)
        self.path = path
        self.status_code = status_code


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Read Repository_Analysis.sqlite, collect GitHub traffic buckets, "
            "refresh repository metadata, and upsert daily facts."
        )
    )
    parser.add_argument(
        "input_database",
        nargs="?",
        type=Path,
        help="Source SQLite database path. Default: <repo_root>/data/db/Repository_Analysis.sqlite.",
    )
    parser.add_argument(
        "--organization",
        help="Optional organization filter. Only repositories for this organization are processed.",
    )
    parser.add_argument(
        "--max-repositories",
        type=int,
        help="Optional limit for the number of repositories to process.",
    )
    parser.add_argument(
        "--collection-date",
        type=parse_collection_date,
        help=(
            "Optional collection date in YYYY-MM-DD format. "
            "Default: today's UTC date."
        ),
    )
    parser.add_argument(
        "--request-delay-seconds",
        type=float,
        default=DEFAULT_REQUEST_DELAY_SECONDS,
        help=(
            "Optional delay between repositories in seconds. "
            f"Default: {DEFAULT_REQUEST_DELAY_SECONDS}."
        ),
    )
    parser.add_argument(
        "--version",
        action="version",
        version=f"%(prog)s {SCRIPT_VERSION}",
    )
    return parser.parse_args(argv)


def parse_collection_date(value: str) -> date:
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError as error:
        raise argparse.ArgumentTypeError(
            f"Invalid collection date '{value}'. Use YYYY-MM-DD."
        ) from error


def get_repository_root() -> Path:
    return Path(__file__).resolve().parent.parent


def resolve_input_database(input_database: Path | None) -> Path:
    if input_database is not None:
        return input_database.expanduser().resolve()
    return get_repository_root() / DEFAULT_DATABASE_SUBDIR / DEFAULT_DATABASE_NAME


def resolve_token() -> str:
    for env_name in ("GITHUB_TOKEN", "GH_TOKEN"):
        token = os.getenv(env_name, "").strip()
        if token:
            return token

    if shutil.which("gh"):
        completed = subprocess.run(
            ["gh", "auth", "token"],
            check=False,
            capture_output=True,
            text=True,
        )
        token = completed.stdout.strip()
        if completed.returncode == 0 and token:
            return token

    return ""


def build_headers(token: str) -> dict[str, str]:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": f"07_Collect_Daily_Traffic.py/{SCRIPT_VERSION}",
        "X-GitHub-Api-Version": API_VERSION,
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def request_json(token: str, path: str, params: dict[str, Any] | None = None) -> Any:
    query = ""
    if params:
        query = "?" + urlencode(params)

    request = Request(API_ROOT + path + query, headers=build_headers(token))
    try:
        with urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            payload = response.read().decode("utf-8")
            return json.loads(payload)
    except HTTPError as error:
        message = read_error_message(error)
        accepted_permissions = error.headers.get("X-Accepted-GitHub-Permissions", "")
        if accepted_permissions:
            message = f"{message} | accepted_permissions={accepted_permissions}"
        raise GitHubApiError(
            path=path,
            status_code=error.code,
            message=f"HTTP {error.code} {message}",
        ) from error
    except URLError as error:
        raise GitHubApiError(
            path=path,
            status_code=None,
            message=f"Network error: {error}",
        ) from error


def read_error_message(error: HTTPError) -> str:
    try:
        payload = error.read().decode("utf-8")
        data = json.loads(payload)
    except Exception:
        return str(error.reason or "Unknown error")

    if isinstance(data, dict):
        message = str(data.get("message", "")).strip()
        errors = data.get("errors")
        if message and errors:
            return f"{message}; errors={errors}"
        if message:
            return message
    return str(error.reason or "Unknown error")


def map_error_status(error: GitHubApiError) -> str:
    if error.status_code == 403:
        return STATUS_RESTRICTED
    if error.status_code == 404:
        return STATUS_NOT_FOUND
    return STATUS_ERROR


def fetch_endpoint(
    token: str,
    path: str,
    params: dict[str, Any] | None = None,
) -> EndpointResult:
    try:
        payload = request_json(token, path, params)
    except GitHubApiError as error:
        return EndpointResult(
            status=map_error_status(error),
            payload=None,
            message=str(error),
        )

    return EndpointResult(status=STATUS_OK, payload=payload, message="OK")


def ensure_database_schema(connection: sqlite3.Connection) -> None:
    existing_tables = {
        row[0]
        for row in connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        ).fetchall()
    }
    missing_tables = [table_name for table_name in REQUIRED_TABLES if table_name not in existing_tables]
    if missing_tables:
        joined_tables = ", ".join(missing_tables)
        raise SystemExit(
            "The SQLite database does not contain the required tables: "
            f"{joined_tables}. Create or refresh the database with "
            "05_Create_SQLite_Database.py first."
        )


def read_repositories(
    connection: sqlite3.Connection,
    organization: str | None,
    max_repositories: int | None,
) -> list[RepositoryRecord]:
    query = """
        SELECT
            repository_id,
            repository_full_name,
            repository,
            organization
        FROM repositories
        WHERE repository_full_name IS NOT NULL
          AND repository_full_name <> ''
    """
    parameters: list[Any] = []

    if organization:
        query += " AND organization = ?"
        parameters.append(organization)

    query += " ORDER BY organization, repository_full_name"

    if max_repositories is not None:
        query += " LIMIT ?"
        parameters.append(max_repositories)

    rows = connection.execute(query, tuple(parameters)).fetchall()
    return [
        RepositoryRecord(
            repository_id=int(row[0]),
            repository_full_name=str(row[1]),
            repository=str(row[2]),
            organization=str(row[3]),
        )
        for row in rows
    ]


def split_repository_full_name(repository_full_name: str) -> tuple[str, str]:
    parts = repository_full_name.split("/", 1)
    if len(parts) != 2 or not parts[0] or not parts[1]:
        raise ValueError(
            f"Invalid repository_full_name '{repository_full_name}'. Expected owner/repository."
        )
    return parts[0], parts[1]


def normalize_owner_login(owner_login: Any) -> str | None:
    if owner_login is None:
        return None
    normalized = str(owner_login).strip()
    if not normalized:
        return None
    return normalized.lower()


def build_repository_full_name(owner_login: str | None, repository_name: str | None) -> str | None:
    if not owner_login or not repository_name:
        return None
    return f"{owner_login}/{repository_name}"


def parse_timestamp(timestamp: str | None) -> datetime | None:
    if not timestamp:
        return None
    try:
        parsed = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    else:
        parsed = parsed.astimezone(UTC)
    return parsed


def normalize_datetime_text(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    else:
        value = value.astimezone(UTC)
    return value.strftime("%Y-%m-%dT%H:%M:%SZ")


def normalize_date_text(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()

    normalized = str(value).strip()
    if not normalized:
        return None

    parsed = parse_timestamp(normalized)
    if parsed is not None:
        return parsed.date().isoformat()

    try:
        return datetime.strptime(normalized, "%Y-%m-%d").date().isoformat()
    except ValueError:
        return None


def normalize_integer(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)

    normalized = str(value).strip()
    if not normalized:
        return None
    try:
        return int(float(normalized))
    except ValueError:
        return None


def normalize_boolean_integer(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return 1 if value else 0

    normalized = str(value).strip().upper()
    if not normalized:
        return None
    if normalized == "TRUE":
        return 1
    if normalized == "FALSE":
        return 0
    return None


def calculate_days_since_last_push(
    collection_date: date,
    pushed_at: datetime | None,
) -> int | None:
    if pushed_at is None:
        return None
    return max(0, (collection_date - pushed_at.date()).days)


def build_daily_records(
    views_payload: Any | None,
    clones_payload: Any | None,
) -> dict[str, dict[str, int | None]]:
    records: dict[str, dict[str, int | None]] = {}

    if isinstance(views_payload, dict):
        for item in views_payload.get("views", []):
            metric_date = normalize_date_text(item.get("timestamp"))
            if not metric_date:
                continue
            record = records.setdefault(
                metric_date,
                {
                    "views_count": None,
                    "views_uniques": None,
                    "clones_count": None,
                    "clones_uniques": None,
                },
            )
            record["views_count"] = normalize_integer(item.get("count"))
            record["views_uniques"] = normalize_integer(item.get("uniques"))

    if isinstance(clones_payload, dict):
        for item in clones_payload.get("clones", []):
            metric_date = normalize_date_text(item.get("timestamp"))
            if not metric_date:
                continue
            record = records.setdefault(
                metric_date,
                {
                    "views_count": None,
                    "views_uniques": None,
                    "clones_count": None,
                    "clones_uniques": None,
                },
            )
            record["clones_count"] = normalize_integer(item.get("count"))
            record["clones_uniques"] = normalize_integer(item.get("uniques"))

    return records


def build_traffic_status(
    metadata_result: EndpointResult,
    views_result: EndpointResult,
    clones_result: EndpointResult,
) -> tuple[str, str]:
    if not metadata_result.ok:
        return metadata_result.status, metadata_result.message

    if views_result.ok and clones_result.ok:
        return STATUS_OK, "Views and clones collected successfully."

    if views_result.ok or clones_result.ok:
        return (
            STATUS_PARTIAL,
            f"views={views_result.status}; clones={clones_result.status}",
        )

    if views_result.status == clones_result.status:
        return views_result.status, f"views={views_result.message}; clones={clones_result.message}"

    return STATUS_ERROR, f"views={views_result.status}; clones={clones_result.status}"


def update_repository_metadata(
    connection: sqlite3.Connection,
    repository_id: int,
    repo_data: Any | None,
    traffic_status: str,
    updated_at: str,
    collection_date: date,
) -> None:
    repository_full_name = None
    repository = None
    organization = None
    link_2_repository = None
    visibility = None
    archived = None
    last_push = None
    days_since_last_push = None
    forks_count = None
    stargazers_count = None
    open_issues_count = None

    if isinstance(repo_data, dict):
        repository = repo_data.get("name")
        owner_data = repo_data.get("owner") or {}
        if isinstance(owner_data, dict):
            organization = normalize_owner_login(owner_data.get("login"))
        repository_full_name = build_repository_full_name(organization, repository)
        if repository_full_name is None:
            repository_full_name = repo_data.get("full_name")
        link_2_repository = repo_data.get("html_url")
        visibility = repo_data.get("visibility")
        archived = normalize_boolean_integer(repo_data.get("archived"))
        pushed_at = parse_timestamp(repo_data.get("pushed_at"))
        last_push = normalize_datetime_text(pushed_at)
        days_since_last_push = calculate_days_since_last_push(collection_date, pushed_at)
        forks_count = normalize_integer(repo_data.get("forks_count"))
        stargazers_count = normalize_integer(repo_data.get("stargazers_count"))
        open_issues_count = normalize_integer(repo_data.get("open_issues_count"))

    connection.execute(
        """
        UPDATE repositories
        SET
            repository_full_name = COALESCE(?, repository_full_name),
            repository = COALESCE(?, repository),
            organization = COALESCE(?, organization),
            link_2_repository = COALESCE(?, link_2_repository),
            visibility = COALESCE(?, visibility),
            archived = CASE
                WHEN ? IS NOT NULL THEN ?
                ELSE archived
            END,
            last_push = COALESCE(?, last_push),
            days_since_last_push = CASE
                WHEN ? IS NOT NULL THEN ?
                ELSE days_since_last_push
            END,
            traffic_status = ?,
            forks_count = CASE
                WHEN ? IS NOT NULL THEN ?
                ELSE forks_count
            END,
            stargazers_count = CASE
                WHEN ? IS NOT NULL THEN ?
                ELSE stargazers_count
            END,
            open_issues_count = CASE
                WHEN ? IS NOT NULL THEN ?
                ELSE open_issues_count
            END,
            updated_at = ?
        WHERE repository_id = ?
        """,
        (
            repository_full_name,
            repository,
            organization,
            link_2_repository,
            visibility,
            archived,
            archived,
            last_push,
            days_since_last_push,
            days_since_last_push,
            traffic_status,
            forks_count,
            forks_count,
            stargazers_count,
            stargazers_count,
            open_issues_count,
            open_issues_count,
            updated_at,
            repository_id,
        ),
    )


def upsert_screening_snapshot(
    connection: sqlite3.Connection,
    repository_id: int,
    collection_date: date,
    views_payload: Any | None,
    clones_payload: Any | None,
    collected_at: str,
) -> int:
    unique_visitors_14d = None
    unique_cloners_14d = None
    total_views_14d = None

    if isinstance(views_payload, dict):
        unique_visitors_14d = normalize_integer(views_payload.get("uniques"))
        total_views_14d = normalize_integer(views_payload.get("count"))
    if isinstance(clones_payload, dict):
        unique_cloners_14d = normalize_integer(clones_payload.get("uniques"))

    if (
        unique_visitors_14d is None
        and unique_cloners_14d is None
        and total_views_14d is None
    ):
        return 0

    connection.execute(
        """
        INSERT INTO screening_snapshot (
            repository_id,
            snapshot_date,
            unique_visitors_14d,
            unique_cloners_14d,
            total_views_14d,
            collected_at,
            source_workbook,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(repository_id, snapshot_date) DO UPDATE SET
            unique_visitors_14d = COALESCE(
                excluded.unique_visitors_14d,
                screening_snapshot.unique_visitors_14d
            ),
            unique_cloners_14d = COALESCE(
                excluded.unique_cloners_14d,
                screening_snapshot.unique_cloners_14d
            ),
            total_views_14d = COALESCE(
                excluded.total_views_14d,
                screening_snapshot.total_views_14d
            ),
            collected_at = COALESCE(excluded.collected_at, screening_snapshot.collected_at),
            source_workbook = excluded.source_workbook,
            updated_at = excluded.updated_at
        """,
        (
            repository_id,
            collection_date.isoformat(),
            unique_visitors_14d,
            unique_cloners_14d,
            total_views_14d,
            collected_at,
            SOURCE_LABEL,
            collected_at,
            collected_at,
        ),
    )
    return 1


def upsert_daily_traffic_rows(
    connection: sqlite3.Connection,
    repository_id: int,
    daily_records: dict[str, dict[str, int | None]],
    collected_at: str,
) -> int:
    rows_upserted = 0

    for metric_date in sorted(daily_records):
        record = daily_records[metric_date]
        if all(value is None for value in record.values()):
            continue

        connection.execute(
            """
            INSERT INTO daily_traffic (
                repository_id,
                metric_date,
                views_count,
                views_uniques,
                clones_count,
                clones_uniques,
                collected_at,
                source_workbook,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(repository_id, metric_date) DO UPDATE SET
                views_count = COALESCE(excluded.views_count, daily_traffic.views_count),
                views_uniques = COALESCE(excluded.views_uniques, daily_traffic.views_uniques),
                clones_count = COALESCE(excluded.clones_count, daily_traffic.clones_count),
                clones_uniques = COALESCE(excluded.clones_uniques, daily_traffic.clones_uniques),
                collected_at = COALESCE(excluded.collected_at, daily_traffic.collected_at),
                source_workbook = excluded.source_workbook,
                updated_at = excluded.updated_at
            """,
            (
                repository_id,
                metric_date,
                record["views_count"],
                record["views_uniques"],
                record["clones_count"],
                record["clones_uniques"],
                collected_at,
                SOURCE_LABEL,
                collected_at,
                collected_at,
            ),
        )
        rows_upserted += 1

    return rows_upserted


def process_repository(
    connection: sqlite3.Connection,
    token: str,
    repository: RepositoryRecord,
    collection_date: date,
) -> CollectionResult:
    owner, repo_name = split_repository_full_name(repository.repository_full_name)
    owner_quoted = quote(owner, safe="")
    repo_quoted = quote(repo_name, safe="")

    metadata_result = fetch_endpoint(token, f"/repos/{owner_quoted}/{repo_quoted}")

    if metadata_result.ok and isinstance(metadata_result.payload, dict):
        owner_data = metadata_result.payload.get("owner") or {}
        canonical_owner = None
        if isinstance(owner_data, dict):
            canonical_owner = normalize_owner_login(owner_data.get("login"))
        canonical_repository = metadata_result.payload.get("name")
        full_name = build_repository_full_name(canonical_owner, canonical_repository)
        if full_name is None:
            full_name = str(metadata_result.payload.get("full_name") or repository.repository_full_name)
        owner, repo_name = split_repository_full_name(full_name)
        owner_quoted = quote(owner, safe="")
        repo_quoted = quote(repo_name, safe="")
        views_result = fetch_endpoint(
            token,
            f"/repos/{owner_quoted}/{repo_quoted}/traffic/views",
            {"per": "day"},
        )
        clones_result = fetch_endpoint(
            token,
            f"/repos/{owner_quoted}/{repo_quoted}/traffic/clones",
            {"per": "day"},
        )
    else:
        views_result = EndpointResult(
            status=metadata_result.status,
            payload=None,
            message="Skipped because repository metadata could not be read.",
        )
        clones_result = EndpointResult(
            status=metadata_result.status,
            payload=None,
            message="Skipped because repository metadata could not be read.",
        )

    traffic_status, status_message = build_traffic_status(
        metadata_result,
        views_result,
        clones_result,
    )

    collected_at = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    update_repository_metadata(
        connection,
        repository.repository_id,
        metadata_result.payload,
        traffic_status,
        collected_at,
        collection_date,
    )

    screening_snapshot_upserted = upsert_screening_snapshot(
        connection,
        repository.repository_id,
        collection_date,
        views_result.payload if views_result.ok else None,
        clones_result.payload if clones_result.ok else None,
        collected_at,
    )

    daily_records = build_daily_records(
        views_result.payload if views_result.ok else None,
        clones_result.payload if clones_result.ok else None,
    )
    daily_rows_upserted = upsert_daily_traffic_rows(
        connection,
        repository.repository_id,
        daily_records,
        collected_at,
    )

    return CollectionResult(
        repository_full_name=repository.repository_full_name,
        traffic_status=traffic_status,
        status_message=status_message,
        screening_snapshot_upserted=screening_snapshot_upserted,
        daily_rows_upserted=daily_rows_upserted,
    )


def print_summary(
    input_database: Path,
    repositories: list[RepositoryRecord],
    results: list[CollectionResult],
    collection_date: date,
) -> None:
    status_counts: dict[str, int] = {}
    screening_snapshot_upserts = 0
    daily_rows_upserted = 0

    for result in results:
        status_counts[result.traffic_status] = status_counts.get(result.traffic_status, 0) + 1
        screening_snapshot_upserts += result.screening_snapshot_upserted
        daily_rows_upserted += result.daily_rows_upserted

    print(f"Input database: {input_database}")
    print(f"Collection date: {collection_date.isoformat()}")
    print(f"Repositories selected: {len(repositories)}")
    print(f"Screening snapshots upserted: {screening_snapshot_upserts}")
    print(f"Daily traffic rows upserted: {daily_rows_upserted}")

    if status_counts:
        for status_name in sorted(status_counts):
            print(f"Repositories with status {status_name}: {status_counts[status_name]}")


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    input_database = resolve_input_database(args.input_database)
    if not input_database.is_file():
        raise SystemExit(f"Input database not found: {input_database}")
    if args.max_repositories is not None and args.max_repositories <= 0:
        raise SystemExit("--max-repositories must be greater than zero.")
    if args.request_delay_seconds < 0:
        raise SystemExit("--request-delay-seconds must not be negative.")

    collection_date = args.collection_date or datetime.now(UTC).date()
    token = resolve_token()
    if not token:
        print(
            (
                "No GitHub token was found in GITHUB_TOKEN, GH_TOKEN, or `gh auth token`. "
                "Public repository metadata may still be readable, but traffic endpoints "
                "often return RESTRICTED without authenticated access."
            ),
            file=sys.stderr,
        )

    with sqlite3.connect(input_database) as connection:
        connection.execute("PRAGMA foreign_keys = ON")
        ensure_database_schema(connection)
        repositories = read_repositories(
            connection,
            args.organization,
            args.max_repositories,
        )

        if not repositories:
            raise SystemExit("No repositories matched the requested filter.")

        results: list[CollectionResult] = []
        for index, repository in enumerate(repositories, start=1):
            print(
                f"[{index}/{len(repositories)}] Collecting {repository.repository_full_name}",
                file=sys.stderr,
            )
            try:
                result = process_repository(
                    connection,
                    token,
                    repository,
                    collection_date,
                )
                # Commit per repository so scheduled runs keep partial progress if interrupted.
                connection.commit()
            except Exception as error:
                connection.rollback()
                result = CollectionResult(
                    repository_full_name=repository.repository_full_name,
                    traffic_status=STATUS_ERROR,
                    status_message=str(error),
                    screening_snapshot_upserted=0,
                    daily_rows_upserted=0,
                )
                connection.execute(
                    """
                    UPDATE repositories
                    SET traffic_status = ?, updated_at = ?
                    WHERE repository_id = ?
                    """,
                    (
                        STATUS_ERROR,
                        datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
                        repository.repository_id,
                    ),
                )
                connection.commit()

            results.append(result)
            print(
                (
                    f"    -> {result.traffic_status}, "
                    f"snapshot_upserted={result.screening_snapshot_upserted}, "
                    f"daily_rows_upserted={result.daily_rows_upserted}"
                ),
                file=sys.stderr,
            )
            if result.traffic_status not in (STATUS_OK, STATUS_PARTIAL):
                print(f"       {result.status_message}", file=sys.stderr)

            if args.request_delay_seconds:
                time.sleep(args.request_delay_seconds)

    print_summary(
        input_database,
        repositories,
        results,
        collection_date,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
