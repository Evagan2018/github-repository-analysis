"""Export filtered GitHub organization repositories and traffic metrics to CSV.

Description:
Read repositories from a GitHub organization, filter them by visibility,
archive status, and activity, then write a comma-separated output file with
repository metadata and traffic metrics.

Parameters:
- ``GH_organization``: GitHub organization name, for example ``arm-software``.
- ``output_file``: target CSV file, for example ``arm-software_raw_list.csv``.

Calling format:
    python scripts/01_Get_Repositories.py <GH_organization> <output_file>

Example:
    python scripts/01_Get_Repositories.py arm-software data/raw/arm-software_raw_list.csv

Authentication:
The script requires a GitHub token for the traffic metrics endpoints.
Set ``GITHUB_TOKEN`` or ``GH_TOKEN`` before running the script, or authenticate
with the GitHub CLI so the script can reuse ``gh auth token``.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen


SCRIPT_VERSION = "1.0.1"
API_ROOT = "https://api.github.com"
API_VERSION = "2026-03-10"
REQUEST_TIMEOUT_SECONDS = 30
PER_PAGE = 100
ACTIVITY_CUTOFF = datetime(2024, 6, 1, tzinfo=UTC)

SUPPORTED_ORGANIZATIONS = {
    "arm-software",
    "arm-examples",
    "open-cmisis-pack",
    "mdk-packs",
}

ORGANIZATION_ALIASES = {
    "open-cmisis-pack": "Open-CMSIS-Pack",
}

CSV_COLUMNS = [
    "repository",
    "last_push",
    "visibility",
    "archived",
    "unique_visitors_14d",
    "unique_cloners_14d",
    "total_views_14d",
    "traffic_status",
]

FIELD_DESCRIPTIONS = {
    "repository": "Repository name in the selected GitHub organization.",
    "last_push": "Timestamp of the latest push reported by GitHub.",
    "visibility": "Normalized repository visibility status after API readout.",
    "archived": "Archive flag returned by GitHub for the repository.",
    "unique_visitors_14d": "Unique repository visitors in the last 14 days.",
    "unique_cloners_14d": "Unique repository cloners in the last 14 days.",
    "total_views_14d": "Total repository page views in the last 14 days.",
    "traffic_status": "Traffic readout result, for example OK or an API access message.",
}


@dataclass(frozen=True)
class RepositoryRecord:
    name: str
    last_push: str
    visibility: str
    archived: bool


@dataclass(frozen=True)
class TrafficMetrics:
    unique_visitors_14d: int
    unique_cloners_14d: int
    total_views_14d: int
    traffic_status: str = "OK"


class GitHubApiError(RuntimeError):
    """Raised when the GitHub API returns an error response."""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Read repositories from a GitHub organization, filter them, and "
            "write a CSV file with repository and traffic information."
        ),
        epilog=(
            "Recommended organizations: arm-software, arm-examples, "
            "open-cmisis-pack, mdk-packs"
        ),
    )
    parser.add_argument("GH_organization", help="GitHub organization name.")
    parser.add_argument("output_file", type=Path, help="Target CSV output file.")
    return parser.parse_args()


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

    raise SystemExit(
        "Missing GitHub token. Set GITHUB_TOKEN or GH_TOKEN, or authenticate "
        "with the GitHub CLI so `gh auth token` is available."
    )


def resolve_organization_name(requested_name: str) -> str:
    normalized = requested_name.strip()
    return ORGANIZATION_ALIASES.get(normalized.lower(), normalized)


def build_headers(token: str) -> dict[str, str]:
    return {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "User-Agent": f"01_Get_Repositories.py/{SCRIPT_VERSION}",
        "X-GitHub-Api-Version": API_VERSION,
    }


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
            f"GitHub API request failed for {path}: HTTP {error.code} {message}"
        ) from error
    except URLError as error:
        raise GitHubApiError(f"Network error while calling GitHub API: {error}") from error


def read_error_message(error: HTTPError) -> str:
    try:
        payload = error.read().decode("utf-8")
        data = json.loads(payload)
    except Exception:
        return error.reason or "Unknown error"

    if isinstance(data, dict):
        message = str(data.get("message", "")).strip()
        errors = data.get("errors")
        if message and errors:
            return f"{message}; errors={errors}"
        if message:
            return message
    return error.reason or "Unknown error"


def normalize_visibility(repo_data: dict[str, Any]) -> str:
    visibility = str(repo_data.get("visibility", "")).strip().upper()
    if visibility in {"PUBLIC", "PRIVATE", "INTERNAL"}:
        return visibility

    private_flag = repo_data.get("private")
    if private_flag is True:
        return "PRIVATE"
    if private_flag is False:
        return "PUBLIC"
    return "UNCLEAR"


def parse_timestamp(timestamp: str | None) -> datetime | None:
    if not timestamp:
        return None
    return datetime.strptime(timestamp, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=UTC)


def list_filtered_repositories(token: str, organization: str) -> tuple[list[RepositoryRecord], dict[str, int]]:
    page = 1
    included: list[RepositoryRecord] = []
    stats = {
        "fetched": 0,
        "excluded_visibility": 0,
        "excluded_archived": 0,
        "excluded_activity": 0,
        "included": 0,
    }

    while True:
        repo_page = request_json(
            token,
            f"/orgs/{quote(organization, safe='')}/repos",
            params={
                "type": "all",
                "sort": "pushed",
                "direction": "desc",
                "per_page": PER_PAGE,
                "page": page,
            },
        )

        if not repo_page:
            break

        stop_pagination = False
        for repo_data in repo_page:
            stats["fetched"] += 1

            pushed_at = parse_timestamp(repo_data.get("pushed_at"))
            if pushed_at is None or pushed_at < ACTIVITY_CUTOFF:
                stats["excluded_activity"] += 1
                stop_pagination = True
                continue

            visibility = normalize_visibility(repo_data)
            if visibility in {"PRIVATE", "INTERNAL", "UNCLEAR"}:
                stats["excluded_visibility"] += 1
                continue

            if bool(repo_data.get("archived")):
                stats["excluded_archived"] += 1
                continue

            included.append(
                RepositoryRecord(
                    name=str(repo_data["name"]),
                    last_push=str(repo_data["pushed_at"]),
                    visibility=visibility,
                    archived=bool(repo_data.get("archived")),
                )
            )
            stats["included"] += 1

        if stop_pagination or len(repo_page) < PER_PAGE:
            break

        page += 1

    return included, stats


def get_traffic_metrics(token: str, organization: str, repository: str) -> TrafficMetrics:
    owner = quote(organization, safe="")
    repo = quote(repository, safe="")

    try:
        views = request_json(token, f"/repos/{owner}/{repo}/traffic/views")
        clones = request_json(token, f"/repos/{owner}/{repo}/traffic/clones")
    except GitHubApiError as error:
        return TrafficMetrics(
            unique_visitors_14d=-1,
            unique_cloners_14d=-1,
            total_views_14d=-1,
            traffic_status=build_traffic_status(error),
        )

    return TrafficMetrics(
        unique_visitors_14d=int(views.get("uniques", 0)),
        unique_cloners_14d=int(clones.get("uniques", 0)),
        total_views_14d=int(views.get("count", 0)),
    )


def build_traffic_status(error: GitHubApiError) -> str:
    message = str(error)
    if "HTTP 403" in message:
        return "RESTRICTED: " + message.split("HTTP 403", 1)[-1].strip()
    if "HTTP 404" in message:
        return "NOT_AVAILABLE: " + message.split("HTTP 404", 1)[-1].strip()
    if "HTTP " in message:
        return message.split("GitHub API request failed for ", 1)[-1]
    return message


def write_csv(
    output_path: Path,
    requested_organization: str,
    api_organization: str,
    repositories: list[RepositoryRecord],
    metrics_by_repository: dict[str, TrafficMetrics],
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    generated_on = datetime.now(UTC).strftime("%Y-%m-%d")

    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)

        writer.writerow(["# Revision History"])
        writer.writerow(["# Author", "OpenAI Codex"])
        writer.writerow(["# Date", generated_on])
        writer.writerow(
            ["# Change", f"Initial repository export generated by 01_Get_Repositories.py v{SCRIPT_VERSION}"]
        )
        writer.writerow([])
        writer.writerow(["# File Description"])
        writer.writerow(
            [
                "# Summary",
                (
                    "Repository data read from a GitHub organization and filtered "
                    "automatically by visibility, archive status, and activity cutoff."
                ),
            ]
        )
        writer.writerow(
            [
                "# Generation Process",
                (
                    "Two-stage process: stage 1 automated export by script; stage 2 "
                    "optional manual filtering if repository-side tags or metadata are missing."
                ),
            ]
        )
        writer.writerow(
            ["# Source Script", f"01_Get_Repositories.py v{SCRIPT_VERSION}"]
        )
        writer.writerow(
            [
                "# Suggested Workflows",
                (
                    "Excel review, manual repository qualification, and follow-on "
                    "automation workflows that consume repository lists."
                ),
            ]
        )
        writer.writerow(["# Organization", requested_organization])
        if requested_organization != api_organization:
            writer.writerow(["# GitHub API Organization", api_organization])
        writer.writerow(["# Activity Cutoff", ACTIVITY_CUTOFF.strftime("%Y-%m-%d")])
        writer.writerow([])
        writer.writerow(["# Field Descriptions"])
        for field_name, description in FIELD_DESCRIPTIONS.items():
            writer.writerow([f"# {field_name}", description])
        writer.writerow([])
        writer.writerow(CSV_COLUMNS)

        for repository in repositories:
            metrics = metrics_by_repository[repository.name]
            writer.writerow(
                [
                    repository.name,
                    repository.last_push,
                    repository.visibility,
                    str(repository.archived).upper(),
                    "" if metrics.unique_visitors_14d < 0 else metrics.unique_visitors_14d,
                    "" if metrics.unique_cloners_14d < 0 else metrics.unique_cloners_14d,
                    "" if metrics.total_views_14d < 0 else metrics.total_views_14d,
                    metrics.traffic_status,
                ]
            )


def print_summary(
    output_path: Path,
    requested_organization: str,
    api_organization: str,
    stats: dict[str, int],
    written_rows: int,
    traffic_ok: int,
    traffic_restricted: int,
) -> None:
    print(f"Organization: {requested_organization}")
    if requested_organization != api_organization:
        print(f"GitHub API organization: {api_organization}")
    if requested_organization not in SUPPORTED_ORGANIZATIONS:
        print(
            "Note: organization is outside the originally requested set "
            f"{sorted(SUPPORTED_ORGANIZATIONS)}",
            file=sys.stderr,
        )
    print(f"Activity cutoff: {ACTIVITY_CUTOFF.strftime('%Y-%m-%d')}")
    print(f"Repositories fetched: {stats['fetched']}")
    print(f"Excluded by visibility: {stats['excluded_visibility']}")
    print(f"Excluded by archived flag: {stats['excluded_archived']}")
    print(f"Excluded by activity: {stats['excluded_activity']}")
    print(f"Traffic rows with metrics: {traffic_ok}")
    print(f"Traffic rows with restricted access: {traffic_restricted}")
    print(f"Rows written: {written_rows}")
    print(f"Output file: {output_path}")


def main() -> None:
    args = parse_args()
    requested_organization = args.GH_organization.strip()
    organization = resolve_organization_name(requested_organization)
    output_path = args.output_file.expanduser().resolve()
    token = resolve_token()

    try:
        repositories, stats = list_filtered_repositories(token, organization)
    except GitHubApiError as error:
        raise SystemExit(
            f"Unable to read repositories for organization '{requested_organization}' "
            f"(GitHub API name '{organization}'): {error}"
        ) from error
    metrics_by_repository: dict[str, TrafficMetrics] = {}
    traffic_ok = 0
    traffic_restricted = 0

    for index, repository in enumerate(repositories, start=1):
        print(
            f"[{index}/{len(repositories)}] Reading traffic metrics for "
            f"{organization}/{repository.name}",
            file=sys.stderr,
        )
        metrics = get_traffic_metrics(
            token, organization, repository.name
        )
        metrics_by_repository[repository.name] = metrics
        if metrics.traffic_status == "OK":
            traffic_ok += 1
        else:
            traffic_restricted += 1

    write_csv(
        output_path,
        requested_organization,
        organization,
        repositories,
        metrics_by_repository,
    )
    print_summary(
        output_path,
        requested_organization,
        organization,
        stats,
        len(repositories),
        traffic_ok,
        traffic_restricted,
    )


if __name__ == "__main__":
    main()
