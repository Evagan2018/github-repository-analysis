const DATA_PATH = "./data/dashboard_data.json";
const PRELOADED_DATA_KEY = "DASHBOARD_DATA";

const SNAPSHOT_METRICS = {
  total_views_14d: {
    label: "Total views (14d)",
    color: "#1d7c6f",
  },
  unique_visitors_14d: {
    label: "Unique visitors (14d)",
    color: "#bf6a3f",
  },
  unique_cloners_14d: {
    label: "Unique cloners (14d)",
    color: "#5d7de3",
  },
};

const DAILY_METRICS = {
  views_count: {
    label: "Views",
    color: "#1d7c6f",
  },
  views_uniques: {
    label: "Unique visitors",
    color: "#bf6a3f",
  },
  clones_count: {
    label: "Clones",
    color: "#6b57c8",
  },
  clones_uniques: {
    label: "Unique cloners",
    color: "#3885d1",
  },
};

const ui = {
  generatedAt: document.getElementById("generated-at"),
  latestSnapshot: document.getElementById("latest-snapshot"),
  latestMetric: document.getElementById("latest-metric"),
  statRepositories: document.getElementById("stat-repositories"),
  statOrganizations: document.getElementById("stat-organizations"),
  statScreening: document.getElementById("stat-screening"),
  statDaily: document.getElementById("stat-daily"),
  organizationFilter: document.getElementById("organization-filter"),
  snapshotMetric: document.getElementById("snapshot-metric"),
  dailyMetric: document.getElementById("daily-metric"),
  topRepoMetricLabel: document.getElementById("top-repo-metric-label"),
  dailyChartMetricLabel: document.getElementById("daily-chart-metric-label"),
  heatmapMetricLabel: document.getElementById("heatmap-metric-label"),
  tableSummary: document.getElementById("table-summary"),
  repositoryTableBody: document.getElementById("repository-table-body"),
};

const state = {
  organization: "ALL",
  snapshotMetric: "total_views_14d",
  dailyMetric: "views_count",
  data: null,
};

const plotLayoutBase = {
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)",
  margin: { t: 12, r: 12, b: 56, l: 64 },
  font: {
    family: "IBM Plex Sans, system-ui, sans-serif",
    color: "#15342c",
  },
  xaxis: {
    gridcolor: "rgba(21, 52, 44, 0.08)",
    zerolinecolor: "rgba(21, 52, 44, 0.08)",
    tickfont: { color: "#5b746c" },
    automargin: true,
  },
  yaxis: {
    gridcolor: "rgba(21, 52, 44, 0.08)",
    zerolinecolor: "rgba(21, 52, 44, 0.08)",
    tickfont: { color: "#5b746c" },
    automargin: true,
  },
};

