import { state, rankingScore, compareMetrics, formationMap } from './state.js';
import { num, avg, fullName, optionsFrom, populateSelect, columnsFor, displayValue, filterPlayers, getFilters } from './utils.js';

export function renderTable(players, ranking) {
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
  players.forEach((p) => {
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
}

export function buildPlayerSelectOptions() {
  const options = state.rawPlayers
    .map((p) => ({ value: p.id, label: `${fullName(p)} (${p.position || "-"}, ${p.overallRating || "-"})` }))
    .sort((a, b) => a.label.localeCompare(b.label));
  ["comparePlayerA", "comparePlayerB"].forEach((id) => {
    const el = document.getElementById(id);
    const prev = el.value;
    el.innerHTML = "";
    options.forEach((opt) => {
      const o = document.createElement("option");
      o.value = opt.value; o.textContent = opt.label;
      el.appendChild(o);
    });
    if (options.length) {
      el.value = options.some((o) => o.value === prev) ? prev : options[0].value;
    }
  });
}

function averagesOf(players) {
  const out = { id: "AVG", firstName: "Dataset", lastName: "Average" };
  compareMetrics.forEach((m) => {
    out[m] = players.length ? avg(players.map((p) => p[m])).toFixed(1) : "0";
  });
  return out;
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
  const mode    = document.getElementById("compareMode").value;
  const idA     = document.getElementById("comparePlayerA").value;
  const idB     = document.getElementById("comparePlayerB").value;
  const playerA = state.rawPlayers.find((p) => p.id === idA);
  const playerB = state.rawPlayers.find((p) => p.id === idB);
  if (!playerA) return;

  if (mode === "player_vs_player") {
    if (!playerB) return;
    renderCompareTable(playerA, playerB, fullName(playerA), fullName(playerB));
    return;
  }
  if (mode === "player_vs_average") {
    renderCompareTable(playerA, averagesOf(state.rawPlayers), fullName(playerA), "Dataset Average");
    return;
  }
  const fc26Player = state.datasets.fc26.find((p) => p.id === idA);
  const fc25Player = state.datasets.fc25.find((p) => p.id === idA);
  if (!fc26Player || !fc25Player) {
    document.querySelector("#compareTable thead").innerHTML = "";
    document.querySelector("#compareTable tbody").innerHTML = "<tr><td class='warn'>Player not found in both FC26 and FC25.</td></tr>";
    return;
  }
  renderCompareTable(fc26Player, fc25Player, `${fullName(fc26Player)} FC26`, `${fullName(fc25Player)} FC25`);
}

function playerOptionsByRole(role) {
  return state.rawPlayers
    .filter((p) => p.position === role || (p.alternatePositions || "").split(",").map((x) => x.trim()).includes(role))
    .sort((a, b) => num(b.overallRating) - num(a.overallRating))
    .slice(0, 150);
}

function getSelectedLineup() {
  const slots = document.querySelectorAll("#lineupGrid .lineup-slot select");
  const lineup = [];
  slots.forEach((select) => {
    const role   = select.dataset.role;
    const player = state.rawPlayers.find((p) => p.id === select.value);
    if (role && player) lineup.push({ role, player });
  });
  return lineup;
}

export function buildLineupSlots() {
  const formation = document.getElementById("formationSelect").value;
  const roles     = formationMap[formation] || formationMap["4-3-3"];
  const container = document.getElementById("lineupGrid");
  container.innerHTML = "";
  roles.forEach((role, idx) => {
    const wrap = document.createElement("div");
    wrap.className = "lineup-slot";
    const label = document.createElement("p");
    label.textContent = `Slot ${idx + 1}: ${role}`;
    wrap.appendChild(label);
    const select = document.createElement("select");
    select.dataset.role = role;
    const empty = document.createElement("option");
    empty.value = ""; empty.textContent = `Select ${role}`;
    select.appendChild(empty);
    playerOptionsByRole(role).forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${fullName(p)} (${p.position}, ${p.overallRating})`;
      select.appendChild(opt);
    });
    select.addEventListener("change", () => renderLineupAnalysis(getSelectedLineup()));
    wrap.appendChild(select);
    container.appendChild(wrap);
  });
  // Reset analysis panel when formation changes
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