import { state, compareMetrics, formationMap } from './state.js';
import { num, avg, fullName, optionsFrom, populateSelect, columnsFor, displayValue, filterPlayers, getFilters, rankingScore } from './utils.js';

let _page = 1;
const PAGE_SIZE = 25;

export function renderTable(players, ranking) {
  const totalPages = Math.max(1, Math.ceil(players.length / PAGE_SIZE));
  _page = Math.min(_page, totalPages);
  const start = (_page - 1) * PAGE_SIZE;
  const pagePlayers = players.slice(start, start + PAGE_SIZE);
  const columns = columnsFor(ranking);
  const thead = document.querySelector("#resultsTable thead");
  const tbody = document.querySelector("#resultsTable tbody");
  thead.innerHTML = "";
  tbody.innerHTML = "";
  const trh = document.createElement("tr");
  columns.forEach(([, label]) => {
    const th = document.createElement("th");
    th.textContent = label;
    trh.appendChild(th);
  });
  thead.appendChild(trh);
  pagePlayers.forEach((p) => {
    const tr = document.createElement("tr");
    columns.forEach(([key]) => {
      const td = document.createElement("td");
      const val = displayValue(p, key);
      if (key === "positionType" && val !== "-") td.innerHTML = `<span class="pill">${val}</span>`;
      else td.textContent = val;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  updatePagination(players.length);
}

export function changePage(delta) {
  _page = Math.max(1, _page + delta);
}

export function resetPage() {
  _page = 1;
}

function updatePagination(total) {
  const container = document.getElementById("pagination");
  const prevBtn = document.getElementById("prevPage");
  const nextBtn = document.getElementById("nextPage");
  const info = document.getElementById("pageInfo");
  if (!container) return;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (totalPages <= 1) { container.hidden = true; return; }
  container.hidden = false;
  prevBtn.disabled = _page <= 1;
  nextBtn.disabled = _page >= totalPages;
  info.textContent = `Page ${_page} of ${totalPages}`;
}

const RADAR_LABELS = ["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"];
const RADAR_KEYS = ["pac", "sho", "pas", "dri", "def", "phy"];

function drawRadar(playerA, playerB, labelA, labelB) {
  const canvas = document.getElementById("radarChart");
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext("2d");
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = Math.min(cx, cy) * 0.65;
  const levels = 5;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const aVals = RADAR_KEYS.map(k => num(playerA[k]) / 99);
  const bVals = RADAR_KEYS.map(k => num(playerB[k]) / 99);

  function polar(i, r) {
    const angle = (Math.PI * 2 * i) / RADAR_LABELS.length - Math.PI / 2;
    return { x: cx + r * radius * Math.cos(angle), y: cy + r * radius * Math.sin(angle) };
  }

  // Grid
  ctx.strokeStyle = "rgba(159,187,214,0.15)";
  ctx.lineWidth = 1 * dpr;
  for (let lv = 1; lv <= levels; lv++) {
    const r = lv / levels;
    ctx.beginPath();
    for (let i = 0; i <= RADAR_LABELS.length; i++) {
      const p = polar(i % RADAR_LABELS.length, r);
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // Axes
  for (let i = 0; i < RADAR_LABELS.length; i++) {
    const p = polar(i, 1);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  // Labels
  ctx.font = `${11 * dpr}px Barlow`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < RADAR_LABELS.length; i++) {
    const p = polar(i, 1.12);
    ctx.fillStyle = "#9fbbd6";
    ctx.fillText(RADAR_LABELS[i], p.x, p.y);
  }

  // Player A polygon
  ctx.beginPath();
  for (let i = 0; i <= RADAR_LABELS.length; i++) {
    const p = polar(i % RADAR_LABELS.length, aVals[i % RADAR_LABELS.length]);
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.fillStyle = "rgba(75,209,165,0.2)";
  ctx.fill();
  ctx.strokeStyle = "#4bd1a5";
  ctx.lineWidth = 2 * dpr;
  ctx.stroke();

  // Player B polygon
  ctx.beginPath();
  for (let i = 0; i <= RADAR_LABELS.length; i++) {
    const p = polar(i % RADAR_LABELS.length, bVals[i % RADAR_LABELS.length]);
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.fillStyle = "rgba(255,202,114,0.2)";
  ctx.fill();
  ctx.strokeStyle = "#ffca72";
  ctx.lineWidth = 2 * dpr;
  ctx.stroke();

  // Legend
  const legendY = canvas.height - 10 * dpr;
  ctx.font = `${11 * dpr}px Barlow`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  const midX = cx;
  ctx.fillStyle = "#4bd1a5";
  ctx.fillText(`● ${labelA}`, midX - 80 * dpr, legendY);
  ctx.fillStyle = "#ffca72";
  ctx.fillText(`● ${labelB}`, midX + 80 * dpr, legendY);
}

// Internal state for selected player IDs from the search inputs
const compareSelection = { A: null, B: null };

function buildPlayerSearch(slot) {
  const inputId    = `compareSearchInput${slot}`;
  const dropdownId = `compareDropdown${slot}`;
  const input      = document.getElementById(inputId);
  const dropdown   = document.getElementById(dropdownId);
  if (!input || !dropdown) return;

  function renderDropdown(query) {
    const q = query.trim().toLowerCase();
    dropdown.innerHTML = "";
    if (!q) { dropdown.hidden = true; return; }

    const allPlayers = [
      ...state.datasets.fc26.map(p => ({ ...p, _tag: "FC26" })),
      ...state.datasets.fc25.map(p => ({ ...p, _tag: "FC25" })),
    ];

    const matches = allPlayers
      .filter((p) => fullName(p).toLowerCase().includes(q))
      .sort((a, b) => num(b.overallRating) - num(a.overallRating))
      .slice(0, 8);

    if (!matches.length) { dropdown.hidden = true; return; }

    matches.forEach((p) => {
      const item = document.createElement("div");
      item.className = "search-suggestion";
      item.textContent = `${fullName(p)} (${p._tag})`;
      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        compareSelection[slot] = { id: p.id, datasetKey: p._tag === "FC26" ? "fc26" : "fc25" };
        input.value = fullName(p);
        dropdown.hidden = true;
        runCompare();
      });
      dropdown.appendChild(item);
    });
    dropdown.hidden = false;
  }

  input.addEventListener("input", () => renderDropdown(input.value));
  input.addEventListener("blur",  () => setTimeout(() => { dropdown.hidden = true; }, 150));
  input.addEventListener("focus", () => renderDropdown(input.value));
}

export function buildPlayerSelectOptions() {
  compareSelection.A = null;
  compareSelection.B = null;
  ["A", "B"].forEach(slot => {
    const input = document.getElementById(`compareSearchInput${slot}`);
    if (input) input.value = "";
  });
  buildPlayerSearch("A");
  buildPlayerSearch("B");
}

function renderCompareTable(left, right, leftLabel, rightLabel) {
  const thead = document.querySelector("#compareTable thead");
  const tbody = document.querySelector("#compareTable tbody");
  thead.innerHTML = "";
  tbody.innerHTML = "";
  const hr = document.createElement("tr");
  ["Metric", leftLabel, rightLabel, "Diff"].forEach((t) => {
    const th = document.createElement("th");
    th.textContent = t;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  compareMetrics.forEach((m) => {
    if (m === "playStyles" || m === "playStylesPlus") {
      const lStyles = String(left[m] || "").split(",").map(s => s.trim()).filter(Boolean);
      const rStyles = String(right[m] || "").split(",").map(s => s.trim()).filter(Boolean);
      const all = [...new Set([...lStyles, ...rStyles])];
      all.forEach((style, i) => {
        const tr = document.createElement("tr");
        const inL = lStyles.includes(style);
        const inR = rStyles.includes(style);
        const metricLabel = i === 0 ? (m === "playStylesPlus" ? "PlayStyles+" : "PlayStyles") : "";
        const td0 = document.createElement("td"); td0.textContent = metricLabel; tr.appendChild(td0);
        const td1 = document.createElement("td"); td1.textContent = inL ? style : "-"; tr.appendChild(td1);
        const td2 = document.createElement("td"); td2.textContent = inR ? style : "-"; tr.appendChild(td2);
        const td3 = document.createElement("td"); td3.textContent = inL === inR ? "" : inL ? "→" : "←"; tr.appendChild(td3);
        tbody.appendChild(tr);
      });
      return;
    }
    const tr = document.createElement("tr");
    const lv = num(left[m]), rv = num(right[m]);
    const diff = (lv - rv).toFixed(1);
    [m, lv.toFixed(1), rv.toFixed(1), diff].forEach((val) => {
      const td = document.createElement("td");
      td.textContent = val;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

export function runCompare() {
  const selA = compareSelection.A;
  const selB = compareSelection.B;
  if (!selA || !selB) return;

  const datasetKeyA = selA.datasetKey || "fc26";
  const datasetKeyB = selB.datasetKey || "fc26";
  const playerA = state.datasets[datasetKeyA].find((p) => p.id === selA.id);
  const playerB = state.datasets[datasetKeyB].find((p) => p.id === selB.id);
  if (!playerA || !playerB) return;

  const labelA = `${fullName(playerA)} (${datasetKeyA.toUpperCase()})`;
  const labelB = `${fullName(playerB)} (${datasetKeyB.toUpperCase()})`;
  renderCompareTable(playerA, playerB, labelA, labelB);
  drawRadar(playerA, playerB, labelA, labelB);
}

// ── Lineup / Formation ─────────────────────────────────────────────────

function parseFormation(str) {
  const parts = str.split("-").map(s => parseInt(s.trim(), 10));
  if (parts.length < 2 || parts.some(isNaN)) return null;
  const total = parts.reduce((a, b) => a + b, 0);
  if (total !== 10) return null;

  const roles = ["GK"];
  const [defs, ...rest] = parts;
  const mids = rest.slice(0, -1).reduce((a, b) => a + b, 0);
  const fwds = rest[rest.length - 1];

  // Defenders
  if (defs === 4) roles.push("RB", "CB", "CB", "LB");
  else if (defs === 3) roles.push("CB", "CB", "CB");
  else if (defs === 5) roles.push("LWB", "CB", "CB", "CB", "RWB");
  else for (let i = 0; i < defs; i++) roles.push("CB");

  // Midfielders
  const midParts = parts.length === 3 ? [parts[1]] : rest.slice(0, -1);
  const midRoles = [];
  midParts.forEach((count, layer) => {
    for (let i = 0; i < count; i++) {
      if (layer === 0 && count <= 2) midRoles.push("CDM");
      else if (layer === 0) midRoles.push(i === 0 ? "CDM" : "CM");
      else if (layer === 1 && count <= 2) midRoles.push(i === 0 ? "LM" : "RM");
      else if (layer === 1) midRoles.push(["LM", "CAM", "CAM", "RM"][i] || "CAM");
      else midRoles.push("CM");
    }
  });
  // Fallback if no midParts
  if (!midRoles.length) {
    for (let i = 0; i < mids; i++) midRoles.push("CM");
  }
  roles.push(...midRoles);

  // Forwards
  if (fwds === 1) roles.push("ST");
  else if (fwds === 2) roles.push("ST", "ST");
  else if (fwds === 3) roles.push("LW", "ST", "RW");
  else for (let i = 0; i < fwds; i++) roles.push("ST");

  return roles;
}

const ROLE_POSITIONS = {
  GK:  { x: 0.50, y: 0.88 },
  RB:  { x: 0.90, y: 0.72 }, RWB: { x: 0.90, y: 0.68 },
  CB:  { x: 0.50, y: 0.76 },
  LB:  { x: 0.10, y: 0.72 }, LWB: { x: 0.10, y: 0.68 },
  CDM: { x: 0.50, y: 0.58 }, DM:  { x: 0.50, y: 0.58 },
  CM:  { x: 0.50, y: 0.50 },
  CAM: { x: 0.50, y: 0.40 }, AM:  { x: 0.50, y: 0.34 },
  RM:  { x: 0.85, y: 0.50 },
  LM:  { x: 0.15, y: 0.50 },
  RW:  { x: 0.85, y: 0.28 },
  LW:  { x: 0.15, y: 0.28 },
  ST:  { x: 0.50, y: 0.18 },
  CF:  { x: 0.50, y: 0.22 },
};

function getSlotPositions(roles) {
  const counts = {};
  roles.forEach(r => { counts[r] = (counts[r] || 0) + 1; });
  const seen = {};
  return roles.map(role => {
    seen[role] = (seen[role] || 0);
    const idx = seen[role]++;
    const base = ROLE_POSITIONS[role] || { x: 0.50, y: 0.50 };
    let x = base.x;
    if (counts[role] > 1) {
      const spread = role === "CB" ? 0.36 : 0.26;
      x = base.x + ((idx / (counts[role] - 1)) - 0.5) * spread;
    }
    return { role, x, y: base.y };
  });
}

const lineupSelections = [];

function findCompatiblePlayers(role, query) {
  const q = query.trim().toLowerCase();
  const selectedIds = new Set(lineupSelections.filter(s => s.player).map(s => s.player.id));
  const datasetTag = state.rawPlayers === state.datasets.fc26 ? "FC26" : "FC25";
  return state.rawPlayers
    .filter(p => {
      if (selectedIds.has(p.id)) return false;
      const roleMatch = p.position === role || (p.alternatePositions || "").split(",").map(s => s.trim()).includes(role);
      const nameMatch = !q || fullName(p).toLowerCase().includes(q);
      return roleMatch && nameMatch;
    })
    .sort((a, b) => num(b.overallRating) - num(a.overallRating))
    .slice(0, 30)
    .map(p => ({ ...p, _tag: datasetTag }));
}

function renderSlotSearch(slotIdx, inputEl, dropdownEl) {
  const role = lineupSelections[slotIdx]?.role;
  if (!role) return;
  const q = inputEl.value;
  const players = findCompatiblePlayers(role, q);
  dropdownEl.innerHTML = "";
  if (!players.length) {
    dropdownEl.innerHTML = `<div class="search-suggestion" style="color:var(--danger)">No players found</div>`;
    return;
  }
  players.forEach(p => {
    const item = document.createElement("div");
    item.className = "search-suggestion";
    const posLabel = p.position !== role ? `${p.position} (alt)` : p.position;
    item.textContent = `${fullName(p)} (${p._tag}, ${posLabel}, ${p.overallRating})`;
    item.addEventListener("mousedown", (e) => {
      e.preventDefault();
      lineupSelections[slotIdx].playerId = p.id;
      lineupSelections[slotIdx].player = p;
      inputEl.value = fullName(p);
      dropdownEl.innerHTML = "";
      inputEl.blur();
      updateSlotDisplay(slotIdx);
      renderLineupAnalysis(getLineupFromSelections());
    });
    dropdownEl.appendChild(item);
  });
}

function updateSlotDisplay(slotIdx) {
  const slot = lineupSelections[slotIdx];
  const el = document.querySelector(`.player-slot[data-idx="${slotIdx}"]`);
  if (!el) return;
  const avatar = el.querySelector(".slot-avatar");
  const nameEl = el.querySelector(".slot-name");
  if (slot.player) {
    avatar.textContent = fullName(slot.player).charAt(0).toUpperCase();
    avatar.classList.add("filled");
    nameEl.textContent = fullName(slot.player);
  } else {
    avatar.textContent = "?";
    avatar.classList.remove("filled");
    nameEl.textContent = "";
  }
}

function getLineupFromSelections() {
  return lineupSelections
    .filter(s => s.player)
    .map(s => ({ role: s.role, player: s.player }));
}

function closeAllSlotSearches() {
  document.querySelectorAll(".player-slot").forEach(el => el.classList.remove("active"));
}

function updateFormationInput() {
  const field = document.getElementById("soccerField");
  if (!field) return;
  const slots = field.querySelectorAll(".player-slot");
  const roles = Array.from(slots)
    .map(el => ({
      role: el.querySelector(".slot-role").textContent,
      top: parseFloat(el.style.top) || 50,
    }))
    .sort((a, b) => b.top - a.top)
    .map(s => s.role);
  const input = document.getElementById("formationInput");
  if (input) input.value = roles.join(",");
}

function roleFromPosition(xPct, yPct) {
  const side = xPct < 28 ? "L" : xPct > 72 ? "R" : "C";
  const band = yPct > 80 ? "GK" : yPct > 62 ? "DEF" : yPct > 42 ? "MID" : yPct > 25 ? "AM" : "FWD";
  if (band === "GK") return "GK";
  if (band === "DEF") {
    if (side === "L") return "LB";
    if (side === "R") return "RB";
    return "CB";
  }
  if (band === "MID") {
    if (side === "L") return "LM";
    if (side === "R") return "RM";
    return yPct > 55 ? "CDM" : "CM";
  }
  if (band === "AM") {
    if (side === "L") return "LW";
    if (side === "R") return "RW";
    return yPct > 35 ? "CAM" : "AM";
  }
  if (side === "L") return "LW";
  if (side === "R") return "RW";
  return "ST";
}

export function buildLineupSlots() {
  const input = document.getElementById("formationInput");
  const val = input.value.trim();
  let roles;
  if (val.includes(",")) {
    roles = val.split(",").map(s => s.trim()).filter(Boolean);
  } else if (val.includes("-")) {
    roles = parseFormation(val);
    if (!roles) roles = formationMap[val] || formationMap["4-3-3"];
  } else if (val) {
    roles = formationMap[val] || formationMap["4-3-3"];
  } else {
    roles = formationMap["4-3-3"];
  }

  const field = document.getElementById("soccerField");
  const container = document.getElementById("fieldContainer");
  if (!field) return;
  container.hidden = false;
  field.innerHTML = "";

  const positions = getSlotPositions(roles);
  lineupSelections.length = 0;

  positions.forEach((pos, idx) => {
    lineupSelections.push({ role: pos.role, playerId: null, player: null });

    const slot = document.createElement("div");
    slot.className = "player-slot";
    slot.dataset.idx = idx;
    slot.style.left = `${pos.x * 100}%`;
    slot.style.top = `${pos.y * 100}%`;

    const avatar = document.createElement("div");
    avatar.className = "slot-avatar";
    avatar.textContent = "?";
    slot.appendChild(avatar);

    const roleLabel = document.createElement("div");
    roleLabel.className = "slot-role";
    roleLabel.textContent = pos.role;
    slot.appendChild(roleLabel);

    const nameEl = document.createElement("div");
    nameEl.className = "slot-name";
    slot.appendChild(nameEl);

    // Search popup
    const searchWrap = document.createElement("div");
    searchWrap.className = "slot-search-wrap";
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = `Search...`;
    searchInput.autocomplete = "off";
    searchWrap.appendChild(searchInput);
    const dropdown = document.createElement("div");
    dropdown.className = "slot-dropdown";
    searchWrap.appendChild(dropdown);
    slot.appendChild(searchWrap);

    // Slot click toggles search
    slot.addEventListener("click", (e) => {
      if (searchWrap.contains(e.target)) return;
      closeAllSlotSearches();
      slot.classList.add("active");
      searchInput.focus();
      renderSlotSearch(idx, searchInput, dropdown);
    });

    // Search input handler
    searchInput.addEventListener("input", () => {
      renderSlotSearch(idx, searchInput, dropdown);
    });
    searchInput.addEventListener("blur", () => {
      setTimeout(() => { slot.classList.remove("active"); }, 200);
    });

    // Drag to reposition
    slot.addEventListener("mousedown", (e) => {
      if (searchWrap.contains(e.target) || slot.classList.contains("active")) return;
      e.preventDefault();
      const fieldRect = field.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = parseFloat(slot.style.left) || 50;
      const startTop = parseFloat(slot.style.top) || 50;

      function onMove(ev) {
        const dx = ((ev.clientX - startX) / fieldRect.width) * 100;
        const dy = ((ev.clientY - startY) / fieldRect.height) * 100;
        slot.style.left = `${Math.max(2, Math.min(98, startLeft + dx))}%`;
        slot.style.top = `${Math.max(2, Math.min(98, startTop + dy))}%`;
      }
      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        const topPct = parseFloat(slot.style.top);
        const leftPct = parseFloat(slot.style.left);
        const newRole = roleFromPosition(leftPct, topPct);
        const roleLabel = slot.querySelector(".slot-role");
        const searchInput2 = slot.querySelector(".slot-search-wrap input");
        if (roleLabel && newRole !== roleLabel.textContent) {
          roleLabel.textContent = newRole;
          lineupSelections[idx].role = newRole;
          if (searchInput2) searchInput2.placeholder = `Search ${newRole}...`;
          if (lineupSelections[idx].player) {
            const p = lineupSelections[idx].player;
            const roleMatch = p.position === newRole || (p.alternatePositions || "").split(",").map(s => s.trim()).includes(newRole);
            if (!roleMatch) {
              lineupSelections[idx].playerId = null;
              lineupSelections[idx].player = null;
              updateSlotDisplay(idx);
              renderLineupAnalysis(getLineupFromSelections());
            }
          }
        }
        updateFormationInput();
      }
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });

    field.appendChild(slot);
  });

  renderLineupAnalysis([]);
}

// ==========================================
// LINEUP ANALYSIS & TOURNAMENT PREDICTION
// ==========================================

// Tournament benchmark data — average squad overalls of top clubs per competition
const TOURNAMENT_BENCHMARKS = {
  ucl: {
    label: "UEFA Champions League",
    emoji: "🏆",
    tiers: [
      { name: "Elite (QF+)",    minOverall: 84, winChance: 0.72, description: "Contender for the title" },
      { name: "Competitive (R16)", minOverall: 81, winChance: 0.45, description: "Likely to reach knockout rounds" },
      { name: "Group Stage",    minOverall: 78, winChance: 0.25, description: "Can qualify from group stage" },
      { name: "Struggles",      minOverall: 0,  winChance: 0.08, description: "Would struggle against top sides" },
    ],
  },
  laliga: {
    label: "La Liga",
    emoji: "🇪🇸",
    tiers: [
      { name: "Title Contender",  minOverall: 83, winChance: 0.68, description: "Fighting for the title" },
      { name: "Top 4",            minOverall: 80, winChance: 0.50, description: "Champions League spot likely" },
      { name: "Mid-table",        minOverall: 76, winChance: 0.30, description: "Safe mid-table finish" },
      { name: "Relegation Risk",  minOverall: 0,  winChance: 0.10, description: "Risk of relegation" },
    ],
  },
  epl: {
    label: "Premier League",
    emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    tiers: [
      { name: "Title Contender",  minOverall: 84, winChance: 0.65, description: "Can challenge for the title" },
      { name: "Top 6",            minOverall: 81, winChance: 0.48, description: "European football secured" },
      { name: "Mid-table",        minOverall: 77, winChance: 0.28, description: "Comfortable mid-table" },
      { name: "Relegation Risk",  minOverall: 0,  winChance: 0.10, description: "Relegation battle likely" },
    ],
  },
  seriea: {
    label: "Serie A",
    emoji: "🇮🇹",
    tiers: [
      { name: "Scudetto Contender", minOverall: 82, winChance: 0.65, description: "Fighting for the Scudetto" },
      { name: "Top 4",              minOverall: 79, winChance: 0.48, description: "Champions League qualifier" },
      { name: "Mid-table",          minOverall: 75, winChance: 0.28, description: "Safe mid-table" },
      { name: "Relegation Risk",    minOverall: 0,  winChance: 0.10, description: "Danger zone" },
    ],
  },
  bundesliga: {
    label: "Bundesliga",
    emoji: "🇩🇪",
    tiers: [
      { name: "Meister Contender", minOverall: 82, winChance: 0.62, description: "Fighting for the Meisterschale" },
      { name: "Top 4",             minOverall: 78, winChance: 0.45, description: "European spot likely" },
      { name: "Mid-table",         minOverall: 74, winChance: 0.26, description: "Safe mid-table finish" },
      { name: "Relegation Risk",   minOverall: 0,  winChance: 0.08, description: "Play-off or relegation" },
    ],
  },
};

// Role-to-zone mapping for stat weighting
const ROLE_ZONE = {
  GK:  "gk",
  CB:  "defense", RB: "defense", LB: "defense",
  CDM: "midfield", CM: "midfield", CAM: "midfield",
  RM:  "midfield", LM: "midfield", AM: "midfield",
  RW:  "attack",  LW: "attack",  ST: "attack",
};

// Weighted stat importance per zone
const ZONE_STATS = {
  gk:      ["gkDiving", "gkHandling", "gkKicking", "gkPositioning", "gkReflexes"],
  defense: ["def", "defensiveAwareness", "standingTackle", "slidingTackle", "interceptions", "phy", "headingAccuracy"],
  midfield:["pas", "dri", "pac", "stamina", "vision", "shortPassing", "longPassing"],
  attack:  ["sho", "pac", "dri", "finishing", "positioning", "acceleration", "sprintSpeed"],
};

export function calcLineupOverall(lineup) {
  // lineup: array of { role, player }
  if (!lineup.length) return 0;
  // GK counts less toward outfield average; weight outfield players more
  const weights = lineup.map(({ role }) => role === "GK" ? 0.7 : 1.0);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const weightedSum = lineup.reduce((sum, { player }, i) => sum + num(player.overallRating) * weights[i], 0);
  return weightedSum / totalWeight;
}

export function calcLineupZoneStats(lineup) {
  const zones = { gk: [], defense: [], midfield: [], attack: [] };
  lineup.forEach(({ role, player }) => {
    const zone = ROLE_ZONE[role] || "midfield";
    const stats = ZONE_STATS[zone];
    const zoneScore = avg(stats.map((s) => num(player[s])));
    zones[zone].push(zoneScore);
  });
  return {
    gk:       zones.gk.length       ? avg(zones.gk)       : 0,
    defense:  zones.defense.length  ? avg(zones.defense)  : 0,
    midfield: zones.midfield.length ? avg(zones.midfield) : 0,
    attack:   zones.attack.length   ? avg(zones.attack)   : 0,
  };
}

export function predictTournament(overallRating, zoneStats, tournamentKey) {
  const tournament = TOURNAMENT_BENCHMARKS[tournamentKey];
  if (!tournament) return null;

  // Find tier
  const tier = tournament.tiers.find((t) => overallRating >= t.minOverall) || tournament.tiers[tournament.tiers.length - 1];

  // Adjust win chance based on balance between zones (a badly unbalanced team is punished)
  const scores = [zoneStats.defense, zoneStats.midfield, zoneStats.attack].filter(Boolean);
  const minZone = Math.min(...scores);
  const maxZone = Math.max(...scores);
  const balancePenalty = maxZone > 0 ? Math.max(0, (maxZone - minZone) / maxZone - 0.25) * 0.15 : 0;
  const adjustedWinChance = Math.max(0.03, tier.winChance - balancePenalty);

  // Weakest zone warning
  const zoneLabels = { defense: "Defense", midfield: "Midfield", attack: "Attack" };
  const weakestKey = Object.entries({ defense: zoneStats.defense, midfield: zoneStats.midfield, attack: zoneStats.attack })
    .sort((a, b) => a[1] - b[1])[0][0];

  return {
    tournament: tournament.label,
    emoji:      tournament.emoji,
    tier:       tier.name,
    description: tier.description,
    winChance:  adjustedWinChance,
    balancePenalty: balancePenalty > 0,
    weakestZone: zoneLabels[weakestKey],
    weakestScore: Math.round(zoneStats[weakestKey]),
  };
}

export function renderLineupAnalysis(lineup) {
  const container = document.getElementById("lineupAnalysis");
  if (!container) return;

  if (lineup.length < 11) {
    container.innerHTML = `<p class="warn">Select all 11 players to see lineup analysis.</p>`;
    return;
  }

  const overall    = calcLineupOverall(lineup);
  const zoneStats  = calcLineupZoneStats(lineup);
  const tournaments = Object.keys(TOURNAMENT_BENCHMARKS);
  const predictions = tournaments.map((key) => predictTournament(overall, zoneStats, key));

  // Build HTML
  const barFill = (val, max = 100) => `<div class="stat-bar"><div class="stat-bar-fill" style="width:${Math.min(100, (val / max) * 100).toFixed(1)}%"></div><span>${Math.round(val)}</span></div>`;

  const zonesHTML = `
    <div class="lineup-zones">
      <div class="zone-card">🧤 GK<br>${barFill(zoneStats.gk)}</div>
      <div class="zone-card">🛡️ Defense<br>${barFill(zoneStats.defense)}</div>
      <div class="zone-card">⚙️ Midfield<br>${barFill(zoneStats.midfield)}</div>
      <div class="zone-card">⚡ Attack<br>${barFill(zoneStats.attack)}</div>
    </div>`;

  const predictionsHTML = predictions.map((p) => `
    <div class="prediction-card">
      <div class="pred-header">${p.emoji} ${p.tournament}</div>
      <div class="pred-tier">${p.tier}</div>
      <div class="pred-desc">${p.description}</div>
      <div class="pred-chance">
        <span>Win probability</span>
        ${barFill(p.winChance * 100)}
      </div>
      ${p.balancePenalty ? `<div class="pred-warn">⚠️ Weak ${p.weakestZone} (${p.weakestScore}) hurts balance</div>` : ""}
    </div>`).join("");

  container.innerHTML = `
    <div class="lineup-analysis-header">
      <div class="lineup-overall">
        <span class="overall-label">Squad Overall</span>
        <span class="overall-value">${overall.toFixed(1)}</span>
      </div>
    </div>
    <h4>Zone Ratings</h4>
    ${zonesHTML}
    <h4>Tournament Predictions</h4>
    <div class="predictions-grid">${predictionsHTML}</div>`;
}