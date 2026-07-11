// ==========================================
// 1. IMPORT CÁC MÔ-ĐUN TỪ THƯ MỤC SRC
// ==========================================
import { state, rankingLabels } from './src/state.js';
import { loadAllDatasets, populateSelect, optionsFrom, getFilters, filterPlayers, rankingScore } from './src/utils.js';
import { drawCharts, initCharts } from './src/chart.js';
import {
  renderTable,
  buildPlayerSelectOptions,
  runCompare,
  buildLineupSlots,
  renderLineupAnalysis,
  calcLineupOverall,
  calcLineupZoneStats,
  predictTournament,
  changePage,
  resetPage,
} from './src/features.js';

// ==========================================
// 2. HÀM ĐIỀU PHỐI CHÍNH (CORE COORDINATOR)
// ==========================================
export function applyAnalytics(reset = false) {
  const filters = getFilters();
  if (reset) resetPage();

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
  document.getElementById("resultsMeta").innerHTML = `<div class="loading"><div class="spinner"></div><span>Loading dataset...</span></div>`;
  try {
    state.rawPlayers = dataset.includes("fc25") ? state.datasets.fc25 : state.datasets.fc26;

    populateSelect("positionFilter",    optionsFrom(state.rawPlayers, "position"),    "All Positions");
    populateSelect("leagueFilter",      optionsFrom(state.rawPlayers, "leagueName"),  "All Leagues");
    populateSelect("nationalityFilter", optionsFrom(state.rawPlayers, "nationality"), "All Nationalities");

    buildPlayerSelectOptions();
    applyAnalytics(true);
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
document.getElementById("applyBtn").addEventListener("click", () => applyAnalytics(true));
document.getElementById("compareBtn").addEventListener("click", runCompare);
document.getElementById("buildLineupBtn").addEventListener("click", buildLineupSlots);

// Reactive UI — cập nhật ngay khi thay đổi bộ lọc
document.getElementById("rankingSelect").addEventListener("change", () => applyAnalytics(true));
document.getElementById("positionFilter").addEventListener("change", () => applyAnalytics(true));
document.getElementById("leagueFilter").addEventListener("change", () => applyAnalytics(true));
document.getElementById("nationalityFilter").addEventListener("change", () => applyAnalytics(true));
document.getElementById("nameSearch").addEventListener("input", () => applyAnalytics(true));

// Bảng so sánh cầu thủ (runCompare is triggered on selection)

// Phân trang
document.getElementById("prevPage").addEventListener("click", () => { changePage(-1); applyAnalytics(); });
document.getElementById("nextPage").addEventListener("click", () => { changePage(1); applyAnalytics(); });

// Khởi tạo chart resize
initCharts();

// ==========================================
// 5. ĐIỂM KÍCH HOẠT ĐẦU TIÊN KHI TẢI TRANG
// ==========================================
loadAllDatasets()
  .then(loadDataset)
  .catch((err) => {
    document.getElementById("resultsMeta").textContent = String(err.message || err);
  });