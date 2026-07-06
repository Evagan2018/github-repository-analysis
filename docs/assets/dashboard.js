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

const REPOSITORY_METRIC_DEFINITIONS = [
  {
    name: SNAPSHOT_METRICS.total_views_14d.label,
    label: "Total views",
    metricName: "total_views_14d",
    color: SNAPSHOT_METRICS.total_views_14d.color,
  },
  {
    name: SNAPSHOT_METRICS.unique_visitors_14d.label,
    label: "Unique visitors",
    metricName: "unique_visitors_14d",
    color: SNAPSHOT_METRICS.unique_visitors_14d.color,
  },
  {
    name: SNAPSHOT_METRICS.unique_cloners_14d.label,
    label: "Unique cloners",
    metricName: "unique_cloners_14d",
    color: SNAPSHOT_METRICS.unique_cloners_14d.color,
  },
];

const REPOSITORY_METRIC_FILTER_DEFINITIONS = [
  {
    metricName: "total_views_14d",
    abbreviation: "tv_14d",
    minControl: "tv_14d_min",
    maxControl: "tv_14d_max",
  },
  {
    metricName: "unique_visitors_14d",
    abbreviation: "uv_14d",
    minControl: "uv_14d_min",
    maxControl: "uv_14d_max",
  },
  {
    metricName: "unique_cloners_14d",
    abbreviation: "uc_14d",
    minControl: "uc_14d_min",
    maxControl: "uc_14d_max",
  },
];

const REPOSITORY_METRIC_FILTER_BY_ABBREVIATION =
  REPOSITORY_METRIC_FILTER_DEFINITIONS.reduce((lookup, definition) => {
    lookup[definition.abbreviation] = definition.metricName;
    return lookup;
  }, {});

const REPOSITORY_METRIC_FILTER_BY_BOUND_ALIAS =
  REPOSITORY_METRIC_FILTER_DEFINITIONS.reduce((lookup, definition) => {
    lookup[definition.minControl] = {
      metricName: definition.metricName,
      bound: "min",
    };
    lookup[definition.maxControl] = {
      metricName: definition.metricName,
      bound: "max",
    };
    return lookup;
  }, {});

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
    color: "#5d7de3",
  },
};

const DAILY_METRIC_BY_SNAPSHOT_METRIC = {
  total_views_14d: "views_count",
  unique_visitors_14d: "views_uniques",
  unique_cloners_14d: "clones_uniques",
};

const HEATMAP_COLOR_SCALES = {
  views_count: [
    [0, "#e8f5ee"],
    [0.35, "#7bc6aa"],
    [0.7, "#1d7c6f"],
    [1, "#15342c"],
  ],
  views_uniques: [
    [0, "#fff0e8"],
    [0.35, "#efb086"],
    [0.7, "#bf6a3f"],
    [1, "#7d3f23"],
  ],
  clones_count: [
    [0, "#eeeafd"],
    [0.35, "#b6a8ea"],
    [0.7, "#6b57c8"],
    [1, "#3f2d8f"],
  ],
  clones_uniques: [
    [0, "#eef2ff"],
    [0.35, "#aebef5"],
    [0.7, "#5d7de3"],
    [1, "#28469f"],
  ],
};

const COMPRESSED_REPOSITORY_AXIS = {
  points: [
    { value: 0, position: 0 },
    { value: 1000, position: 2500 },
    { value: 2500, position: 3000 },
    { value: 5000, position: 4000 },
    { value: 50000, position: 6000 },
  ],
  ticks: [0, 250, 500, 750, 1000, 2500, 5000, 10000, 20000, 30000, 40000, 50000],
};

const OPEN_CMSIS_PACK_REPOSITORY_AXIS = {
  points: [
    { value: 0, position: 0 },
    { value: 200, position: 500 },
    { value: 400, position: 700 },
    { value: 600, position: 800 },
    { value: 800, position: 866.67 },
    { value: 1000, position: 933.33 },
    { value: 1200, position: 1000 },
  ],
  ticks: [
    0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 250, 300, 350, 400, 600, 800,
    1000, 1200,
  ],
};

const ORGANIZATION_REPOSITORY_CHARTS = [
  {
    organization: "arm-examples",
    elementId: "arm-examples-repositories-chart",
    controlName: "arm-examples",
    repositorySelectionListId: "arm-examples-repository-list",
    repositoryFilterControls: true,
    preserveUnselectedRepositories: true,
    legendY: 1.033,
    linkedRepositoryLabels: true,
  },
  {
    organization: "arm-software",
    elementId: "arm-software-repositories-chart",
    controlName: "arm-software",
    repositorySelectionListId: "arm-software-repository-list",
    repositoryFilterControls: true,
    preserveUnselectedRepositories: true,
    compressedAxis: true,
    linkedRepositoryLabels: true,
  },
  {
    organization: "mdk-packs",
    elementId: "mdk-packs-repositories-chart",
    controlName: "mdk-packs",
    repositorySelectionListId: "mdk-packs-repository-list",
    repositoryFilterControls: true,
    preserveUnselectedRepositories: true,
    linkedRepositoryLabels: true,
  },
  {
    organization: "open-cmsis-pack",
    elementId: "open-cmsis-pack-experimental-repositories-chart",
    controlName: "open-cmsis-pack-experimental",
    repositorySelectionListId: "open-cmsis-pack-experimental-repository-list",
    repositoryFilterControls: true,
    preserveUnselectedRepositories: true,
    axisConfig: OPEN_CMSIS_PACK_REPOSITORY_AXIS,
    legendY: 1.011,
    linkedRepositoryLabels: true,
  },
];