function formatNumber(value) {
  if (value == null || Number.isNaN(value)) {
    return "0";
  }
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function metricOrZero(record, metricName) {
  const value = record?.[metricName];
  return typeof value === "number" ? value : 0;
}

function aggregateBy(items, groupKey, metricName) {
  const totals = new Map();
  items.forEach((item) => {
    const key = item[groupKey] || "Unknown";
    const current = totals.get(key) || 0;
    totals.set(key, current + metricOrZero(item, metricName));
  });
  return Array.from(totals.entries())
    .map(([key, value]) => ({ key, value }))
    .sort((left, right) => right.value - left.value);
}

function renderEmptyState(elementId, title, message) {
  const element = document.getElementById(elementId);
  element.innerHTML = `
    <div class="empty-state">
      <div>
        <strong>${title}</strong>
        <span>${message}</span>
      </div>
    </div>
  `;
}

function fillOrganizationFilter(organizations) {
  ui.organizationFilter.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "ALL";
  allOption.textContent = "All organizations";
  ui.organizationFilter.appendChild(allOption);

  organizations.forEach((organization) => {
    const option = document.createElement("option");
    option.value = organization;
    option.textContent = organization;
    ui.organizationFilter.appendChild(option);
  });
}

function getFilteredSnapshotRows() {
  const rows = state.data.current_snapshot || [];
  if (state.organization === "ALL") {
    return rows;
  }
  return rows.filter((row) => row.organization === state.organization);
}

function getFilteredSnapshotHistoryRows() {
  const rows = state.data.snapshot_history || [];
  if (state.organization === "ALL") {
    return rows;
  }
  return rows.filter((row) => row.organization === state.organization);
}

function getFilteredDailyRows() {
  const rows = state.data.daily_traffic || [];
  if (state.organization === "ALL") {
    return rows;
  }
  return rows.filter((row) => row.organization === state.organization);
}

function getPreloadedData() {
  const preloadedData = globalThis[PRELOADED_DATA_KEY];
  if (!preloadedData || typeof preloadedData !== "object") {
    return null;
  }
  return preloadedData;
}

async function readDashboardData() {
  const preloadedData = getPreloadedData();
  if (window.location.protocol === "file:") {
    if (preloadedData) {
      return preloadedData;
    }
    throw new Error("Preloaded dashboard data is missing");
  }

  try {
    const response = await fetch(DATA_PATH, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (preloadedData) {
      return preloadedData;
    }
    throw error;
  }
}

function buildLoadErrorMessage(error) {
  const baseMessage =
    error instanceof Error && error.message
      ? error.message
      : "Dashboard data file is missing or invalid";

  if (window.location.protocol === "file:") {
    return (
      `${baseMessage}. Re-run scripts/06_Export_SQLite_To_JSON.py so ` +
      "docs/data/dashboard_data.js is regenerated, then reopen the dashboard file."
    );
  }

  return `${baseMessage}. Run scripts/06_Export_SQLite_To_JSON.py and refresh the page.`;
}

function renderSummary() {
  const { meta, summary } = state.data;
  ui.generatedAt.textContent = formatDate(meta.generated_at);
  ui.latestSnapshot.textContent = formatDate(summary.latest_snapshot_date);
  ui.latestMetric.textContent = summary.latest_metric_date
    ? formatDate(summary.latest_metric_date)
    : "Waiting for daily collector";
  ui.statRepositories.textContent = formatNumber(summary.repository_count);
  ui.statOrganizations.textContent = formatNumber(summary.organization_count);
  ui.statScreening.textContent = formatNumber(summary.screening_snapshot_count);
  ui.statDaily.textContent = formatNumber(summary.daily_traffic_count);
}

function renderOrganizationChart() {
  const metricName = state.snapshotMetric;
  const metricLabel = SNAPSHOT_METRICS[metricName].label;
  const dataRows = aggregateBy(state.data.current_snapshot || [], "organization", metricName);

  if (dataRows.length === 0) {
    renderEmptyState(
      "organization-chart",
      "No snapshot data",
      "Run the screening export first to populate the organization overview."
    );
    return;
  }

  Plotly.react(
    "organization-chart",
    [
      {
        type: "bar",
        x: dataRows.map((row) => row.key),
        y: dataRows.map((row) => row.value),
        marker: {
          color: dataRows.map((_, index) =>
            index % 2 === 0 ? SNAPSHOT_METRICS[metricName].color : "#15342c"
          ),
          line: { color: "rgba(255,255,255,0.3)", width: 1 },
        },
        hovertemplate: "%{x}<br>" + metricLabel + ": %{y:,}<extra></extra>",
      },
    ],
    {
      ...plotLayoutBase,
      yaxis: { ...plotLayoutBase.yaxis, title: metricLabel },
      margin: { t: 24, r: 12, b: 80, l: 64 },
    },
    { displayModeBar: false, responsive: true }
  );
}

function renderTopRepositoriesChart() {
  const metricName = state.snapshotMetric;
  const metricConfig = SNAPSHOT_METRICS[metricName];
  const rows = [...getFilteredSnapshotRows()]
    .sort((left, right) => metricOrZero(right, metricName) - metricOrZero(left, metricName))
    .slice(0, 12)
    .reverse();

  ui.topRepoMetricLabel.textContent = metricConfig.label;

  if (rows.length === 0) {
    renderEmptyState(
      "top-repositories-chart",
      "No repositories for this filter",
      "Change the organization filter or regenerate the screening workbook."
    );
    return;
  }

  Plotly.react(
    "top-repositories-chart",
    [
      {
        type: "bar",
        orientation: "h",
        y: rows.map((row) => row.repository_full_name),
        x: rows.map((row) => metricOrZero(row, metricName)),
        marker: {
          color: metricConfig.color,
          line: { color: "rgba(255,255,255,0.35)", width: 1 },
        },
        hovertemplate:
          "%{y}<br>" + metricConfig.label + ": %{x:,}<extra></extra>",
      },
    ],
    {
      ...plotLayoutBase,
      margin: { t: 24, r: 12, b: 56, l: 140 },
      xaxis: { ...plotLayoutBase.xaxis, title: metricConfig.label },
    },
    { displayModeBar: false, responsive: true }
  );
}

function renderSnapshotHistoryChart() {
  const metricName = state.snapshotMetric;
  const metricConfig = SNAPSHOT_METRICS[metricName];
  const rows = getFilteredSnapshotHistoryRows();
  const series = aggregateBy(rows, "snapshot_date", metricName);

  if (series.length < 2) {
    renderEmptyState(
      "snapshot-history-chart",
      "Not enough snapshot history yet",
      "Add more screening snapshots on later dates to show the rolling 14-day trend."
    );
    return;
  }

  Plotly.react(
    "snapshot-history-chart",
    [
      {
        type: "scatter",
        mode: "lines+markers",
        x: series.map((row) => row.key),
        y: series.map((row) => row.value),
        line: { color: metricConfig.color, width: 3, shape: "spline" },
        marker: { size: 9, color: "#15342c" },
        hovertemplate:
          "%{x}<br>" + metricConfig.label + ": %{y:,}<extra></extra>",
      },
    ],
    {
      ...plotLayoutBase,
      xaxis: { ...plotLayoutBase.xaxis, title: "Snapshot date" },
      yaxis: { ...plotLayoutBase.yaxis, title: metricConfig.label },
    },
    { displayModeBar: false, responsive: true }
  );
}

function renderDailyTrendChart() {
  const metricName = state.dailyMetric;
  const metricConfig = DAILY_METRICS[metricName];
  const rows = getFilteredDailyRows();
  const series = aggregateBy(rows, "metric_date", metricName);

  ui.dailyChartMetricLabel.textContent = metricConfig.label;

  if (series.length < 2) {
    renderEmptyState(
      "daily-trend-chart",
      "No daily trend yet",
      "Populate the daily_traffic table to unlock the collector-based line chart."
    );
    return;
  }

  Plotly.react(
    "daily-trend-chart",
    [
      {
        type: "scatter",
        mode: "lines+markers",
        x: series.map((row) => row.key),
        y: series.map((row) => row.value),
        line: { color: metricConfig.color, width: 3, shape: "spline" },
        marker: { size: 8, color: "#15342c" },
        hovertemplate:
          "%{x}<br>" + metricConfig.label + ": %{y:,}<extra></extra>",
      },
    ],
    {
      ...plotLayoutBase,
      xaxis: { ...plotLayoutBase.xaxis, title: "Metric date" },
      yaxis: { ...plotLayoutBase.yaxis, title: metricConfig.label },
    },
    { displayModeBar: false, responsive: true }
  );
}

function renderHeatmapChart() {
  const metricName = state.dailyMetric;
  const metricConfig = DAILY_METRICS[metricName];
  const rows = getFilteredDailyRows();

  ui.heatmapMetricLabel.textContent = metricConfig.label;

  if (rows.length === 0) {
    renderEmptyState(
      "heatmap-chart",
      "Heatmap waiting for daily data",
      "The heatmap activates once the daily collector starts writing metric_date rows."
    );
    return;
  }

  const totalsByRepository = aggregateBy(rows, "repository_full_name", metricName).slice(0, 15);
  const topRepositoryNames = totalsByRepository.map((row) => row.key);
  const filteredRows = rows.filter((row) => topRepositoryNames.includes(row.repository_full_name));
  const dates = [...new Set(filteredRows.map((row) => row.metric_date))].sort();
  const repositories = [...topRepositoryNames].reverse();
  const matrix = repositories.map((repository) =>
    dates.map((metricDate) => {
      const hit = filteredRows.find(
        (row) => row.repository_full_name === repository && row.metric_date === metricDate
      );
      return hit ? metricOrZero(hit, metricName) : 0;
    })
  );

  Plotly.react(
    "heatmap-chart",
    [
      {
        type: "heatmap",
        x: dates,
        y: repositories,
        z: matrix,
        colorscale: [
          [0, "#e8f5ee"],
          [0.35, "#7bc6aa"],
          [0.7, "#1d7c6f"],
          [1, "#15342c"],
        ],
        hovertemplate:
          "%{y}<br>%{x}<br>" + metricConfig.label + ": %{z:,}<extra></extra>",
      },
    ],
    {
      ...plotLayoutBase,
      margin: { t: 24, r: 12, b: 80, l: 180 },
      xaxis: { ...plotLayoutBase.xaxis, title: "Metric date" },
      yaxis: { ...plotLayoutBase.yaxis, title: "" },
    },
    { displayModeBar: false, responsive: true }
  );
}

function renderRepositoryTable() {
  const rows = [...getFilteredSnapshotRows()]
    .sort(
      (left, right) =>
        metricOrZero(right, state.snapshotMetric) - metricOrZero(left, state.snapshotMetric)
    )
    .slice(0, 20);

  ui.tableSummary.textContent = `${formatNumber(rows.length)} repositories shown`;
  ui.repositoryTableBody.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td>
            <a href="${row.link_2_repository}" target="_blank" rel="noreferrer">${row.repository}</a>
            <span class="repo-meta">${row.repository_full_name}</span>
          </td>
          <td>${row.organization}</td>
          <td>${formatNumber(row.total_views_14d)}</td>
          <td>${formatNumber(row.unique_visitors_14d)}</td>
          <td>${formatNumber(row.unique_cloners_14d)}</td>
          <td>${row.visibility || "Unknown"}</td>
          <td>
            <span class="badge ${row.archived ? "badge-yes" : "badge-no"}">
              ${row.archived ? "Archived" : "Active"}
            </span>
          </td>
          <td>${row.days_since_last_push ?? "N/A"}</td>
        </tr>
      `
    )
    .join("");
}

function renderAll() {
  renderSummary();
  renderOrganizationChart();
  renderTopRepositoriesChart();
  renderSnapshotHistoryChart();
  renderDailyTrendChart();
  renderHeatmapChart();
  renderRepositoryTable();
}

function attachEventListeners() {
  ui.organizationFilter.addEventListener("change", (event) => {
    state.organization = event.target.value;
    renderAll();
  });

  ui.snapshotMetric.addEventListener("change", (event) => {
    state.snapshotMetric = event.target.value;
    renderAll();
  });

  ui.dailyMetric.addEventListener("change", (event) => {
    state.dailyMetric = event.target.value;
    renderAll();
  });
}

async function loadDashboard() {
  try {
    state.data = await readDashboardData();
    fillOrganizationFilter(state.data.organizations || []);
    attachEventListeners();
    renderAll();
  } catch (error) {
    document.querySelector(".page-shell").innerHTML = `
      <section class="card chart-card">
        <div class="empty-state">
          <div>
            <strong>Dashboard data could not be loaded</strong>
            <span>${buildLoadErrorMessage(error)}</span>
          </div>
        </div>
      </section>
    `;
  }
}

loadDashboard();
