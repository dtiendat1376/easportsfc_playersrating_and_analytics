// ==========================================
// 1. IMPORT CÁC MÔ-ĐUN TỪ THƯ MỤC SRC
// ==========================================
import { state, rankingScore, rankingLabels } from './src/state.js';
import { loadAllDatasets, populateSelect, optionsFrom, getFilters, filterPlayers } from './src/utils.js';
import { drawCharts } from './src/chart.js';
import {
  renderTable,
  buildPlayerSelectOptions,
  runCompare,
  buildLineupSlots,
  renderLineupAnalysis,
  calcLineupOverall,
  calcLineupZoneStats,
  predictTournament,
} from './src/features.js';

// ==========================================
// 2. HÀM ĐIỀU PHỐI CHÍNH (CORE COORDINATOR)
// ==========================================
export function applyAnalytics() {
  const filters = getFilters();

  // Tính điểm và lọc cầu thủ
  const visible = filterPlayers(state.rawPlayers, filters)
    .map((p) => ({ ...p, _score: rankingScore[filters.ranking](p) }));
  visible.sort((a, b) => b._score - a._score);

  state.filteredPlayers = visible.slice(0, filters.topN);

  // Cập nhật bảng và biểu đồ
  renderTable(state.filteredPlayers, filters.ranking);
  drawCharts(state.filteredPlayers);

  // Cập nhật KPI trên giao diện
  document.getElementById("kpiPlayers").textContent   = state.rawPlayers.length.toLocaleString();
  document.getElementById("kpiVisible").textContent   = state.filteredPlayers.length.toLocaleString();
  document.getElementById("kpiRanking").textContent   = rankingLabels[filters.ranking];
  document.getElementById("resultsTitle").textContent = `Top ${state.filteredPlayers.length} Players by ${rankingLabels[filters.ranking]}`;
  document.getElementById("resultsMeta").textContent  = `Filtered from ${visible.length.toLocaleString()} players`;
}

// ==========================================
// 3. HÀM KHỞI TẠO ỨNG DỤNG (INITIALIZER)
// ==========================================
async function loadDataset() {
  const dataset = document.getElementById("datasetSelect").value;
  document.getElementById("resultsMeta").textContent = "Loading dataset...";
  try {
    state.rawPlayers = dataset.includes("fc25") ? state.datasets.fc25 : state.datasets.fc26;

    populateSelect("positionFilter",    optionsFrom(state.rawPlayers, "position"),    "All Positions");
    populateSelect("leagueFilter",      optionsFrom(state.rawPlayers, "leagueName"),  "All Leagues");
    populateSelect("nationalityFilter", optionsFrom(state.rawPlayers, "nationality"), "All Nationalities");

    buildPlayerSelectOptions();
    applyAnalytics();
    buildLineupSlots();
    runCompare();
  } catch (err) {
    document.querySelector("#resultsTable thead").innerHTML = "";
    document.querySelector("#resultsTable tbody").innerHTML =
      `<tr><td class='warn'>Error loading data. Please ensure local server is running.</td></tr>`;
    document.getElementById("resultsMeta").textContent = String(err.message || err);
  }
}

// ==========================================
// 4. ĐĂNG KÝ CÁC SỰ KIỆN (EVENT LISTENERS)
// ==========================================

// Thay đổi dataset
document.getElementById("datasetSelect").addEventListener("change", loadDataset);

// Nút bấm thủ công
document.getElementById("applyBtn").addEventListener("click", applyAnalytics);
document.getElementById("compareBtn").addEventListener("click", runCompare);
document.getElementById("buildLineupBtn").addEventListener("click", buildLineupSlots);

// Reactive UI — cập nhật ngay khi thay đổi bộ lọc
document.getElementById("rankingSelect").addEventListener("change", applyAnalytics);
document.getElementById("positionFilter").addEventListener("change", applyAnalytics);
document.getElementById("leagueFilter").addEventListener("change", applyAnalytics);
document.getElementById("nationalityFilter").addEventListener("change", applyAnalytics);
document.getElementById("nameSearch").addEventListener("input", applyAnalytics);

// Bảng so sánh cầu thủ
document.getElementById("compareMode").addEventListener("change", runCompare);
document.getElementById("comparePlayerA").addEventListener("change", runCompare);
document.getElementById("comparePlayerB").addEventListener("change", runCompare);

// ==========================================
// 5. ĐIỂM KÍCH HOẠT ĐẦU TIÊN KHI TẢI TRANG
// ==========================================
loadAllDatasets()
  .then(loadDataset)
  .catch((err) => {
    document.getElementById("resultsMeta").textContent = String(err.message || err);
  });