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

export function drawSimpleBar(canvasId, items) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const pad = 26, barGap = 6;
  const usableW = w - pad * 2, usableH = h - pad * 2;
  const max = Math.max(...items.map((i) => i[1]), 1);
  const barH = Math.max(10, (usableH - barGap * (items.length - 1)) / items.length);
  ctx.font = "12px Barlow";
  items.forEach((item, idx) => {
    const y = pad + idx * (barH + barGap);
    const bw = (item[1] / max) * usableW;
    ctx.fillStyle = "#1c5b7f";
    ctx.fillRect(pad, y, bw, barH);
    ctx.fillStyle = "#eaf4ff";
    const label = item[0].length > 22 ? `${item[0].slice(0, 22)}...` : item[0];
    ctx.fillText(`${label} (${item[1]})`, pad + 6, y + barH - 3);
  });
}

export function drawCharts(players) {
  const source = players && players.length ? players : state.rawPlayers;
  drawSimpleBar("chartPosition",    countBy(source, "position"));
  drawSimpleBar("chartLeague",      countBy(source, "leagueName"));
  drawSimpleBar("chartTeam",        countBy(source, "team"));
  drawSimpleBar("chartNationality", countBy(source, "nationality"));
}