const ui = {
  generatedAt: document.getElementById("generated-at"),
  latestSnapshot: document.getElementById("latest-snapshot"),
  latestMetric: document.getElementById("latest-metric"),
  statRepositories: document.getElementById("stat-repositories"),
  statRepositoriesByOrg: document.getElementById("stat-repositories-by-org"),
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

const DAILY_VIEWS_AXIS_MAX_BY_ORGANIZATION = {
  ALL: 3000,
  "arm-examples": 500,
  "arm-software": 2000,
  "mdk-packs": 100,
  "open-cmsis-pack": 1000,
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

function escapeHtml(value) {
  const replacements = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return String(value ?? "").replace(/[&<>"']/g, (character) => replacements[character]);
}

function getRepositoryTrafficUrl(repositoryFullName) {
  return `https://github.com/${repositoryFullName}/graphs/traffic`;
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

function getOrganizationSnapshotRows(organizationName) {
  return (state.data.current_snapshot || []).filter(
    (row) => row.organization === organizationName
  );
}

function getRepositoryFilterMetricRowsMarkup(controlName) {
  const safeControlName = escapeHtml(controlName);

  return REPOSITORY_METRIC_FILTER_DEFINITIONS.map((definition) => {
    const metricLabel = SNAPSHOT_METRICS[definition.metricName].label;
    const shortMetricLabel = metricLabel.replace(" (14d)", "");

    return `
      <div class="repository-filter-metric-row">
        <span class="repository-filter-metric-label">
          <span>${escapeHtml(metricLabel)}</span>
          <code>${escapeHtml(definition.abbreviation)}</code>
        </span>
        <select
          class="repository-filter-select"
          name="${safeControlName}-filter-${escapeHtml(definition.minControl)}_op"
          data-repository-filter="${safeControlName}"
          aria-label="${escapeHtml(shortMetricLabel)} lower operator"
        >
          <option value="gte">&gt;=</option>
          <option value="gt">&gt;</option>
          <option value="eq">=</option>
        </select>
        <input
          class="repository-filter-input"
          type="number"
          min="0"
          step="1"
          name="${safeControlName}-filter-${escapeHtml(definition.minControl)}"
          data-repository-filter="${safeControlName}"
          placeholder="min"
          aria-label="${escapeHtml(shortMetricLabel)} lower value"
        />
        <select
          class="repository-filter-select"
          name="${safeControlName}-filter-${escapeHtml(definition.maxControl)}_op"
          data-repository-filter="${safeControlName}"
          aria-label="${escapeHtml(shortMetricLabel)} upper operator"
        >
          <option value="lte">&lt;=</option>
          <option value="lt">&lt;</option>
          <option value="eq">=</option>
        </select>
        <input
          class="repository-filter-input"
          type="number"
          min="0"
          step="1"
          name="${safeControlName}-filter-${escapeHtml(definition.maxControl)}"
          data-repository-filter="${safeControlName}"
          placeholder="max"
          aria-label="${escapeHtml(shortMetricLabel)} upper value"
        />
      </div>
    `;
  }).join("");
}

function getRepositoryConditionAliasesMarkup() {
  return REPOSITORY_METRIC_FILTER_DEFINITIONS.flatMap((definition) => [
    definition.abbreviation,
    definition.minControl,
    definition.maxControl,
  ]).map((alias) => `<code>${escapeHtml(alias)}</code>`).join("");
}

function getRepositoryConditionSummaryMarkup(controlName) {
  const safeControlName = escapeHtml(controlName);

  return REPOSITORY_METRIC_FILTER_DEFINITIONS.map((definition) => `
    <span
      class="repository-condition-value-group"
      data-repository-filter-metric-summary="${safeControlName}"
      data-metric-name="${escapeHtml(definition.metricName)}"
    >
      <code>${escapeHtml(definition.minControl)}:<span data-summary-bound="min">0</span></code>
      <code>${escapeHtml(definition.maxControl)}:<span data-summary-bound="max">0</span></code>
    </span>
  `).join("");
}

function getRepositoryAdvancedFilterMarkup(controlName) {
  const safeControlName = escapeHtml(controlName);

  return `
    <fieldset class="metric-control-group repository-filter-group">
      <legend>Repositories</legend>
      <div class="repository-filter-grid">
        <label
          class="metric-choice repository-filter-all"
          title="All listed repositories. Exclude filters can remove repositories from this selection."
        >
          <input
            type="checkbox"
            name="${safeControlName}-filter-all"
            data-repository-filter="${safeControlName}"
            checked
          />
          <span>All</span>
        </label>
        <details class="repository-advanced-search">
          <summary>Advanced search</summary>
          <div class="repository-advanced-search-body">
            <section class="repository-filter-section">
              <h3>Text filters</h3>
              <div class="repository-text-filter-grid">
                <div class="repository-filter-row">
                  <label
                    class="metric-choice"
                    title="Comma-separated repository names."
                  >
                    <input
                      type="checkbox"
                      name="${safeControlName}-filter-list"
                      data-repository-filter="${safeControlName}"
                    />
                    <span>List</span>
                  </label>
                  <input
                    class="repository-filter-input"
                    type="text"
                    name="${safeControlName}-filter-list-value"
                    data-repository-filter="${safeControlName}"
                    placeholder="cbuild2cmake, debug-adapter-registry"
                    aria-label="List repositories"
                  />
                </div>
                <div class="repository-filter-row">
                  <label
                    class="metric-choice"
                    title="Comma-separated name patterns. Wildcards such as STM32* are supported."
                  >
                    <input
                      type="checkbox"
                      name="${safeControlName}-filter-naming"
                      data-repository-filter="${safeControlName}"
                    />
                    <span>Naming scheme</span>
                  </label>
                  <input
                    class="repository-filter-input"
                    type="text"
                    name="${safeControlName}-filter-naming-value"
                    data-repository-filter="${safeControlName}"
                    placeholder="STM32*, ST_Nucleo*, CMSIS*"
                    aria-label="Naming scheme patterns"
                  />
                </div>
                <div class="repository-filter-row">
                  <label
                    class="metric-choice"
                    title="Remove comma-separated repository names from the current selection."
                  >
                    <input
                      type="checkbox"
                      name="${safeControlName}-filter-exclude"
                      data-repository-filter="${safeControlName}"
                    />
                    <span>Exclude</span>
                  </label>
                  <input
                    class="repository-filter-input"
                    type="text"
                    name="${safeControlName}-filter-exclude-value"
                    data-repository-filter="${safeControlName}"
                    placeholder="cbuild2cmake, debug-adapter-registry"
                    aria-label="Exclude repositories"
                  />
                </div>
                <div class="repository-filter-row">
                  <label
                    class="metric-choice"
                    title="Remove comma-separated name patterns from the current selection."
                  >
                    <input
                      type="checkbox"
                      name="${safeControlName}-filter-exclude-naming"
                      data-repository-filter="${safeControlName}"
                    />
                    <span>Exclude naming scheme</span>
                  </label>
                  <input
                    class="repository-filter-input"
                    type="text"
                    name="${safeControlName}-filter-exclude-naming-value"
                    data-repository-filter="${safeControlName}"
                    placeholder="STM32*, ST_Nucleo*, CMSIS*"
                    aria-label="Exclude naming scheme patterns"
                  />
                </div>
              </div>
            </section>
            <section class="repository-filter-metric-section">
              <div class="repository-filter-metric-heading">
                <h3>Metric filters</h3>
                <label>
                  <span>Match</span>
                  <select
                    class="repository-filter-select"
                    name="${safeControlName}-filter-metric-mode"
                    data-repository-filter="${safeControlName}"
                    aria-label="Metric filter match mode"
                  >
                    <option value="all">All numeric rules (logical AND)</option>
                    <option value="any">Any numeric rule (logical OR)</option>
                  </select>
                </label>
              </div>
              <p class="repository-filter-help">
                All numeric rules means a logical AND operation across the defined ranges and comparisons.
                Any numeric rule means a logical OR operation across the defined ranges and comparisons.
                Custom conditions can use the available aliases listed below; current alias values show the active snapshot min/max constants. Separate multiple conditions with commas.
              </p>
              <div class="repository-filter-metric-grid">
                ${getRepositoryFilterMetricRowsMarkup(controlName)}
              </div>
            </section>
            <section class="repository-filter-section repository-filter-condition-section">
              <h3>Custom condition</h3>
              <div class="repository-condition-alias-row">
                <span>Available aliases</span>
                <span class="repository-condition-alias-group">
                  ${getRepositoryConditionAliasesMarkup()}
                </span>
              </div>
              <div class="repository-condition-value-row">
                <span>Current alias values</span>
                <span class="repository-condition-alias-group">
                  ${getRepositoryConditionSummaryMarkup(controlName)}
                </span>
              </div>
              <div class="repository-filter-condition-row">
                <label for="${safeControlName}-filter-custom-condition">
                  Expression
                </label>
                <input
                  class="repository-filter-input"
                  type="text"
                  id="${safeControlName}-filter-custom-condition"
                  name="${safeControlName}-filter-custom-condition"
                  data-repository-filter="${safeControlName}"
                  placeholder="uc_14d > uv_14d, tv_14d = tv_14d_min"
                  aria-label="Custom metric filter condition"
                />
              </div>
            </section>
          </div>
        </details>
      </div>
    </fieldset>
  `;
}

function ensureRepositoryFilterControls() {
  ORGANIZATION_REPOSITORY_CHARTS.filter(
    (chartConfig) => chartConfig.repositoryFilterControls
  ).forEach((chartConfig) => {
    const controlsElement = document
      .querySelector(`[name="${chartConfig.controlName}-metric"]`)
      ?.closest(".repository-chart-controls");

    if (
      !controlsElement ||
      controlsElement.querySelector(`[data-repository-filter="${chartConfig.controlName}"]`)
    ) {
      return;
    }

    controlsElement.insertAdjacentHTML(
      "beforeend",
      getRepositoryAdvancedFilterMarkup(chartConfig.controlName)
    );
  });
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

function getNiceTickStep(maxValue, tickCount = 5) {
  const rawStep = maxValue / tickCount;
  if (!Number.isFinite(rawStep) || rawStep <= 0) {
    return 1;
  }

  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const niceNormalized =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;

  return niceNormalized * magnitude;
}

function buildLinearAxisTicks(maxValue, tickCount = 5) {
  const step = getNiceTickStep(maxValue, tickCount);
  return Array.from({ length: tickCount + 1 }, (_, index) => step * index);
}

function compressRepositoryMetricValue(value, axisConfig = COMPRESSED_REPOSITORY_AXIS) {
  const numericValue = Math.max(Number(value) || 0, 0);
  const { points } = axisConfig;

  if (numericValue <= points[0].value) {
    return points[0].position;
  }

  const endIndex = points.findIndex((point) => numericValue <= point.value);
  const endPoint = endIndex === -1 ? points.at(-1) : points[endIndex];
  const startPoint = endIndex === -1 ? points.at(-2) : points[endIndex - 1];
  const rawSpan = endPoint.value - startPoint.value;
  const visualSpan = endPoint.position - startPoint.position;

  return startPoint.position + ((numericValue - startPoint.value) / rawSpan) * visualSpan;
}

function parseIsoDate(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addUtcDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function toIsoDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function formatDateKeyWithWeekday(dateKey) {
  const weekdayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  return `${dateKey} ${weekdayNames[parseIsoDate(dateKey).getUTCDay()]}`;
}

function buildDateWindow(endDateKey, dayCount) {
  const endDate = parseIsoDate(endDateKey);
  const startDate = addUtcDays(endDate, -(dayCount - 1));

  return Array.from({ length: dayCount }, (_, index) =>
    toIsoDateKey(addUtcDays(startDate, index))
  );
}

function resetPlotContainer(elementId) {
  const element = document.getElementById(elementId);
  if (!element) {
    return null;
  }

  if (
    element.classList.contains("js-plotly-plot") &&
    typeof window.Plotly?.purge === "function"
  ) {
    window.Plotly.purge(element);
  }

  element.replaceChildren();
  return element;
}

function preparePlotContainer(elementId) {
  const element = document.getElementById(elementId);
  if (element?.querySelector(".empty-state")) {
    element.replaceChildren();
  }
}

function renderEmptyState(elementId, title, message) {
  const element = resetPlotContainer(elementId);
  if (!element) {
    return;
  }

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

function syncRepositorySelectAll(controlName) {
  const selectAllControl = document.querySelector(
    `[name="${controlName}-repository-all"]`
  );
  const repositoryControls = Array.from(
    document.querySelectorAll(`[name="${controlName}-repository"]`)
  );

  if (!selectAllControl || repositoryControls.length === 0) {
    return;
  }

  const checkedCount = repositoryControls.filter((control) => control.checked).length;
  const isPartial = checkedCount > 0 && checkedCount < repositoryControls.length;
  selectAllControl.checked = checkedCount === repositoryControls.length;
  selectAllControl.indeterminate = isPartial;
  selectAllControl.setAttribute(
    "aria-checked",
    isPartial ? "mixed" : String(selectAllControl.checked)
  );
}

function setRepositorySelection(controlName, checked) {
  document
    .querySelectorAll(`[name="${controlName}-repository"]`)
    .forEach((control) => {
      control.checked = checked;
    });
  syncRepositorySelectAll(controlName);
}

function getSelectedRepositoryNames(controlName) {
  const repositoryControls = Array.from(
    document.querySelectorAll(`[name="${controlName}-repository"]`)
  );

  if (repositoryControls.length === 0) {
    return null;
  }

  return repositoryControls
    .filter((control) => control.checked)
    .map((control) => control.value);
}

function getRepositoryMetricSummaryValues(organization, metricName) {
  const values = getOrganizationSnapshotRows(organization).map((row) =>
    metricOrZero(row, metricName)
  );

  return {
    min: values.length > 0 ? Math.min(...values) : null,
    max: values.length > 0 ? Math.max(...values) : null,
  };
}

function updateRepositoryFilterMetricSummaries(chartConfig) {
  document
    .querySelectorAll(
      `[data-repository-filter-metric-summary="${chartConfig.controlName}"]`
    )
    .forEach((summaryElement) => {
      const metricName = summaryElement.dataset.metricName;
      const definition = REPOSITORY_METRIC_FILTER_DEFINITIONS.find(
        (metricDefinition) => metricDefinition.metricName === metricName
      );

      if (!definition) {
        return;
      }

      const summaryValues = getRepositoryMetricSummaryValues(
        chartConfig.organization,
        metricName
      );
      const minElement = summaryElement.querySelector('[data-summary-bound="min"]');
      const maxElement = summaryElement.querySelector('[data-summary-bound="max"]');

      if (minElement) {
        minElement.textContent = summaryValues.min == null ? "-" : summaryValues.min;
      }

      if (maxElement) {
        maxElement.textContent = summaryValues.max == null ? "-" : summaryValues.max;
      }
    });
}

function updateRepositoryMetricControlSummaries(chartConfig) {
  const rows = getOrganizationSnapshotRows(chartConfig.organization);

  document
    .querySelectorAll(`[name="${chartConfig.controlName}-metric"]`)
    .forEach((control) => {
      const metricDefinition = REPOSITORY_METRIC_DEFINITIONS.find(
        (metric) => metric.metricName === control.value
      );
      const labelElement = control.closest(".metric-choice");
      const titleElement = labelElement?.querySelector("span:not(.metric-choice-range)");

      if (!metricDefinition || !labelElement || !titleElement) {
        return;
      }

      let rangeElement = labelElement.querySelector(".metric-choice-range");
      if (!rangeElement) {
        rangeElement = document.createElement("span");
        rangeElement.className = "metric-choice-range";
        labelElement.appendChild(rangeElement);
      }

      const values = rows.map((row) => metricOrZero(row, metricDefinition.metricName));
      const minValue = values.length > 0 ? Math.min(...values) : null;
      const maxValue = values.length > 0 ? Math.max(...values) : null;

      titleElement.textContent = metricDefinition.name;
      rangeElement.textContent =
        minValue == null || maxValue == null
          ? "min: - max: -"
          : `min: ${formatNumber(minValue)} max: ${formatNumber(maxValue)}`;
    });
}

function splitRepositoryFilterEntries(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function repositoryFilterMatchesExact(row, entry) {
  const normalizedEntry = entry.toLowerCase();
  return [row.repository, row.repository_full_name]
    .filter(Boolean)
    .some((candidate) => candidate.toLowerCase() === normalizedEntry);
}

function repositoryFilterMatchesPattern(row, pattern) {
  const trimmedPattern = pattern.trim();
  const candidates = [row.repository].filter(Boolean);

  if (trimmedPattern.includes("*") || trimmedPattern.includes("?")) {
    const wildcardRegex = new RegExp(
      `^${escapeRegExp(trimmedPattern).replace(/\\\*/g, ".*").replace(/\\\?/g, ".")}$`,
      "i"
    );

    return candidates.some((candidate) => wildcardRegex.test(candidate));
  }

  const normalizedPattern = trimmedPattern.toLowerCase();
  return candidates.some((candidate) =>
    candidate.toLowerCase().includes(normalizedPattern)
  );
}

function getRepositoryFilterControl(controlName, suffix) {
  return document.querySelector(`[name="${controlName}-filter-${suffix}"]`);
}

function parseRepositoryFilterNumber(controlName, suffix) {
  const rawValue = getRepositoryFilterControl(controlName, suffix)?.value;
  const trimmedValue = String(rawValue || "").trim();

  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number(trimmedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function getRepositoryFilterOperator(controlName, suffix, allowedOperators, fallbackOperator) {
  const value = getRepositoryFilterControl(controlName, suffix)?.value;
  return allowedOperators.includes(value) ? value : fallbackOperator;
}

function parseRepositoryConditionOperand(value) {
  const normalizedValue = String(value || "").trim().toLowerCase();
  const metricName = REPOSITORY_METRIC_FILTER_BY_ABBREVIATION[normalizedValue];
  const boundAlias = REPOSITORY_METRIC_FILTER_BY_BOUND_ALIAS[normalizedValue];

  if (metricName) {
    return { type: "metric", metricName };
  }

  if (boundAlias) {
    return {
      type: "summary",
      metricName: boundAlias.metricName,
      bound: boundAlias.bound,
    };
  }

  const numberValue = Number(normalizedValue);
  return Number.isFinite(numberValue) ? { type: "number", value: numberValue } : null;
}

function parseRepositoryCustomConditionRule(condition) {
  const match = String(condition || "").match(
    /^\s*([a-zA-Z_][a-zA-Z0-9_]*|-?\d+(?:\.\d+)?)\s*(>=|<=|==|=|>|<)\s*([a-zA-Z_][a-zA-Z0-9_]*|-?\d+(?:\.\d+)?)\s*$/
  );

  if (!match) {
    return null;
  }

  const leftOperand = parseRepositoryConditionOperand(match[1]);
  const rightOperand = parseRepositoryConditionOperand(match[3]);

  if (!leftOperand || !rightOperand) {
    return null;
  }

  return {
    type: "comparison",
    leftOperand,
    operator: match[2] === "==" ? "=" : match[2],
    rightOperand,
  };
}

function parseRepositoryCustomConditionRules(controlName) {
  const rawValue = getRepositoryFilterControl(controlName, "custom-condition")?.value;

  return String(rawValue || "")
    .split(/[,;\n]+/)
    .map((condition) => condition.trim())
    .filter(Boolean)
    .map(parseRepositoryCustomConditionRule)
    .filter(Boolean);
}

function getRepositoryConditionOperandValue(row, operand) {
  if (operand.type === "metric") {
    return metricOrZero(row, operand.metricName);
  }

  if (operand.type === "summary") {
    const summaryValues = getRepositoryMetricSummaryValues(
      row.organization,
      operand.metricName
    );

    return summaryValues[operand.bound] ?? 0;
  }

  return operand.value;
}

function compareRepositoryMetricValues(leftValue, operator, rightValue) {
  switch (operator) {
    case ">":
      return leftValue > rightValue;
    case ">=":
      return leftValue >= rightValue;
    case "<":
      return leftValue < rightValue;
    case "<=":
      return leftValue <= rightValue;
    case "=":
      return leftValue === rightValue;
    default:
      return false;
  }
}

function getRepositoryMetricFilterRules(controlName) {
  const metricModeControl = getRepositoryFilterControl(controlName, "metric-mode");
  const mode = metricModeControl?.value === "any" ? "any" : "all";
  const rangeRules = REPOSITORY_METRIC_FILTER_DEFINITIONS.map((definition) => {
    const minValue = parseRepositoryFilterNumber(controlName, definition.minControl);
    const maxValue = parseRepositoryFilterNumber(controlName, definition.maxControl);

    return {
      type: "range",
      metricName: definition.metricName,
      minOperator: getRepositoryFilterOperator(
        controlName,
        `${definition.minControl}_op`,
        ["gte", "gt", "eq"],
        "gte"
      ),
      minValue,
      maxOperator: getRepositoryFilterOperator(
        controlName,
        `${definition.maxControl}_op`,
        ["lte", "lt", "eq"],
        "lte"
      ),
      maxValue,
    };
  }).filter((rule) => rule.minValue != null || rule.maxValue != null);
  const comparisonRules = parseRepositoryCustomConditionRules(controlName);

  return { mode, rules: [...rangeRules, ...comparisonRules] };
}

function repositoryMatchesMetricRule(row, rule) {
  if (rule.type === "comparison") {
    return compareRepositoryMetricValues(
      getRepositoryConditionOperandValue(row, rule.leftOperand),
      rule.operator,
      getRepositoryConditionOperandValue(row, rule.rightOperand)
    );
  }

  const value = metricOrZero(row, rule.metricName);

  if (rule.minValue != null) {
    const passesMinimum =
      rule.minOperator === "eq"
        ? value === rule.minValue
        : rule.minOperator === "gt"
          ? value > rule.minValue
          : value >= rule.minValue;

    if (!passesMinimum) {
      return false;
    }
  }

  if (rule.maxValue != null) {
    const passesMaximum =
      rule.maxOperator === "eq"
        ? value === rule.maxValue
        : rule.maxOperator === "lt"
          ? value < rule.maxValue
          : value <= rule.maxValue;

    if (!passesMaximum) {
      return false;
    }
  }

  return true;
}

function repositoryMatchesMetricRules(row, metricFilter) {
  if (metricFilter.rules.length === 0) {
    return true;
  }

  if (metricFilter.mode === "any") {
    return metricFilter.rules.some((rule) => repositoryMatchesMetricRule(row, rule));
  }

  return metricFilter.rules.every((rule) => repositoryMatchesMetricRule(row, rule));
}

function normalizeRepositoryFilterControls(controlName, changedControl = null) {
  const allControl = getRepositoryFilterControl(controlName, "all");
  const listControl = getRepositoryFilterControl(controlName, "list");
  const listValue = getRepositoryFilterControl(controlName, "list-value");
  const namingControl = getRepositoryFilterControl(controlName, "naming");
  const namingValue = getRepositoryFilterControl(controlName, "naming-value");

  if (!allControl || !listControl || !namingControl) {
    return;
  }

  if (changedControl === allControl && allControl.checked) {
    listControl.checked = false;
    namingControl.checked = false;
    return;
  }

  if (changedControl === listValue && listValue.value.trim()) {
    listControl.checked = true;
  }

  if (changedControl === namingValue && namingValue.value.trim()) {
    namingControl.checked = true;
  }

  if (listControl.checked || namingControl.checked) {
    allControl.checked = false;
  }
}

function getRepositoryFilterSelectedNames(chartConfig) {
  const { controlName, organization } = chartConfig;
  const rows = getOrganizationSnapshotRows(organization);
  const selectedRepositories = new Set();
  const allControl = getRepositoryFilterControl(controlName, "all");
  const listControl = getRepositoryFilterControl(controlName, "list");
  const listValue = getRepositoryFilterControl(controlName, "list-value");
  const namingControl = getRepositoryFilterControl(controlName, "naming");
  const namingValue = getRepositoryFilterControl(controlName, "naming-value");
  const excludeControl = getRepositoryFilterControl(controlName, "exclude");
  const excludeValue = getRepositoryFilterControl(controlName, "exclude-value");
  const excludeNamingControl = getRepositoryFilterControl(controlName, "exclude-naming");
  const excludeNamingValue = getRepositoryFilterControl(controlName, "exclude-naming-value");
  const includeAll = Boolean(allControl?.checked);
  const includeList = Boolean(listControl?.checked);
  const includeNaming = Boolean(namingControl?.checked);
  const includeSpecificRepositories = includeList || includeNaming;
  const metricFilter = getRepositoryMetricFilterRules(controlName);

  if (includeAll && !includeSpecificRepositories) {
    rows.forEach((row) => selectedRepositories.add(row.repository));
  }

  if (includeList) {
    const listEntries = splitRepositoryFilterEntries(listValue?.value);
    rows
      .filter((row) =>
        listEntries.some((entry) => repositoryFilterMatchesExact(row, entry))
      )
      .forEach((row) => selectedRepositories.add(row.repository));
  }

  if (includeNaming) {
    const namingPatterns = splitRepositoryFilterEntries(namingValue?.value);
    rows
      .filter((row) =>
        namingPatterns.some((pattern) => repositoryFilterMatchesPattern(row, pattern))
      )
      .forEach((row) => selectedRepositories.add(row.repository));
  }

  if (metricFilter.rules.length > 0) {
    rows
      .filter(
        (row) =>
          selectedRepositories.has(row.repository) &&
          !repositoryMatchesMetricRules(row, metricFilter)
      )
      .forEach((row) => selectedRepositories.delete(row.repository));
  }

  if (excludeControl?.checked) {
    const excludeEntries = splitRepositoryFilterEntries(excludeValue?.value);
    rows
      .filter((row) =>
        excludeEntries.some((entry) => repositoryFilterMatchesExact(row, entry))
      )
      .forEach((row) => selectedRepositories.delete(row.repository));
  }

  if (excludeNamingControl?.checked) {
    const excludePatterns = splitRepositoryFilterEntries(excludeNamingValue?.value);
    rows
      .filter((row) =>
        excludePatterns.some((pattern) => repositoryFilterMatchesPattern(row, pattern))
      )
      .forEach((row) => selectedRepositories.delete(row.repository));
  }

  return rows
    .filter((row) => selectedRepositories.has(row.repository))
    .map((row) => row.repository);
}

function setRepositorySelectionByNames(controlName, repositoryNames) {
  const selectedRepositories = new Set(repositoryNames);

  document
    .querySelectorAll(`[name="${controlName}-repository"]`)
    .forEach((control) => {
      control.checked = selectedRepositories.has(control.value);
    });

  syncRepositorySelectAll(controlName);
}

function applyRepositoryFilterControls(chartConfig) {
  if (!chartConfig.repositoryFilterControls) {
    return;
  }

  setRepositorySelectionByNames(
    chartConfig.controlName,
    getRepositoryFilterSelectedNames(chartConfig)
  );
}

function populateRepositorySelectionControls() {
  ORGANIZATION_REPOSITORY_CHARTS.filter(
    (chartConfig) => chartConfig.repositorySelectionListId
  ).forEach((chartConfig) => {
    const listElement = document.getElementById(chartConfig.repositorySelectionListId);

    if (!listElement) {
      return;
    }

    const rows = [...getOrganizationSnapshotRows(chartConfig.organization)].sort(
      (left, right) =>
        metricOrZero(right, "total_views_14d") - metricOrZero(left, "total_views_14d")
    );

    listElement.innerHTML = rows
      .map(
        (row) => `
          <label
            class="repository-choice repository-axis-choice"
            data-repository-name="${escapeHtml(row.repository)}"
          >
            <input
              type="checkbox"
              name="${chartConfig.controlName}-repository"
              value="${escapeHtml(row.repository)}"
              checked
            />
            <span class="visually-hidden">${escapeHtml(row.repository)}</span>
          </label>
        `
      )
      .join("");

    syncRepositorySelectAll(chartConfig.controlName);
  });
}

function alignRepositorySelectionControls(chartConfig) {
  if (!chartConfig.repositorySelectionListId) {
    return;
  }

  const chartElement = document.getElementById(chartConfig.elementId);
  const listElement = document.getElementById(chartConfig.repositorySelectionListId);
  const frameElement = chartElement?.closest(".repository-chart-frame");
  const controlsElement = frameElement?.querySelector(".repository-axis-controls");
  const allLabel = frameElement?.querySelector(".repository-axis-all");

  if (!chartElement || !listElement || !frameElement || !controlsElement || !allLabel) {
    return;
  }

  const frameRect = frameElement.getBoundingClientRect();
  const tickPositions = Array.from(chartElement.querySelectorAll(".ytick text"))
    .map((tickLabel) => {
      const repositoryName = tickLabel.textContent.trim();
      const labelRect = tickLabel.getBoundingClientRect();
      return {
        repositoryName,
        y: labelRect.top + labelRect.height / 2 - frameRect.top,
      };
    })
    .filter((item) => item.repositoryName);

  if (tickPositions.length === 0) {
    return;
  }

  const sortedYPositions = tickPositions.map((item) => item.y).sort((left, right) => left - right);
  const defaultGap = 34;
  const rowGap =
    sortedYPositions.length > 1
      ? Math.max(24, sortedYPositions[1] - sortedYPositions[0])
      : defaultGap;
  const topRowY = sortedYPositions[0];
  const allTop = Math.max(46, topRowY - rowGap);
  const legendTop = Math.max(18, allTop - 34);
  const positionByRepository = new Map(
    tickPositions.map((item) => [item.repositoryName, item.y])
  );
  let hiddenOffset = 0;

  controlsElement.style.setProperty("--repository-axis-legend-top", `${legendTop}px`);
  controlsElement.style.setProperty("--repository-axis-all-top", `${allTop}px`);

  Array.from(listElement.querySelectorAll(".repository-axis-choice")).forEach((choiceElement) => {
    const repositoryName = choiceElement.dataset.repositoryName;
    const yPosition = positionByRepository.get(repositoryName);

    if (typeof yPosition === "number") {
      choiceElement.dataset.lastTop = String(yPosition);
      choiceElement.style.top = `${yPosition}px`;
      choiceElement.style.opacity = "1";
      return;
    }

    const fallbackTop =
      Number(choiceElement.dataset.lastTop) ||
      sortedYPositions.at(-1) + rowGap * (hiddenOffset + 1);
    hiddenOffset += 1;
    choiceElement.style.top = `${fallbackTop}px`;
    choiceElement.style.opacity = "0.55";
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
  const repositoryCountsByOrg = new Map();
  (state.data.current_snapshot || []).forEach((row) => {
    const organization = row.organization || "Unknown";
    repositoryCountsByOrg.set(organization, (repositoryCountsByOrg.get(organization) || 0) + 1);
  });
  ui.statRepositoriesByOrg.innerHTML = (state.data.organizations || [])
    .map((organization) => {
      const count = repositoryCountsByOrg.get(organization) || 0;
      return `
        <div class="stat-breakdown-row">
          <span>${organization}</span>
          <strong>${formatNumber(count)}</strong>
        </div>
      `;
    })
    .join("");
  ui.statOrganizations.textContent = formatNumber(summary.organization_count);
  ui.statScreening.textContent = formatNumber(summary.screening_snapshot_count);
  ui.statDaily.textContent = formatNumber(summary.daily_traffic_count);
}

function renderOrganizationChart() {
  const metricName = state.snapshotMetric;
  const metricLabel = SNAPSHOT_METRICS[metricName].label;
  const dataRows = aggregateBy(state.data.current_snapshot || [], "organization", metricName);
  const organizationNames = dataRows.map((row) => row.key);
  const metricValues = dataRows.map((row) => Number(row.value) || 0);
  const maxValue = Math.max(...metricValues, 0);

  if (dataRows.length === 0) {
    renderEmptyState(
      "organization-chart",
      "No snapshot data",
      "Run the screening export first to populate the organization overview."
    );
    return;
  }

  preparePlotContainer("organization-chart");
  Plotly.react(
    "organization-chart",
    [
      {
        type: "bar",
        x: organizationNames,
        y: metricValues,
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
      xaxis: {
        ...plotLayoutBase.xaxis,
        categoryorder: "array",
        categoryarray: organizationNames,
      },
      yaxis: {
        ...plotLayoutBase.yaxis,
        title: metricLabel,
        type: "linear",
        autorange: false,
        range: [0, maxValue === 0 ? 1 : Math.ceil(maxValue * 1.08)],
        rangemode: "tozero",
        tickformat: ",d",
      },
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

  preparePlotContainer("top-repositories-chart");
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

function renderOrganizationRepositoriesComparisonChart(elementId, organizationName, options = {}) {
  const {
    compressedAxis = false,
    linkedRepositoryLabels = false,
    axisConfig = null,
    legendY = 1.08,
    metricDefinitions = REPOSITORY_METRIC_DEFINITIONS,
    orderMetricName = "total_views_14d",
    selectedRepositoryNames = null,
    preserveUnselectedRepositories = false,
    afterRender = null,
  } = options;
  const customAxis = axisConfig || (compressedAxis ? COMPRESSED_REPOSITORY_AXIS : null);
  const selectedRepositorySet = selectedRepositoryNames
    ? new Set(selectedRepositoryNames)
    : null;
  const shouldPreserveUnselectedRepositories =
    preserveUnselectedRepositories && selectedRepositorySet;
  const traceDefinitions = REPOSITORY_METRIC_DEFINITIONS;
  const selectedMetricSet = new Set(
    metricDefinitions.map((metric) => metric.metricName)
  );
  const rows = (state.data.current_snapshot || [])
    .filter(
      (row) =>
        row.organization === organizationName &&
        (!selectedRepositorySet ||
          shouldPreserveUnselectedRepositories ||
          selectedRepositorySet.has(row.repository))
    )
    .sort((left, right) => {
      if (shouldPreserveUnselectedRepositories) {
        const leftSelected = selectedRepositorySet.has(left.repository);
        const rightSelected = selectedRepositorySet.has(right.repository);

        if (leftSelected !== rightSelected) {
          return leftSelected ? -1 : 1;
        }
      }

      return metricOrZero(right, orderMetricName) - metricOrZero(left, orderMetricName);
    });

  if (rows.length === 0) {
    renderEmptyState(
      elementId,
      `No ${organizationName} repositories`,
      "Regenerate the screening data to populate this organization comparison."
    );
    return;
  }

  const displayRows = [...rows].reverse();
  const repositoryNames = displayRows.map((row) => row.repository);
  const repositoryFullNames = displayRows.map((row) => row.repository_full_name);
  const repositoryLabels = displayRows.map((row) => {
    if (!linkedRepositoryLabels) {
      return row.repository;
    }

    return `<a href="${getRepositoryTrafficUrl(row.repository_full_name)}" target="_blank">${escapeHtml(row.repository)}</a>`;
  });
  const traces = [...traceDefinitions].reverse();
  const rowsForAxis = shouldPreserveUnselectedRepositories
    ? displayRows.filter((row) => selectedRepositorySet.has(row.repository))
    : displayRows;
  const allRawValues = rowsForAxis.flatMap((row) =>
    metricDefinitions.map((trace) => metricOrZero(row, trace.metricName))
  );
  const maxRawValue = Math.max(...allRawValues, 0);
  const compressedTicks = customAxis ? [...customAxis.ticks] : [];
  const largestCompressedTick = compressedTicks.at(-1);

  if (customAxis?.extensionStep && maxRawValue > largestCompressedTick) {
    const extensionStep = customAxis.extensionStep;
    compressedTicks.push(Math.ceil(maxRawValue / extensionStep) * extensionStep);
  }

  const xaxis = customAxis
    ? {
        ...plotLayoutBase.xaxis,
        title: "Repository metric count (custom scale)",
        type: "linear",
        range: [
          0,
          compressRepositoryMetricValue(Math.max(compressedTicks.at(-1), maxRawValue), customAxis),
        ],
        tickmode: "array",
        tickvals: compressedTicks.map((tick) => compressRepositoryMetricValue(tick, customAxis)),
        ticktext: compressedTicks.map(formatNumber),
      }
    : {
        ...plotLayoutBase.xaxis,
        title: "Repository metric count",
        type: "linear",
        rangemode: "tozero",
        tickformat: ",d",
      };

  preparePlotContainer(elementId);
  const plotResult = Plotly.react(
    elementId,
    traces.map((trace) => {
      const rawValues = displayRows.map((row) => metricOrZero(row, trace.metricName));
      const visibleValues = rawValues.map((value, index) => {
        const row = displayRows[index];
        const isRepositorySelected =
          !shouldPreserveUnselectedRepositories ||
          selectedRepositorySet.has(row.repository);
        const isMetricSelected = selectedMetricSet.has(trace.metricName);
        return isRepositorySelected && isMetricSelected ? value : null;
      });

      return {
        type: "bar",
        orientation: "h",
        name: trace.name,
        y: repositoryNames,
        x: customAxis
          ? visibleValues.map((value) =>
              value === null ? null : compressRepositoryMetricValue(value, customAxis)
            )
          : visibleValues,
        customdata: repositoryFullNames.map((repositoryFullName, index) => [
          repositoryFullName,
          rawValues[index],
        ]),
        marker: {
          color: trace.color,
          line: { color: "rgba(255,255,255,0.45)", width: 1 },
        },
        hovertemplate:
          "%{customdata[0]}<br>" + trace.name + ": %{customdata[1]:,}<extra></extra>",
      };
    }),
    {
      ...plotLayoutBase,
      barmode: "group",
      bargap: 0.36,
      bargroupgap: 0.08,
      margin: { t: 36, r: 20, b: 72, l: 210 },
      legend: {
        orientation: "h",
        traceorder: "reversed",
        x: 0,
        y: legendY,
        xanchor: "left",
        yanchor: "bottom",
      },
      xaxis,
      yaxis: {
        ...plotLayoutBase.yaxis,
        title: "",
        categoryorder: "array",
        categoryarray: repositoryNames,
        tickmode: "array",
        tickvals: repositoryNames,
        ticktext: repositoryLabels,
      },
    },
    { displayModeBar: false, responsive: true }
  );

  if (typeof afterRender === "function") {
    Promise.resolve(plotResult).then(() => {
      requestAnimationFrame(afterRender);
    });
  }
}

function getSelectedRepositoryMetricDefinitions(controlName) {
  const selectedMetricNames = Array.from(
    document.querySelectorAll(`[name="${controlName}-metric"]:checked`)
  ).map((control) => control.value);

  return REPOSITORY_METRIC_DEFINITIONS.filter((metric) =>
    selectedMetricNames.includes(metric.metricName)
  );
}

function getSelectedRepositoryOrderMetric(controlName) {
  const selectedControl = document.querySelector(`[name="${controlName}-order"]:checked`);
  return selectedControl?.value || "total_views_14d";
}

function renderOrganizationRepositoryComparisonDashboard(chartConfig) {
  const { controlName, elementId, organization, ...chartOptions } = chartConfig;
  const metricDefinitions = getSelectedRepositoryMetricDefinitions(controlName);
  const selectedRepositoryNames = getSelectedRepositoryNames(controlName);
  updateRepositoryMetricControlSummaries(chartConfig);
  updateRepositoryFilterMetricSummaries(chartConfig);

  if (
    selectedRepositoryNames &&
    selectedRepositoryNames.length === 0 &&
    !chartOptions.preserveUnselectedRepositories
  ) {
    renderEmptyState(
      elementId,
      "No repositories selected",
      `Select at least one repository to show the ${organization} repository metrics.`
    );
    alignRepositorySelectionControls(chartConfig);
    return;
  }

  renderOrganizationRepositoriesComparisonChart(
    elementId,
    organization,
    {
      ...chartOptions,
      metricDefinitions,
      orderMetricName: getSelectedRepositoryOrderMetric(controlName),
      selectedRepositoryNames,
      afterRender: () => alignRepositorySelectionControls(chartConfig),
    }
  );
}

function renderOrganizationRepositoriesComparisonCharts() {
  ORGANIZATION_REPOSITORY_CHARTS.forEach(renderOrganizationRepositoryComparisonDashboard);
}

function renderSnapshotHistoryChart() {
  const metricName = state.snapshotMetric;
  const metricConfig = SNAPSHOT_METRICS[metricName];
  const rows = getFilteredSnapshotHistoryRows();
  const series = aggregateBy(rows, "snapshot_date", metricName).sort((left, right) =>
    left.key.localeCompare(right.key)
  );
  const totalsByDate = new Map(series.map((row) => [row.key, row.value]));
  const axisDates = series.length > 0 ? buildDateWindow(series.at(-1).key, 14) : [];
  const dates = axisDates;
  const values = axisDates.map((date) => totalsByDate.get(date) || 0);
  const yAxisTicks = buildLinearAxisTicks(Math.max(...values, 0));
  const yAxisMax = yAxisTicks.at(-1) || 1;

  if (series.length === 0) {
    renderEmptyState(
      "snapshot-history-chart",
      "Not enough snapshot history yet",
      "Add more screening snapshots on later dates to show the rolling 14-day trend."
    );
    return;
  }

  preparePlotContainer("snapshot-history-chart");
  Plotly.react(
    "snapshot-history-chart",
    [
      {
        type: "scatter",
        mode: "lines+markers",
        x: dates,
        y: values,
        line: { color: metricConfig.color, width: 3, shape: "linear" },
        marker: { size: 9, color: "#15342c" },
        hovertemplate:
          "%{x}<br>" + metricConfig.label + ": %{y:,}<extra></extra>",
      },
    ],
    {
      ...plotLayoutBase,
      xaxis: {
        ...plotLayoutBase.xaxis,
        title: "Snapshot date",
        type: "date",
        range: [axisDates[0], axisDates.at(-1)],
        tickmode: "array",
        tickvals: axisDates,
        ticktext: axisDates.map(formatDateKeyWithWeekday),
      },
      yaxis: {
        ...plotLayoutBase.yaxis,
        title: metricConfig.label,
        type: "linear",
        autorange: false,
        fixedrange: true,
        range: [0, yAxisMax],
        rangemode: "tozero",
        tickmode: "array",
        tickvals: yAxisTicks,
        ticktext: yAxisTicks.map((tick) => formatNumber(tick)),
        tickformat: ",d",
      },
    },
    { displayModeBar: false, responsive: true }
  );
}

function renderDailyTrendChart() {
  const metricName = DAILY_METRIC_BY_SNAPSHOT_METRIC[state.snapshotMetric] || "views_count";
  const metricConfig = DAILY_METRICS[metricName];
  const rows = getFilteredDailyRows();
  const series = aggregateBy(rows, "metric_date", metricName).sort((left, right) =>
    left.key.localeCompare(right.key)
  );
  const dates = series.map((row) => row.key);
  const values = series.map((row) => row.value);
  const yAxisTicks =
    metricName === "views_count"
      ? Array.from({ length: 6 }, (_, index) =>
          ((DAILY_VIEWS_AXIS_MAX_BY_ORGANIZATION[state.organization] || 3000) / 5) * index
        )
      : buildLinearAxisTicks(Math.max(...values, 0));
  const yAxisMax = yAxisTicks.at(-1) || 1;

  ui.dailyChartMetricLabel.textContent = metricConfig.label;

  if (series.length < 2) {
    renderEmptyState(
      "daily-trend-chart",
      "No daily trend yet",
      "Populate the daily_traffic table to unlock the daily metric column chart."
    );
    return;
  }

  preparePlotContainer("daily-trend-chart");
  Plotly.react(
    "daily-trend-chart",
    [
      {
        type: "bar",
        x: dates,
        y: values,
        marker: {
          color: metricConfig.color,
          line: { color: "rgba(255,255,255,0.45)", width: 1 },
        },
        hovertemplate:
          "%{x}<br>" + metricConfig.label + ": %{y:,}<extra></extra>",
      },
    ],
    {
      ...plotLayoutBase,
      bargap: 0.34,
      xaxis: {
        ...plotLayoutBase.xaxis,
        title: "Metric date",
        type: "category",
        categoryorder: "array",
        categoryarray: dates,
        tickmode: "array",
        tickvals: dates,
        ticktext: dates.map(formatDateKeyWithWeekday),
      },
      yaxis: {
        ...plotLayoutBase.yaxis,
        title: metricConfig.label,
        type: "linear",
        autorange: false,
        fixedrange: true,
        range: [0, yAxisMax],
        rangemode: "tozero",
        tickmode: "array",
        tickvals: yAxisTicks,
        ticktext: yAxisTicks.map((tick) => formatNumber(tick)),
        tickformat: ",d",
      },
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

  preparePlotContainer("heatmap-chart");
  Plotly.react(
    "heatmap-chart",
    [
      {
        type: "heatmap",
        x: dates,
        y: repositories,
        z: matrix,
        xgap: 1,
        ygap: 1,
        colorscale: HEATMAP_COLOR_SCALES[metricName] || HEATMAP_COLOR_SCALES.views_count,
        hovertemplate:
          "%{y}<br>%{x}<br>" + metricConfig.label + ": %{z:,}<extra></extra>",
      },
    ],
    {
      ...plotLayoutBase,
      plot_bgcolor: "rgba(21, 52, 44, 0.14)",
      margin: { t: 24, r: 12, b: 80, l: 180 },
      xaxis: {
        ...plotLayoutBase.xaxis,
        title: "Metric date",
        type: "category",
        categoryorder: "array",
        categoryarray: dates,
        tickmode: "array",
        tickvals: dates,
        ticktext: dates.map(formatDateKeyWithWeekday),
        showgrid: true,
        gridwidth: 1,
        gridcolor: "rgba(21, 52, 44, 0.16)",
      },
      yaxis: {
        ...plotLayoutBase.yaxis,
        title: "",
        showgrid: true,
        gridwidth: 1,
        gridcolor: "rgba(21, 52, 44, 0.16)",
      },
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
    .slice(0, 40);

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
  renderOrganizationRepositoriesComparisonCharts();
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

  ORGANIZATION_REPOSITORY_CHARTS.forEach((chartConfig) => {
    const renderChart = () => renderOrganizationRepositoryComparisonDashboard(chartConfig);

    document
      .querySelectorAll(
        `[name="${chartConfig.controlName}-metric"], [name="${chartConfig.controlName}-order"]`
      )
      .forEach((control) => {
        control.addEventListener("change", renderChart);
      });

    const selectAllControl = document.querySelector(
      `[name="${chartConfig.controlName}-repository-all"]`
    );
    selectAllControl?.addEventListener("change", (event) => {
      setRepositorySelection(chartConfig.controlName, event.target.checked);
      renderChart();
    });

    document
      .querySelectorAll(`[name="${chartConfig.controlName}-repository"]`)
      .forEach((control) => {
        control.addEventListener("change", () => {
          syncRepositorySelectAll(chartConfig.controlName);
          renderChart();
        });
      });

    if (chartConfig.repositoryFilterControls) {
      document
        .querySelectorAll(`[data-repository-filter="${chartConfig.controlName}"]`)
        .forEach((control) => {
          const eventName =
            control.matches('input[type="text"], input[type="number"]')
              ? "input"
              : "change";

          control.addEventListener(eventName, () => {
            normalizeRepositoryFilterControls(chartConfig.controlName, control);
            applyRepositoryFilterControls(chartConfig);
            renderChart();
          });
        });
    }
  });

  window.addEventListener("resize", () => {
    ORGANIZATION_REPOSITORY_CHARTS.forEach(alignRepositorySelectionControls);
  });
}

async function loadDashboard() {
  try {
    state.data = await readDashboardData();
    fillOrganizationFilter(state.data.organizations || []);
    populateRepositorySelectionControls();
    ensureRepositoryFilterControls();
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
