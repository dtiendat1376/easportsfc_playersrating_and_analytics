import { state } from './state.js';

export function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function avg(values) {
  if (!values.length) return 0;
  const clean = values.map(num);
  return clean.reduce((a, b) => a + b, 0) / clean.length;
}

export const rankingScore = {
  overall:     (p) => num(p.overallRating),
  position:    (p) => num(p.overallRating),
  league:      (p) => num(p.overallRating),
  nationality: (p) => num(p.overallRating),
  attacking:   (p) => avg([p.pac, p.sho, p.pas, p.dri, p.finishing, p.positioning]),
  defending:   (p) => avg([p.def, p.interceptions, p.defensiveAwareness, p.standingTackle, p.slidingTackle]),
  physical:    (p) => avg([p.phy, p.strength, p.stamina, p.aggression, p.jumping]),
  goalkeeping: (p) => avg([p.gkDiving, p.gkHandling, p.gkKicking, p.gkPositioning, p.gkReflexes]),
};

export function csvToObjects(text) {
  const rows = [];
  let row = [], value = "", inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i], next = text[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') { value += '"'; i += 1; }
      else if (c === '"') { inQuotes = false; }
      else { value += c; }
      continue;
    }
    if (c === '"') { inQuotes = true; }
    else if (c === ',') { row.push(value); value = ""; }
    else if (c === "\n") { row.push(value.replace(/\r$/, "")); rows.push(row); row = []; value = ""; }
    else { value += c; }
  }
  if (value.length || row.length) { row.push(value.replace(/\r$/, "")); rows.push(row); }
  const headers = rows[0] || [];
  return rows.slice(1)
    .filter((r) => r.some((cell) => cell !== ""))
    .map((r) => {
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = r[idx] ?? ""; });
      return obj;
    });
}

export function fullName(player) {
  if (player.commonName) return player.commonName;
  return [player.firstName, player.lastName].filter(Boolean).join(" ") || `Player #${player.id}`;
}

export function optionsFrom(players, key) {
  const set = new Set();
  players.forEach((p) => { if (p[key]) set.add(p[key]); });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function populateSelect(id, options, emptyLabel) {
  const el = document.getElementById(id);
  const prev = el.value;
  el.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = ""; empty.textContent = emptyLabel;
  el.appendChild(empty);
  options.forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o; opt.textContent = o;
    el.appendChild(opt);
  });
  el.value = options.includes(prev) ? prev : "";
}

export function getFilters() {
  return {
    ranking:     document.getElementById("rankingSelect").value,
    position:    document.getElementById("positionFilter").value,
    league:      document.getElementById("leagueFilter").value,
    nationality: document.getElementById("nationalityFilter").value,
    name:        document.getElementById("nameSearch").value.trim().toLowerCase(),
    topN:        Math.max(5, Math.min(200, num(document.getElementById("topN").value) || 25)),
  };
}

export function filterPlayers(players, filters) {
  return players.filter((p) => {
    if (filters.position    && p.position    !== filters.position)    return false;
    if (filters.league      && p.leagueName  !== filters.league)      return false;
    if (filters.nationality && p.nationality !== filters.nationality) return false;
    if (filters.name        && !fullName(p).toLowerCase().includes(filters.name)) return false;
    return true;
  });
}

export function columnsFor(ranking) {
  const base = [
    ["id", "ID"], ["name", "Name"], ["birthdate", "Birthdate"],
    ["height", "Height"], ["weight", "Weight"], ["score", "Ranking Score"],
  ];
  if (ranking === "position")    return base.concat([["position", "Position"], ["positionType", "Position Type"], ["alternatePositions", "Alternative Positions"]]);
  if (ranking === "overall")     return base.concat([["overallRating", "Overall"], ["skillMoves", "Skill Moves"], ["weakFootAbility", "Weak Foot"], ["preferredFoot", "Preferred Foot"], ["playStyles", "Play Styles"], ["playStylesPlus", "Play Styles Plus"]]);
  if (ranking === "league")      return base.concat([["leagueName", "League"], ["team", "Team"], ["overallRating", "Overall"]]);
  if (ranking === "nationality") return base.concat([["nationality", "Nationality"], ["team", "Team"], ["overallRating", "Overall"]]);
  if (ranking === "attacking")   return base.concat([["pac", "PAC"], ["sho", "SHO"], ["pas", "PAS"], ["dri", "DRI"], ["positioning", "Positioning"], ["finishing", "Finishing"], ["shotPower", "Shot Power"], ["longShots", "Long Shots"], ["volleys", "Volleys"], ["penalties", "Penalties"], ["crossing", "Crossing"], ["vision", "Vision"]]);
  if (ranking === "defending")   return base.concat([["def", "DEF"], ["interceptions", "Interceptions"], ["defensiveAwareness", "Def Awareness"], ["standingTackle", "Standing Tackle"], ["slidingTackle", "Sliding Tackle"], ["headingAccuracy", "Heading Accuracy"]]);
  if (ranking === "physical")    return base.concat([["phy", "PHY"], ["strength", "Strength"], ["stamina", "Stamina"], ["aggression", "Aggression"], ["jumping", "Jumping"], ["balance", "Balance"]]);
  return base.concat([["gkDiving", "GK Diving"], ["gkHandling", "GK Handling"], ["gkKicking", "GK Kicking"], ["gkPositioning", "GK Positioning"], ["gkReflexes", "GK Reflexes"], ["position", "Position"]]);
}

export function displayValue(player, key) {
  if (key === "name")          return fullName(player);
  if (key === "preferredFoot") return player.preferredFoot === "1" ? "Right" : player.preferredFoot === "2" ? "Left" : player.preferredFoot;
  if (key === "score")         return (player._score ?? 0).toFixed(1);
  return player[key] || "-";
}

export async function loadCsv(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return csvToObjects(await response.text());
}

export async function loadAllDatasets() {
  const selects = document.getElementById("datasetSelect").options;
  const paths = Array.from(selects).map(o => o.value);
  const [fc26, fc25] = await Promise.all(paths.map(loadCsv));
  state.datasets.fc26 = fc26;
  state.datasets.fc25 = fc25;
}