import { state } from './state.js';
import { num } from './utils.js';

export function countBy(players, key, topN = 12) {
  const map = new Map();
  players.forEach((p) => {
    const val = p[key] || "Unknown";
    map.set(val, (map.get(val) || 0) + 1);
  });
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, topN);
}

function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = Math.round(rect.width * dpr);
  const h = Math.round(rect.height * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

export function drawSimpleBar(canvasId, items) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  resizeCanvas(canvas);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const dpr = window.devicePixelRatio || 1;
  const pad = 26 * dpr, barGap = 6 * dpr;
  const usableW = canvas.width - pad * 2, usableH = canvas.height - pad * 2;
  const max = Math.max(...items.map((i) => i[1]), 1);
  const barH = Math.max(10 * dpr, (usableH - barGap * (items.length - 1)) / items.length);
  const fontSize = Math.max(10, Math.min(12, barH / dpr * 0.7));
  ctx.font = `${fontSize * dpr}px Barlow`;
  items.forEach((item, idx) => {
    const y = pad + idx * (barH + barGap);
    const bw = (item[1] / max) * usableW;
    ctx.fillStyle = "#1c5b7f";
    ctx.fillRect(pad, y, Math.max(bw, 2), barH);
    ctx.fillStyle = "#eaf4ff";
    const label = item[0].length > 22 ? `${item[0].slice(0, 22)}...` : item[0];
    ctx.fillText(`${label} (${item[1]})`, pad + 6 * dpr, y + barH - 3 * dpr);
  });
}

export function drawCharts(players) {
  const source = players && players.length ? players : state.rawPlayers;
  if (!source.length) {
    ["chartPosition", "chartLeague", "chartTeam", "chartNationality"].forEach((id) => {
      const canvas = document.getElementById(id);
      if (!canvas) return;
      resizeCanvas(canvas);
      const ctx = canvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${14 * dpr}px Barlow`;
      ctx.fillStyle = "#9fbbd6";
      ctx.textAlign = "center";
      ctx.fillText("No data", canvas.width / 2, canvas.height / 2);
      ctx.textAlign = "start";
    });
    return;
  }
  drawSimpleBar("chartPosition",    countBy(source, "position"));
  drawSimpleBar("chartLeague",      countBy(source, "leagueName"));
  drawSimpleBar("chartTeam",        countBy(source, "team"));
  drawSimpleBar("chartNationality", countBy(source, "nationality"));
}

export function initCharts() {
  const resize = () => {
    if (state.filteredPlayers.length || state.rawPlayers.length) {
      drawCharts(state.filteredPlayers);
    }
  };
  window.addEventListener("resize", resize);
}
