'use client'
import { useState, useEffect, useMemo, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";
import { supabase } from "@/lib/supabase";

const PLATFORMS = [
  { id: "revolut", name: "Revolut", color: "#a78bfa", icon: "R" },
  { id: "rainbet", name: "Rainbet", color: "#34d399", icon: "₿" },
  { id: "phantom", name: "Phantom", color: "#c084fc", icon: "👻" },
  { id: "clcard", name: "CL Card", color: "#fb923c", icon: "💳" },
  { id: "ledger", name: "Ledger", color: "#94a3b8", icon: "🔒" },
  { id: "qonto", name: "Qonto", color: "#f472b6", icon: "Q" },
];

const EXP_CATS = [
  { id: "quotidien", name: "Quotidien", emoji: "🛒", color: "#fb923c" },
  { id: "restaurant", name: "Resto/Sorties", emoji: "🍽️", color: "#f97316" },
  { id: "transport", name: "Transport", emoji: "🚗", color: "#64748b" },
  { id: "shopping", name: "Shopping", emoji: "🛍️", color: "#e879f9" },
  { id: "abonnement", name: "Abo", emoji: "📱", color: "#a78bfa" },
  { id: "business", name: "Business", emoji: "💼", color: "#818cf8" },
  { id: "voyages", name: "Voyages", emoji: "✈️", color: "#22d3ee" },
  { id: "cadeaux", name: "Cadeaux", emoji: "🎁", color: "#f472b6" },
  { id: "perso", name: "Perso", emoji: "🎮", color: "#c084fc" },
  { id: "sante", name: "Santé", emoji: "🏥", color: "#34d399" },
  { id: "logement", name: "Logement", emoji: "🏠", color: "#fbbf24" },
  { id: "assurance", name: "Assurance", emoji: "🛡️", color: "#60a5fa" },
  { id: "inconnu", name: "Inconnu", emoji: "❓", color: "#facc15" },
];

const INC_CATS = [
  { id: "celsius", name: "Celsius", emoji: "🎰", color: "#fbbf24" },
  { id: "rainbet_video", name: "Rainbet", emoji: "🎬", color: "#34d399" },
  { id: "casino_pompette", name: "Casino Pompette", emoji: "🍻", color: "#f59e0b" },
  { id: "youtube", name: "YouTube", emoji: "▶️", color: "#ef4444" },
  { id: "mobilfox", name: "Mobilfox", emoji: "📱", color: "#818cf8" },
  { id: "tiktok_fr", name: "TikTok FR", emoji: "🇫🇷", color: "#f87171" },
  { id: "unfamous", name: "Unfamous", emoji: "👕", color: "#c084fc" },
  { id: "collaboration", name: "Collab", emoji: "🤝", color: "#22d3ee" },
  { id: "snapchat", name: "Snapchat", emoji: "👻", color: "#facc15" },
  { id: "loyer_recu", name: "Loyer", emoji: "🏠", color: "#fbbf24" },
  { id: "assurance_recu", name: "Assurance", emoji: "🛡️", color: "#60a5fa" },
];

const GOAL = 200000;
const TARGET_DATE = new Date(2026, 11, 31); // 31 décembre 2026
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fmt = (n) => `${Math.abs(n).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€`;
const fmtSigned = (n) => `${n < 0 ? "-" : ""}${Math.abs(n).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€`;
const fmt2 = (n) => `${Math.abs(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`;
const mkey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`; };
const dkey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
const MN = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];
const DOW = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
const mlabel = (k) => { const [y, m] = k.split("-"); return MN[+m - 1] + " " + y; };
const mshort = (k) => MN[+k.split("-")[1] - 1];

function playGoalSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = freq;
      g.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.35);
      o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + i * 0.12); o.stop(ctx.currentTime + i * 0.12 + 0.35);
    });
  } catch {}
}
function playTick() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = 880;
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.12);
  } catch {}
}

// Son "click" satisfaisant pour valider une dépense
function playExpenseClick(muted) {
  if (muted) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "triangle"; o.frequency.setValueAtTime(440, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.08);
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.1);
  } catch {}
}

// Son "ka-ching" caisse enregistreuse pour les revenus (style Shopify)
function playCashRegister(muted) {
  if (muted) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Premier "ding" aigu
    const o1 = ctx.createOscillator(), g1 = ctx.createGain();
    o1.type = "sine"; o1.frequency.value = 1318.51; // E6
    g1.gain.setValueAtTime(0.15, ctx.currentTime);
    g1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    o1.connect(g1); g1.connect(ctx.destination); o1.start(ctx.currentTime); o1.stop(ctx.currentTime + 0.15);
    // Deuxième "ding" plus aigu
    const o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o2.type = "sine"; o2.frequency.value = 1567.98; // G6
    g2.gain.setValueAtTime(0.15, ctx.currentTime + 0.08);
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    o2.connect(g2); g2.connect(ctx.destination); o2.start(ctx.currentTime + 0.08); o2.stop(ctx.currentTime + 0.25);
    // "Cling" final cristallin
    const o3 = ctx.createOscillator(), g3 = ctx.createGain();
    o3.type = "sine"; o3.frequency.value = 2093; // C7
    g3.gain.setValueAtTime(0.1, ctx.currentTime + 0.18);
    g3.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    o3.connect(g3); g3.connect(ctx.destination); o3.start(ctx.currentTime + 0.18); o3.stop(ctx.currentTime + 0.45);
  } catch {}
}

// Son "swoosh" pour les transferts
function playSwoosh(muted) {
  if (muted) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(200, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.18);
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.22);
  } catch {}
}

// Son léger pour suppression
function playDelete(muted) {
  if (muted) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "square"; o.frequency.setValueAtTime(300, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.04, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.15);
  } catch {}
}

function genRec(subs, mk) {
  const [y, m] = mk.split("-").map(Number);
  return subs.filter(s => s.active && mk >= mkey(s.start_date)).map(s => {
    const day = Math.min(s.day || 1, new Date(y, m, 0).getDate());
    return { id: `rec-${s.id}-${mk}`, type: "expense", amount: Number(s.amount), platform: s.platform, category: "abonnement", note: `🔄 ${s.name}`, date: `${y}-${String(m).padStart(2,"0")}-${String(day).padStart(2,"0")}`, is_recurring: true };
  });
}

// ─── HOOK : largeur écran ───
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isDesktop;
}

function Donut({ data, size = 130 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <svg width={size} height={size} viewBox="0 0 130 130"><circle cx="65" cy="65" r="48" fill="none" stroke="#ffffff06" strokeWidth="14" /><text x="65" y="69" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontFamily="inherit">0€</text></svg>;
  let cum = 0; const r = 48, c = 2 * Math.PI * r;
  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size} viewBox="0 0 130 130" style={{ transform: "rotate(-90deg)" }}>
        {data.map((d, i) => { const pct = d.value / total; const off = cum * c; cum += pct;
          return <circle key={i} cx="65" cy="65" r={r} fill="none" stroke={d.color} strokeWidth="14" strokeDasharray={`${pct * c} ${c}`} strokeDashoffset={-off} style={{ filter: `drop-shadow(0 0 3px ${d.color}40)` }} />;
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{fmt(total)}</span>
      </div>
    </div>
  );
}

const G = ({ children, style, glow, onClick }) => (
  <div onClick={onClick} style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${glow ? glow + "30" : "rgba(255,255,255,0.05)"}`, borderRadius: 14, ...(glow ? { boxShadow: `0 0 20px ${glow}10` } : {}), ...(onClick ? { cursor: "pointer" } : {}), ...style }}>{children}</div>
);

// ─── HEATMAP COMPONENT ───
function Heatmap({ allTx, year, onCellClick, selectedDate, t2, mode = "expense" }) {
  const dailyData = useMemo(() => {
    const map = {};
    allTx.forEach(tx => {
      const txYear = new Date(tx.date).getFullYear();
      if (txYear !== year) return;
      if (mode === "expense") {
        if (tx.type !== "expense") return;
        map[tx.date] = (map[tx.date] || 0) + tx.amount;
      } else if (mode === "income") {
        if (tx.type !== "income") return;
        map[tx.date] = (map[tx.date] || 0) + tx.amount;
      } else if (mode === "net") {
        // Net = revenus - dépenses (les transferts ne comptent pas)
        if (tx.type === "income") map[tx.date] = (map[tx.date] || 0) + tx.amount;
        else if (tx.type === "expense") map[tx.date] = (map[tx.date] || 0) - tx.amount;
      }
    });
    return map;
  }, [allTx, year, mode]);

  // Pour les modes exp/inc on prend la valeur max. Pour le net on prend la magnitude max.
  const values = Object.values(dailyData);
  const maxVal = mode === "net"
    ? Math.max(...values.map(v => Math.abs(v)), 1)
    : Math.max(...values, 1);

  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  const startDayOfWeek = (yearStart.getDay() + 6) % 7;
  const gridStart = new Date(yearStart);
  gridStart.setDate(gridStart.getDate() - startDayOfWeek);

  const cells = [];
  const cur = new Date(gridStart);
  while (cur <= yearEnd || cells.length % 7 !== 0) {
    const k = dkey(cur);
    const inYear = cur.getFullYear() === year;
    cells.push({
      date: k,
      day: cur.getDate(),
      month: cur.getMonth(),
      inYear,
      value: dailyData[k] || 0,
      hasData: dailyData[k] !== undefined,
    });
    cur.setDate(cur.getDate() + 1);
  }

  const monthLabels = [];
  let lastMonth = -1;
  cells.forEach((c, i) => {
    if (i % 7 === 0 && c.inYear && c.month !== lastMonth) {
      monthLabels.push({ week: i / 7, month: c.month });
      lastMonth = c.month;
    }
  });

  const cellSize = 11;
  const gap = 2;
  const totalWeeks = Math.ceil(cells.length / 7);
  const width = totalWeeks * (cellSize + gap);
  const height = 7 * (cellSize + gap) + 18;

  // Couleurs selon le mode
  const colorFor = (val, hasData) => {
    if (!hasData) return "rgba(255,255,255,0.04)";
    if (mode === "expense") {
      const intensity = Math.min(val / maxVal, 1);
      if (intensity < 0.25) return "rgba(244,114,96,0.25)";
      if (intensity < 0.5) return "rgba(244,114,96,0.5)";
      if (intensity < 0.75) return "rgba(244,114,96,0.75)";
      return "rgba(244,114,96,1)";
    }
    if (mode === "income") {
      const intensity = Math.min(val / maxVal, 1);
      if (intensity < 0.25) return "rgba(52,211,153,0.25)";
      if (intensity < 0.5) return "rgba(52,211,153,0.5)";
      if (intensity < 0.75) return "rgba(52,211,153,0.75)";
      return "rgba(52,211,153,1)";
    }
    // Mode net : vert si positif, rouge si négatif
    if (val === 0) return "rgba(255,255,255,0.04)";
    const intensity = Math.min(Math.abs(val) / maxVal, 1);
    if (val > 0) {
      if (intensity < 0.25) return "rgba(52,211,153,0.25)";
      if (intensity < 0.5) return "rgba(52,211,153,0.5)";
      if (intensity < 0.75) return "rgba(52,211,153,0.75)";
      return "rgba(52,211,153,1)";
    } else {
      if (intensity < 0.25) return "rgba(244,114,96,0.25)";
      if (intensity < 0.5) return "rgba(244,114,96,0.5)";
      if (intensity < 0.75) return "rgba(244,114,96,0.75)";
      return "rgba(244,114,96,1)";
    }
  };

  // Légende selon le mode
  const legendColors = mode === "income"
    ? ["rgba(255,255,255,0.04)", "rgba(52,211,153,0.25)", "rgba(52,211,153,0.5)", "rgba(52,211,153,0.75)", "rgba(52,211,153,1)"]
    : mode === "net"
      ? ["rgba(244,114,96,1)", "rgba(244,114,96,0.5)", "rgba(255,255,255,0.04)", "rgba(52,211,153,0.5)", "rgba(52,211,153,1)"]
      : ["rgba(255,255,255,0.04)", "rgba(244,114,96,0.25)", "rgba(244,114,96,0.5)", "rgba(244,114,96,0.75)", "rgba(244,114,96,1)"];
  const legendLabels = mode === "net"
    ? ["Déficit", "", "0", "", "Bénéfice"]
    : ["Moins", "", "", "", "Plus"];

  return (
    <div style={{ overflowX: "auto", scrollbarWidth: "thin" }}>
      <svg width={width} height={height} style={{ display: "block", minWidth: width }}>
        {monthLabels.map(({ week, month }) => (
          <text key={month} x={week * (cellSize + gap)} y={10} fill={t2} fontSize={9} fontFamily="'Outfit', sans-serif">
            {MN[month]}
          </text>
        ))}
        {cells.map((c, i) => {
          const week = Math.floor(i / 7);
          const day = i % 7;
          if (!c.inYear) return null;
          const isSelected = selectedDate === c.date;
          return (
            <rect
              key={c.date}
              x={week * (cellSize + gap)}
              y={18 + day * (cellSize + gap)}
              width={cellSize}
              height={cellSize}
              rx={2}
              fill={colorFor(c.value, c.hasData)}
              stroke={isSelected ? "#a78bfa" : "transparent"}
              strokeWidth={isSelected ? 1.5 : 0}
              style={{ cursor: "pointer" }}
              onClick={() => onCellClick(c.date)}
            >
              <title>{c.date} : {mode === "net" && c.value < 0 ? "-" : mode === "net" && c.value > 0 ? "+" : ""}{fmt2(c.value)}</title>
            </rect>
          );
        })}
      </svg>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: 9, color: t2 }}>
        <span>{legendLabels[0]}</span>
        {legendColors.map((c, i) => (
          <div key={i} style={{ width: 11, height: 11, borderRadius: 2, background: c }} title={legendLabels[i]} />
        ))}
        <span>{legendLabels[4]}</span>
      </div>
    </div>
  );
}

// ─── SANKEY COMPONENT (flux d'argent) ───
function SankeyDiagram({ allTx, period, t1, t2, vio, green, red, purple }) {
  // Calcul des nœuds et flux selon la période
  const { nodes, links, totalIn, totalOut, totalTransfers } = useMemo(() => {
    // Filtrer les transactions selon la période
    const today = new Date();
    let startDate;
    if (period === "month") {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (period === "3months") {
      startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    } else {
      startDate = new Date(2000, 0, 1); // depuis le début
    }
    const filteredTx = allTx.filter(tx => new Date(tx.date) >= startDate);

    // Construire les nœuds : sources (col 0), comptes (col 1), "Dépenses" (col 2)
    const sources = {}; // inc_category -> total
    const accountIn = {}; // platform -> revenu reçu
    const accountOut = {}; // platform -> dépenses sorties
    const transfers = {}; // "from->to" -> montant

    filteredTx.forEach(tx => {
      if (tx.type === "income") {
        const src = tx.inc_category || "other";
        sources[src] = (sources[src] || 0) + tx.amount;
        accountIn[tx.platform] = (accountIn[tx.platform] || 0) + tx.amount;
      } else if (tx.type === "expense") {
        accountOut[tx.platform] = (accountOut[tx.platform] || 0) + tx.amount;
      } else if (tx.type === "transfer") {
        const k = `${tx.platform}->${tx.to}`;
        transfers[k] = (transfers[k] || 0) + tx.amount;
      }
    });

    const totalIn = Object.values(sources).reduce((s, v) => s + v, 0);
    const totalOut = Object.values(accountOut).reduce((s, v) => s + v, 0);
    const totalTransfers = Object.values(transfers).reduce((s, v) => s + v, 0);

    // Construire la liste des nœuds avec leurs positions
    const nodes = [];
    const nodeMap = {}; // id -> index

    // Colonne 0 : sources de revenus
    const sourceList = INC_CATS.filter(c => sources[c.id] > 0);
    sourceList.forEach(c => {
      nodeMap[`src_${c.id}`] = nodes.length;
      nodes.push({
        id: `src_${c.id}`,
        label: c.name,
        emoji: c.emoji,
        color: c.color,
        value: sources[c.id],
        col: 0,
      });
    });

    // Colonne 1 : comptes (uniquement ceux qui ont eu de l'activité)
    const activePlatforms = PLATFORMS.filter(p =>
      accountIn[p.id] > 0 || accountOut[p.id] > 0 ||
      Object.keys(transfers).some(k => k.startsWith(p.id + "->") || k.endsWith("->" + p.id))
    );
    activePlatforms.forEach(p => {
      nodeMap[`acc_${p.id}`] = nodes.length;
      nodes.push({
        id: `acc_${p.id}`,
        label: p.name,
        icon: p.icon,
        color: p.color,
        value: Math.max(accountIn[p.id] || 0, accountOut[p.id] || 0),
        col: 1,
      });
    });

    // Colonne 2 : un seul nœud "Dépenses"
    if (totalOut > 0) {
      nodeMap["dep_total"] = nodes.length;
      nodes.push({
        id: "dep_total",
        label: "Dépenses",
        emoji: "💸",
        color: red,
        value: totalOut,
        col: 2,
      });
    }

    // Construire les liens
    const links = [];

    // Sources -> comptes (revenus)
    filteredTx.filter(tx => tx.type === "income").forEach(tx => {
      const srcKey = `src_${tx.inc_category || "other"}`;
      const accKey = `acc_${tx.platform}`;
      if (nodeMap[srcKey] === undefined || nodeMap[accKey] === undefined) return;
      const existing = links.find(l => l.source === srcKey && l.target === accKey);
      if (existing) existing.value += tx.amount;
      else links.push({ source: srcKey, target: accKey, value: tx.amount, kind: "income" });
    });

    // Comptes -> comptes (transferts)
    Object.entries(transfers).forEach(([k, v]) => {
      const [from, to] = k.split("->");
      const fromKey = `acc_${from}`;
      const toKey = `acc_${to}`;
      if (nodeMap[fromKey] === undefined || nodeMap[toKey] === undefined) return;
      links.push({ source: fromKey, target: toKey, value: v, kind: "transfer" });
    });

    // Comptes -> dépenses
    Object.entries(accountOut).forEach(([pid, v]) => {
      const accKey = `acc_${pid}`;
      if (nodeMap[accKey] === undefined || nodeMap["dep_total"] === undefined) return;
      links.push({ source: accKey, target: "dep_total", value: v, kind: "expense" });
    });

    return { nodes, links, totalIn, totalOut, totalTransfers };
  }, [allTx, period, red]);

  const [hoveredLink, setHoveredLink] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);

  // Layout : on calcule les positions Y de chaque nœud
  // Hauteur proportionnelle à la valeur du nœud
  const W = 900, H = 520;
  const colX = [80, W / 2, W - 80]; // 3 colonnes
  const nodeWidth = 14;
  const nodePadding = 12;

  // Pour chaque colonne, calculer la hauteur totale et les positions
  const layoutedNodes = useMemo(() => {
    const cols = [[], [], []];
    nodes.forEach((n, i) => cols[n.col].push({ ...n, idx: i }));

    // Pour chaque colonne, calculer un "value total" pour scaler
    const colTotals = cols.map(col => col.reduce((s, n) => s + n.value, 0));
    const maxColTotal = Math.max(...colTotals, 1);

    // Hauteur disponible (avec marges)
    const availH = H - 40;

    const result = [];
    cols.forEach((col, ci) => {
      // Trier les nœuds par valeur décroissante pour avoir les plus gros en haut
      const sorted = [...col].sort((a, b) => b.value - a.value);
      const colTotal = colTotals[ci];
      if (colTotal === 0) return;

      // Espace vertical alloué proportionnellement
      const totalGap = (sorted.length - 1) * nodePadding;
      const availForBars = availH - totalGap;
      const scale = availForBars / colTotal;

      let y = 20;
      sorted.forEach(n => {
        const h = Math.max(n.value * scale, 6); // hauteur min 6px
        result.push({ ...n, x: colX[ci], y, h });
        y += h + nodePadding;
      });
    });

    // Reordonner pour matcher l'index original
    const byIdx = {};
    result.forEach(n => byIdx[n.idx] = n);
    return nodes.map((_, i) => byIdx[i]).filter(Boolean);
  }, [nodes]);

  // Calcul des positions Y des liens sur chaque nœud (offset cumulatif)
  const layoutedLinks = useMemo(() => {
    if (layoutedNodes.length === 0) return [];

    // Pour chaque nœud, on track combien d'espace est déjà utilisé en sortie et en entrée
    const sourceOffsets = {}; // nodeIdx -> offset Y cumulé pour les liens sortants
    const targetOffsets = {}; // nodeIdx -> offset Y cumulé pour les liens entrants

    // Trier les liens par valeur décroissante pour que les plus gros soient en haut
    const sortedLinks = [...links].sort((a, b) => b.value - a.value);

    return sortedLinks.map(link => {
      const sourceNode = layoutedNodes.find(n => n.id === link.source);
      const targetNode = layoutedNodes.find(n => n.id === link.target);
      if (!sourceNode || !targetNode) return null;

      // Hauteur du lien proportionnelle à sa valeur
      const sourceTotal = layoutedNodes.find(n => n.id === link.source).value;
      const targetTotal = layoutedNodes.find(n => n.id === link.target).value;
      const linkH_source = (link.value / sourceTotal) * sourceNode.h;
      const linkH_target = (link.value / targetTotal) * targetNode.h;

      const sOff = sourceOffsets[link.source] || 0;
      const tOff = targetOffsets[link.target] || 0;

      const sy0 = sourceNode.y + sOff;
      const sy1 = sy0 + linkH_source;
      const ty0 = targetNode.y + tOff;
      const ty1 = ty0 + linkH_target;

      sourceOffsets[link.source] = sOff + linkH_source;
      targetOffsets[link.target] = tOff + linkH_target;

      // Coordonnées X
      const sx = sourceNode.x + nodeWidth;
      const tx = targetNode.x;

      // Bezier curve : la courbe passe par les milieux
      const midX = (sx + tx) / 2;

      // Path pour le ruban (haut + bas)
      const path = `
        M ${sx} ${sy0}
        C ${midX} ${sy0}, ${midX} ${ty0}, ${tx} ${ty0}
        L ${tx} ${ty1}
        C ${midX} ${ty1}, ${midX} ${sy1}, ${sx} ${sy1}
        Z
      `;

      // Couleur selon kind
      let color;
      if (link.kind === "income") color = sourceNode.color;
      else if (link.kind === "transfer") color = "#a78bfa"; // violet pâle pour transferts
      else color = sourceNode.color; // dépense = couleur du compte source

      return { ...link, path, color, sourceNode, targetNode };
    }).filter(Boolean);
  }, [links, layoutedNodes]);

  if (nodes.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: t2, fontSize: 13 }}>
        Aucune transaction sur cette période
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {/* Liens (en arrière-plan) */}
        {layoutedLinks.map((link, i) => {
          const isHovered = hoveredLink === i;
          return (
            <path
              key={i}
              d={link.path}
              fill={link.color}
              fillOpacity={isHovered ? 0.7 : 0.35}
              stroke="none"
              style={{ cursor: "pointer", transition: "fill-opacity 0.2s" }}
              onMouseEnter={() => setHoveredLink(i)}
              onMouseLeave={() => setHoveredLink(null)}
            />
          );
        })}

        {/* Nœuds (au-dessus) */}
        {layoutedNodes.map((n, i) => {
          const isHovered = hoveredNode === i;
          return (
            <g key={n.id}
              onMouseEnter={() => setHoveredNode(i)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: "pointer" }}>
              <rect
                x={n.x} y={n.y}
                width={nodeWidth} height={n.h}
                fill={n.color}
                rx={3}
                style={{ filter: isHovered ? `drop-shadow(0 0 8px ${n.color})` : `drop-shadow(0 0 3px ${n.color}80)` }}
              />
              {/* Label */}
              <text
                x={n.col === 0 ? n.x - 8 : (n.col === 2 ? n.x + nodeWidth + 8 : n.x + nodeWidth + 8)}
                y={n.y + n.h / 2 + 4}
                fill={t1}
                fontSize={11}
                fontFamily="'Outfit', sans-serif"
                fontWeight={600}
                textAnchor={n.col === 0 ? "end" : "start"}>
                {n.emoji || n.icon} {n.label}
              </text>
              {/* Valeur en dessous du label */}
              <text
                x={n.col === 0 ? n.x - 8 : (n.col === 2 ? n.x + nodeWidth + 8 : n.x + nodeWidth + 8)}
                y={n.y + n.h / 2 + 17}
                fill={n.color}
                fontSize={10}
                fontFamily="'Outfit', sans-serif"
                fontWeight={500}
                textAnchor={n.col === 0 ? "end" : "start"}>
                {fmt(n.value)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip lien */}
      {hoveredLink !== null && layoutedLinks[hoveredLink] && (
        <div style={{
          position: "absolute", top: 10, right: 10,
          background: "rgba(10,10,20,0.95)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10, padding: "10px 14px", fontSize: 12, color: t1,
          fontFamily: "'Outfit', sans-serif", pointerEvents: "none",
          backdropFilter: "blur(10px)",
        }}>
          <div style={{ fontSize: 10, color: t2, marginBottom: 3, textTransform: "uppercase", letterSpacing: 1 }}>
            {layoutedLinks[hoveredLink].kind === "income" ? "💰 Revenu" :
             layoutedLinks[hoveredLink].kind === "transfer" ? "↔ Transfert" : "💸 Dépense"}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {layoutedLinks[hoveredLink].sourceNode.emoji || layoutedLinks[hoveredLink].sourceNode.icon} {layoutedLinks[hoveredLink].sourceNode.label}
            <span style={{ color: t2, margin: "0 6px" }}>→</span>
            {layoutedLinks[hoveredLink].targetNode.emoji || layoutedLinks[hoveredLink].targetNode.icon} {layoutedLinks[hoveredLink].targetNode.label}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: layoutedLinks[hoveredLink].color, marginTop: 4 }}>
            {fmt2(layoutedLinks[hoveredLink].value)}
          </div>
        </div>
      )}

      {/* Tooltip nœud */}
      {hoveredNode !== null && layoutedNodes[hoveredNode] && hoveredLink === null && (
        <div style={{
          position: "absolute", top: 10, right: 10,
          background: "rgba(10,10,20,0.95)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10, padding: "10px 14px", fontSize: 12, color: t1,
          fontFamily: "'Outfit', sans-serif", pointerEvents: "none",
          backdropFilter: "blur(10px)",
        }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {layoutedNodes[hoveredNode].emoji || layoutedNodes[hoveredNode].icon} {layoutedNodes[hoveredNode].label}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: layoutedNodes[hoveredNode].color, marginTop: 4 }}>
            {fmt2(layoutedNodes[hoveredNode].value)}
          </div>
        </div>
      )}
    </div>
  );
}


// Sons clavier : fréquence légèrement différente par chiffre pour un effet satisfaisant
function playKeySound(key, muted) {
  if (muted) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Mapping touche -> fréquence (gamme pentatonique pour que ça sonne bien)
    const freqMap = {
      "1": 523, "2": 587, "3": 659,
      "4": 698, "5": 784, "6": 880,
      "7": 988, "8": 1047, "9": 1175,
      "0": 466, ".": 392,
    };
    if (key === "⌫") {
      // Son spécifique pour effacer : descend rapidement
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(440, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.06);
      g.gain.setValueAtTime(0.05, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.08);
      return;
    }
    const freq = freqMap[key] || 600;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "triangle";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.06);
  } catch {}
}

function NumPad({ value, onChange, color, muted }) {
  const press = (key) => {
    playKeySound(key, muted);
    if (key === "C") { onChange(""); return; }
    if (key === "⌫") { onChange(value.slice(0, -1)); return; }
    if (key === ".") { if (value.includes(".")) return; onChange(value + "."); return; }
    if (value.includes(".") && value.split(".")[1]?.length >= 2) return;
    onChange(value + key);
  };
  const keys = ["1","2","3","4","5","6","7","8","9",".","0","⌫"];
  const btnStyle = (k) => ({
    width: "100%", aspectRatio: "1.6", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)",
    background: k === "⌫" ? "rgba(255,80,80,0.1)" : "rgba(255,255,255,0.04)",
    color: k === "⌫" ? "#f47260" : "#e2e8f0", fontSize: 22, fontWeight: 600,
    fontFamily: "'Outfit', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  });
  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 40, fontWeight: 700, color: color || "#e2e8f0", minHeight: 50 }}>
          {value || "0"}<span style={{ fontSize: 18, opacity: 0.5 }}>€</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {keys.map(k => (
          <button key={k} onClick={() => press(k)} style={btnStyle(k)}>{k}</button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const isDesktop = useIsDesktop();
  const [transactions, setTransactions] = useState([]);
  const [initialBalances, setInitialBalances] = useState({});
  const [subscriptions, setSubscriptions] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [goal, setGoal] = useState(GOAL);
  const [loaded, setLoaded] = useState(false);
  const [modal, setModal] = useState(null);
  const [month, setMonth] = useState(mkey(new Date()));
  const [confirmDel, setConfirmDel] = useState(null);
  const [confirmDelSub, setConfirmDelSub] = useState(null);
  const [showAllTx, setShowAllTx] = useState(false);
  const [editBal, setEditBal] = useState(null);
  const [editBalVal, setEditBalVal] = useState("");
  const [pFilter, setPFilter] = useState("all");
  const [chartView, setChartView] = useState("monthly");
  const [tab, setTab] = useState("home");
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [editTx, setEditTx] = useState(null);
  const [eleaFilter, setEleaFilter] = useState(false);
  const [inconnuFilter, setInconnuFilter] = useState(false);
  const [refundForm, setRefundForm] = useState({ label: "", amount: "", date: new Date().toISOString().split("T")[0] });
  const [heatmapYear, setHeatmapYear] = useState(new Date().getFullYear());
  const [heatmapSelectedDate, setHeatmapSelectedDate] = useState(null);
  const [heatmapMode, setHeatmapMode] = useState("expense"); // "expense" | "income" | "net"
  const [muted, setMuted] = useState(false);
  const [dismissedInsights, setDismissedInsights] = useState(new Set());
  const [sankeyPeriod, setSankeyPeriod] = useState("3months"); // "month" | "3months" | "all"
  const [txTypeFilter, setTxTypeFilter] = useState("all"); // "all" | "income" | "expense" | "transfer"

  const [f, setF] = useState({ type: "expense", amount: "", platform: "revolut", category: "quotidien", incCategory: "rainbet_video", note: "", date: new Date().toISOString().split("T")[0], to: "phantom", fees: "", makeRecurring: true, day: 1 });
  const uf = (k, v) => setF(p => ({ ...p, [k]: v }));
  const [sf, setSf] = useState({ name: "", amount: "", platform: "revolut", day: 1 });
  const [editingSub, setEditingSub] = useState(null); // id de l'abo en cours d'édition
  const usf = (k, v) => setSf(p => ({ ...p, [k]: v }));

  const prevPctRef = useRef(0);

  useEffect(() => { loadAll(); }, []);

  // Charger préférence son muet depuis localStorage
  useEffect(() => {
    try {
      const m = localStorage.getItem("tracker_muted");
      if (m === "true") setMuted(true);
    } catch {}
  }, []);

  const toggleMute = () => {
    setMuted(prev => {
      const next = !prev;
      try { localStorage.setItem("tracker_muted", String(next)); } catch {}
      return next;
    });
  };

  async function loadAll() {
    const [{ data: txs }, { data: subs }, { data: bals }, { data: sets }, { data: refs }] = await Promise.all([
      supabase.from('transactions').select('*').order('date', { ascending: false }),
      supabase.from('subscriptions').select('*'),
      supabase.from('initial_balances').select('*'),
      supabase.from('settings').select('*'),
      supabase.from('refunds').select('*').order('created_at', { ascending: false }),
    ]);
    setTransactions((txs || []).map(t => ({ ...t, amount: Number(t.amount), fees: Number(t.fees || 0) })));
    setSubscriptions((subs || []).map(s => ({ ...s, amount: Number(s.amount) })));
    const balMap = {}; (bals || []).forEach(b => balMap[b.platform] = Number(b.amount));
    setInitialBalances(balMap);
    const goalRow = (sets || []).find(s => s.key === 'goal');
    if (goalRow) setGoal(Number(goalRow.value));
    setRefunds((refs || []).map(r => ({ ...r, amount: Number(r.amount) })));
    setLoaded(true);
  }

  const bg = "#050508", t1 = "#e2e8f0", t2 = "#e2e8f0", vio = "#a78bfa", vioBright = "#c4b5fd", green = "#34d399", red = "#f47260", purple = "#8b5cf6";
  const ff = "'Outfit', sans-serif";

  const allTx = useMemo(() => {
    const manual = transactions || [], subs2 = subscriptions || [];
    const months = new Set(); months.add(mkey(new Date()));
    manual.forEach(tx => months.add(mkey(tx.date)));
    for (let i = 0; i < 12; i++) { const d = new Date(); d.setMonth(d.getMonth() - i); months.add(mkey(d)); }
    const rec = [];
    months.forEach(mk => genRec(subs2, mk).forEach(g => { if (!manual.some(t => t.id === g.id)) rec.push(g); }));
    return [...manual, ...rec];
  }, [transactions, subscriptions]);

  const balances = useMemo(() => {
    const b = {}; PLATFORMS.forEach(p => b[p.id] = initialBalances[p.id] || 0);
    allTx.forEach(tx => {
      if (tx.type === "income") b[tx.platform] = (b[tx.platform] || 0) + tx.amount;
      else if (tx.type === "expense") b[tx.platform] = (b[tx.platform] || 0) - tx.amount;
      else if (tx.type === "transfer") { b[tx.platform] = (b[tx.platform] || 0) - tx.amount; b[tx.to] = (b[tx.to] || 0) + tx.amount - (tx.fees || 0); }
    });
    return b;
  }, [initialBalances, allTx]);

  const totalEur = useMemo(() => PLATFORMS.reduce((s, p) => s + (balances[p.id] || 0), 0), [balances]);
  const goalPct = Math.min(Math.max((totalEur / (goal || GOAL)) * 100, 0), 100);

  // Calcul de la trajectoire patrimoine pondérée (mois récents = plus de poids)
  const trajectory = useMemo(() => {
    // On regarde les 6 derniers mois et on calcule un net pondéré
    const months = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const mk = mkey(d);
      let inc = 0, exp = 0;
      allTx.filter(tx => mkey(tx.date) === mk).forEach(tx => {
        if (tx.type === "income") inc += tx.amount;
        if (tx.type === "expense") exp += tx.amount;
      });
      const net = inc - exp;
      const hasData = inc > 0 || exp > 0;
      months.push({ mk, net, hasData });
    }

    // Pondération : mois 0 (actuel) = 6, mois 1 = 5, ... mois 5 = 1
    // Mais on ignore les mois sans data
    const monthsWithData = months.filter(m => m.hasData);
    if (monthsWithData.length === 0) {
      return { avgMonthlyNet: 0, projectedAtTarget: totalEur, gap: 0, monthsLeft: 0, neededMonthly: 0, isOnTrack: false };
    }

    let weightSum = 0, netSum = 0;
    monthsWithData.forEach((m, i) => {
      // Trouver l'index original pour le poids
      const originalIdx = months.indexOf(m);
      const weight = 6 - originalIdx;
      weightSum += weight;
      netSum += m.net * weight;
    });
    const avgMonthlyNet = weightSum > 0 ? netSum / weightSum : 0;

    // Calcul des mois restants jusqu'au 31/12/2026
    const today = new Date();
    const monthsLeft = Math.max(0, (TARGET_DATE.getFullYear() - today.getFullYear()) * 12 + (TARGET_DATE.getMonth() - today.getMonth()));

    // Projection : où serai-je à la date cible si je continue au rythme actuel ?
    const projectedAtTarget = totalEur + (avgMonthlyNet * monthsLeft);

    // Le rythme nécessaire pour atteindre l'objectif (utilise la variable goal modifiable depuis la sidebar)
    const targetGoal = goal || GOAL;
    const gap = targetGoal - projectedAtTarget;
    const neededMonthly = monthsLeft > 0 ? (targetGoal - totalEur) / monthsLeft : 0;
    const isOnTrack = projectedAtTarget >= targetGoal;

    return { avgMonthlyNet, projectedAtTarget, gap, monthsLeft, neededMonthly, isOnTrack, targetGoal };
  }, [allTx, totalEur, goal]);

  useEffect(() => {
    if (!loaded) return;
    const prev = prevPctRef.current;
    if (goalPct > prev && goalPct - prev >= 0.5) { playTick(); if (Math.floor(goalPct / 10) > Math.floor(prev / 10)) playGoalSound(); }
    prevPctRef.current = goalPct;
  }, [goalPct, loaded]);

  const mTx = useMemo(() => {
    let txs = allTx.filter(tx => mkey(tx.date) === month);
    if (pFilter !== "all") txs = txs.filter(tx => tx.platform === pFilter || tx.to === pFilter);
    if (eleaFilter) txs = txs.filter(tx => (tx.note || "").toLowerCase().includes("elea"));
    if (inconnuFilter) txs = txs.filter(tx => tx.category === "inconnu");
    if (txTypeFilter !== "all") txs = txs.filter(tx => tx.type === txTypeFilter);
    if (search) {
      const q = search.toLowerCase();
      txs = txs.filter(tx => {
        const cat = [...EXP_CATS, ...INC_CATS].find(c => c.id === (tx.category || tx.inc_category));
        const p = PLATFORMS.find(pl => pl.id === tx.platform);
        return (tx.note || "").toLowerCase().includes(q) || (cat?.name || "").toLowerCase().includes(q) || (p?.name || "").toLowerCase().includes(q);
      });
    }
    if (sortBy === "amount_desc") return txs.sort((a, b) => b.amount - a.amount);
    if (sortBy === "amount_asc") return txs.sort((a, b) => a.amount - b.amount);
    return txs.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [allTx, month, pFilter, search, sortBy, eleaFilter, txTypeFilter, inconnuFilter]);

  const stats = useMemo(() => {
    let inc = 0, exp = 0; const bc = {}, ic = {};
    allTx.filter(tx => mkey(tx.date) === month).forEach(tx => {
      if (tx.type === "income") { inc += tx.amount; ic[tx.inc_category || "other"] = (ic[tx.inc_category || "other"] || 0) + tx.amount; }
      if (tx.type === "expense") { exp += tx.amount; bc[tx.category] = (bc[tx.category] || 0) + tx.amount; }
    });
    return { inc, exp, bc, ic, net: inc - exp };
  }, [allTx, month]);

  const prevStats = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const pmk = mkey(new Date(y, m - 2, 1));
    let exp = 0; const bc = {};
    allTx.filter(tx => mkey(tx.date) === pmk).forEach(tx => {
      if (tx.type === "expense") { exp += tx.amount; bc[tx.category] = (bc[tx.category] || 0) + tx.amount; }
    });
    return { exp, bc };
  }, [allTx, month]);

  // ─── STATS AVANCÉES POUR L'ONGLET DÉTAILS ───
  const advStats = useMemo(() => {
    const monthExp = allTx.filter(tx => mkey(tx.date) === month && tx.type === "expense");
    const [y, m] = month.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const today = new Date();
    const isCurrentMonth = mkey(today) === month;
    const daysElapsed = isCurrentMonth ? today.getDate() : daysInMonth;

    const total = monthExp.reduce((s, tx) => s + tx.amount, 0);
    const avgPerDayMonth = total / daysInMonth;
    const avgPerDayElapsed = daysElapsed > 0 ? total / daysElapsed : 0;

    const byDay = {};
    monthExp.forEach(tx => { byDay[tx.date] = (byDay[tx.date] || 0) + tx.amount; });
    const activeDays = Object.keys(byDay).length;
    const avgPerActiveDay = activeDays > 0 ? total / activeDays : 0;

    const amounts = monthExp.map(tx => tx.amount).sort((a, b) => a - b);
    const median = amounts.length === 0 ? 0 : amounts.length % 2 === 0
      ? (amounts[amounts.length / 2 - 1] + amounts[amounts.length / 2]) / 2
      : amounts[Math.floor(amounts.length / 2)];
    const maxTx = monthExp.length > 0 ? monthExp.reduce((m, t) => t.amount > m.amount ? t : m) : null;

    // Dépenses par jour de la semaine
    const byDow = [0,0,0,0,0,0,0]; const byDowCount = [0,0,0,0,0,0,0];
    monthExp.forEach(tx => {
      const d = new Date(tx.date).getDay();
      byDow[d] += tx.amount; byDowCount[d]++;
    });
    const maxDow = byDow.indexOf(Math.max(...byDow));

    // Projection fin de mois
    const projection = isCurrentMonth && daysElapsed > 0 ? avgPerDayElapsed * daysInMonth : total;

    return {
      total, avgPerDayMonth, avgPerDayElapsed, avgPerActiveDay,
      activeDays, txCount: monthExp.length, median,
      maxTx, byDow, byDowCount, maxDow,
      projection, daysInMonth, daysElapsed, isCurrentMonth,
    };
  }, [allTx, month]);

  // Comparaison mois actuel vs mois dernier par catégorie
  const catComparison = useMemo(() => {
    return EXP_CATS.map(c => {
      const cur = stats.bc[c.id] || 0;
      const prev = prevStats.bc[c.id] || 0;
      const diff = cur - prev;
      const diffPct = prev > 0 ? ((cur - prev) / prev) * 100 : (cur > 0 ? 100 : 0);
      return { ...c, current: cur, previous: prev, diff, diffPct };
    }).filter(c => c.current > 0 || c.previous > 0).sort((a, b) => b.current - a.current);
  }, [stats.bc, prevStats.bc]);

  // Répartition de l'argent par plateforme (sur le total positif)
  const moneyDistribution = useMemo(() => {
    const positives = PLATFORMS.map(p => ({ ...p, amount: Math.max(balances[p.id] || 0, 0) }));
    const totalPos = positives.reduce((s, p) => s + p.amount, 0);
    return positives.map(p => ({
      ...p,
      pct: totalPos > 0 ? (p.amount / totalPos) * 100 : 0,
    })).sort((a, b) => b.amount - a.amount);
  }, [balances]);

  const insight = useMemo(() => {
    if (prevStats.exp === 0 && stats.exp === 0) return null;
    if (prevStats.exp === 0) return { text: "Premier mois tracké", color: vio };
    const diff = ((stats.exp - prevStats.exp) / prevStats.exp) * 100;
    if (diff > 10) return { text: `⚠️ +${Math.round(diff)}% dépenses vs mois dernier`, color: red };
    if (diff < -10) return { text: `🎉 ${Math.round(Math.abs(diff))}% d'économies`, color: green };
    return { text: "Dépenses stables", color: vio };
  }, [stats, prevStats]);

  const streak = useMemo(() => {
    const today = new Date(); let count = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      if (transactions.some(tx => tx.date === d.toISOString().split("T")[0])) count++; else if (i > 0) break;
    }
    return count;
  }, [transactions]);

  const lastTx = useMemo(() => {
    const m = transactions.filter(t => !t.is_recurring);
    return m.length ? m.sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date))[0] : null;
  }, [transactions]);

  const subs = subscriptions;
  const totalSubsMonth = subs.filter(s => s.active).reduce((s, sub) => s + sub.amount, 0);

  // Stats riches sur les abos
  const subsStats = useMemo(() => {
    const active = subs.filter(s => s.active);
    const monthly = active.reduce((s, sub) => s + sub.amount, 0);
    const yearly = monthly * 12;
    const mostExpensive = active.length > 0 ? active.reduce((m, s) => s.amount > m.amount ? s : m) : null;
    // Répartition par plateforme
    const byPlatform = {};
    active.forEach(s => { byPlatform[s.platform] = (byPlatform[s.platform] || 0) + s.amount; });
    return { monthly, yearly, mostExpensive, activeCount: active.length, totalCount: subs.length, byPlatform };
  }, [subs]);

  // Calcul du nombre de jours avant le prochain débit d'un abo
  const daysUntilNext = (subDay) => {
    const today = new Date();
    const todayDay = today.getDate();
    let nextDate;
    if (subDay > todayDay) {
      // Le débit est plus tard ce mois-ci
      nextDate = new Date(today.getFullYear(), today.getMonth(), subDay);
    } else if (subDay === todayDay) {
      return 0; // aujourd'hui
    } else {
      // Le débit est passé ce mois-ci, donc le prochain est le mois prochain
      nextDate = new Date(today.getFullYear(), today.getMonth() + 1, subDay);
      // Gérer le cas où le jour n'existe pas dans le mois suivant (ex: 31 février → on prend le dernier jour)
      const lastDayOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0).getDate();
      if (subDay > lastDayOfNextMonth) {
        nextDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      }
    }
    const diffMs = nextDate.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  };

  // Couleur selon urgence (vert > 7j, jaune <=7j, orange <=3j, rouge demain/aujourd'hui)
  const getNextDebitColor = (days) => {
    if (days <= 1) return red; // aujourd'hui ou demain
    if (days <= 3) return "#fb923c"; // orange
    if (days <= 7) return "#facc15"; // jaune
    return green; // vert si >7j
  };

  const formatNextDebit = (days) => {
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return "Demain";
    return `Dans ${days}j`;
  };

  const eleaTotal = useMemo(() => {
    return allTx.filter(tx => mkey(tx.date) === month && (tx.note || "").toLowerCase().includes("elea")).reduce((s, tx) => s + tx.amount, 0);
  }, [allTx, month]);

  // Stats des transactions "Inconnu" à vérifier
  const inconnuStats = useMemo(() => {
    const txs = allTx.filter(tx => mkey(tx.date) === month && tx.type === "expense" && tx.category === "inconnu");
    const total = txs.reduce((s, tx) => s + tx.amount, 0);
    return { count: txs.length, total };
  }, [allTx, month]);

  const chartData = useMemo(() => {
    if (chartView === "monthly") {
      const m = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i); const mk = mkey(d);
        let inc = 0, exp = 0;
        allTx.filter(tx => mkey(tx.date) === mk).forEach(tx => { if (tx.type === "income") inc += tx.amount; if (tx.type === "expense") exp += tx.amount; });
        m.push({ name: mshort(mk), revenus: Math.round(inc), depenses: Math.round(exp), net: Math.round(inc - exp) });
      }
      return m;
    }
    const y = {};
    allTx.forEach(tx => { const yr = new Date(tx.date).getFullYear(); if (!y[yr]) y[yr] = { inc: 0, exp: 0 };
      if (tx.type === "income") y[yr].inc += tx.amount; if (tx.type === "expense") y[yr].exp += tx.amount;
    });
    return Object.entries(y).sort().map(([yr, v]) => ({ name: yr, revenus: Math.round(v.inc), depenses: Math.round(v.exp), net: Math.round(v.inc - v.exp) }));
  }, [allTx, chartView]);

  const patriData = useMemo(() => {
    const m = [];
    let running = PLATFORMS.reduce((s, p) => s + (initialBalances[p.id] || 0), 0);
    for (let i = 11; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i); const mk = mkey(d);
      allTx.filter(tx => mkey(tx.date) === mk).forEach(tx => {
        if (tx.type === "income") running += tx.amount;
        if (tx.type === "expense") running -= tx.amount;
      });
      m.push({ name: mshort(mk), patrimoine: Math.round(running) });
    }
    return m;
  }, [allTx, initialBalances]);

  const pendingRefunds = refunds.filter(r => !r.resolved);
  const totalPendingRefunds = pendingRefunds.reduce((s, r) => s + r.amount, 0);

  const heatmapStats = useMemo(() => {
    const yearTx = allTx.filter(tx => new Date(tx.date).getFullYear() === heatmapYear);
    const byDay = {};
    let total = 0;

    if (heatmapMode === "expense") {
      yearTx.filter(tx => tx.type === "expense").forEach(tx => {
        byDay[tx.date] = (byDay[tx.date] || 0) + tx.amount;
        total += tx.amount;
      });
    } else if (heatmapMode === "income") {
      yearTx.filter(tx => tx.type === "income").forEach(tx => {
        byDay[tx.date] = (byDay[tx.date] || 0) + tx.amount;
        total += tx.amount;
      });
    } else {
      // net : revenus - dépenses (transferts ignorés)
      yearTx.forEach(tx => {
        if (tx.type === "income") { byDay[tx.date] = (byDay[tx.date] || 0) + tx.amount; total += tx.amount; }
        else if (tx.type === "expense") { byDay[tx.date] = (byDay[tx.date] || 0) - tx.amount; total -= tx.amount; }
      });
    }

    const days = Object.keys(byDay);
    const daysWithExp = days.length;
    // Pour le mode net, "max" = jour avec la plus grosse magnitude
    const maxDay = heatmapMode === "net"
      ? days.reduce((max, d) => Math.abs(byDay[d]) > Math.abs(byDay[max] || 0) ? d : max, days[0])
      : days.reduce((max, d) => byDay[d] > (byDay[max] || 0) ? d : max, days[0]);
    const avgPerDay = daysWithExp > 0 ? total / daysWithExp : 0;
    return { total, daysWithExp, maxDay, maxDayAmount: maxDay ? byDay[maxDay] : 0, avgPerDay };
  }, [allTx, heatmapYear, heatmapMode]);

  const selectedDayTx = useMemo(() => {
    if (!heatmapSelectedDate) return [];
    return allTx.filter(tx => tx.date === heatmapSelectedDate).sort((a, b) => b.amount - a.amount);
  }, [allTx, heatmapSelectedDate]);

  const availableYears = useMemo(() => {
    const yearsSet = new Set();
    transactions.forEach(tx => yearsSet.add(new Date(tx.date).getFullYear()));
    yearsSet.add(new Date().getFullYear());
    return [...yearsSet].sort((a, b) => b - a);
  }, [transactions]);

  // ─── INSIGHTS AUTOMATIQUES (détection de patterns) ───
  const autoInsights = useMemo(() => {
    const out = [];
    const today = new Date();
    const todayKey = dkey(today);
    const yesterdayKey = dkey(new Date(today.getTime() - 86400000));

    // 1. Pas de tx hier ?
    const hasYesterday = transactions.some(t => t.date === yesterdayKey);
    if (!hasYesterday && transactions.length > 5) {
      out.push({ id: "no_track_yesterday", icon: "📅", text: "Tu n'as rien tracké hier — tout va bien ?", color: vio });
    }

    // 2. Détection doublons abos ce mois (même nom de sub débité 2x)
    const monthExpenses = allTx.filter(tx => mkey(tx.date) === month && tx.type === "expense");
    const subCounts = {};
    monthExpenses.filter(tx => tx.is_recurring).forEach(tx => {
      const name = (tx.note || "").replace("🔄 ", "").trim();
      if (!name) return;
      subCounts[name] = (subCounts[name] || 0) + 1;
    });
    Object.entries(subCounts).forEach(([name, count]) => {
      if (count > 1) {
        out.push({ id: `dup_sub_${name}`, icon: "⚠️", text: `${name} a été débité ${count} fois ce mois`, color: red });
      }
    });

    // 3. Comparaison catégories cette semaine vs les 3 dernières (hors actuelle)
    const weekStart = new Date(today); weekStart.setDate(today.getDate() - 6);
    const weekTx = allTx.filter(tx => {
      const d = new Date(tx.date);
      return tx.type === "expense" && d >= weekStart && d <= today;
    });
    const weekByCat = {};
    weekTx.forEach(tx => { weekByCat[tx.category] = (weekByCat[tx.category] || 0) + tx.amount; });

    const refStart = new Date(today); refStart.setDate(today.getDate() - 28);
    const refEnd = new Date(today); refEnd.setDate(today.getDate() - 7);
    const refTx = allTx.filter(tx => {
      const d = new Date(tx.date);
      return tx.type === "expense" && d >= refStart && d <= refEnd;
    });
    const refByCatAvg = {};
    EXP_CATS.forEach(c => {
      const total = refTx.filter(tx => tx.category === c.id).reduce((s, tx) => s + tx.amount, 0);
      refByCatAvg[c.id] = total / 3; // moyenne sur 3 semaines
    });

    EXP_CATS.forEach(c => {
      const wk = weekByCat[c.id] || 0;
      const avg = refByCatAvg[c.id] || 0;
      if (wk > 50 && avg > 0 && wk > avg * 1.8) { // au moins +80% et au moins 50€
        const pct = Math.round(((wk - avg) / avg) * 100);
        out.push({ id: `cat_spike_${c.id}`, icon: c.emoji, text: `+${pct}% en ${c.name} cette semaine vs habitude`, color: red });
      }
    });

    // 4. Objectif proche d'un palier 10%
    const nextMilestone = Math.ceil(goalPct / 10) * 10;
    const remaining = ((nextMilestone / 100) * goal) - totalEur;
    if (remaining > 0 && remaining < 2000 && nextMilestone <= 100) {
      out.push({ id: `goal_near_${nextMilestone}`, icon: "🎯", text: `Plus que ${fmt(remaining)} pour atteindre ${nextMilestone}% de ton objectif`, color: vioBright });
    }

    // 5. Mois quasi terminé sans dépense Elea (purement fun)
    const dayOfMonth = today.getDate();
    const [, mNum] = month.split("-").map(Number);
    const isThisMonth = mkey(today) === month;
    if (isThisMonth && dayOfMonth > 25 && eleaTotal === 0) {
      out.push({ id: "no_elea", icon: "💕", text: "Aucune dépense Elea ce mois — tout va bien ?", color: "#f472b6" });
    }

    // Filtrer les insights fermés
    return out.filter(i => !dismissedInsights.has(i.id));
  }, [allTx, transactions, month, goalPct, goal, totalEur, eleaTotal, dismissedInsights]);

  const dismissInsight = (id) => {
    setDismissedInsights(prev => {
      const next = new Set(prev); next.add(id); return next;
    });
  };

  const shiftMonth = (d) => { const [y, m] = month.split("-").map(Number); setMonth(mkey(new Date(y, m - 1 + d, 1))); };

  const submit = async () => {
    const amount = parseFloat(f.amount); if (!amount || amount <= 0) return;
    if (editTx) {
      const payload = { amount, platform: f.platform, date: f.date, note: f.note };
      if (f.type === "expense") payload.category = f.category;
      if (f.type === "income") payload.inc_category = f.incCategory;
      if (f.type === "transfer") { payload.to = f.to; payload.fees = parseFloat(f.fees) || 0; }
      await supabase.from('transactions').update(payload).eq('id', editTx);
      setEditTx(null);
    } else {
      const tx = { id: uid(), type: f.type, amount, platform: f.platform, date: f.date, note: f.note };
      if (f.type === "expense") tx.category = f.category;
      if (f.type === "income") tx.inc_category = f.incCategory;
      if (f.type === "transfer") { tx.to = f.to; const fees = parseFloat(f.fees) || 0; if (fees > 0) tx.fees = fees; }
      await supabase.from('transactions').insert(tx);

      // Si dépense + catégorie Abo + case cochée → créer l'abonnement récurrent
      if (f.type === "expense" && f.category === "abonnement" && f.makeRecurring && f.note) {
        const dayOfMonth = new Date(f.date).getDate();
        await supabase.from('subscriptions').insert({
          id: uid(),
          name: f.note.replace(/^🔄\s*/, ""), // au cas où il a un emoji déjà
          amount,
          platform: f.platform,
          day: dayOfMonth,
          active: true,
          start_date: f.date,
        });
      }

      // Sons
      if (f.type === "expense") playExpenseClick(muted);
      else if (f.type === "income") playCashRegister(muted);
      else if (f.type === "transfer") playSwoosh(muted);
    }
    setF(p => ({ ...p, amount: "", note: "", fees: "", makeRecurring: true })); setModal(null);
    await loadAll();
  };

  const startEdit = (tx) => {
    setF({ type: tx.type, amount: String(tx.amount), platform: tx.platform, category: tx.category || "quotidien", incCategory: tx.inc_category || "rainbet_video", note: tx.note || "", date: tx.date, to: tx.to || "phantom", fees: tx.fees ? String(tx.fees) : "", makeRecurring: false, day: 1 });
    setEditTx(tx.id); setModal("tx");
  };

  // Dupliquer : ouvre le modal pré-rempli avec même date + montant + plateforme + catégorie, mais note vidée
  const duplicateTx = (tx) => {
    setF({
      type: tx.type,
      amount: String(tx.amount),
      platform: tx.platform,
      category: tx.category || "quotidien",
      incCategory: tx.inc_category || "rainbet_video",
      note: "", // note vidée comme demandé
      date: tx.date, // même date que l'original
      to: tx.to || "phantom",
      fees: tx.fees ? String(tx.fees) : "",
      makeRecurring: false,
      day: 1,
    });
    setEditTx(null); // pas en mode édition, c'est une nouvelle transaction
    setModal("tx");
  };
  const redoLast = () => {
    if (!lastTx) return;
    setF({ type: lastTx.type, amount: String(lastTx.amount), platform: lastTx.platform, category: lastTx.category || "quotidien", incCategory: lastTx.inc_category || "rainbet_video", note: lastTx.note || "", date: new Date().toISOString().split("T")[0], to: lastTx.to || "phantom", fees: lastTx.fees ? String(lastTx.fees) : "", makeRecurring: false, day: 1 });
    setEditTx(null); setModal("tx");
  };

  const del = async (id) => { await supabase.from('transactions').delete().eq('id', id); setConfirmDel(null); playDelete(muted); await loadAll(); };
  const saveBal = async (pid) => {
    const val = parseFloat(editBalVal) || 0;
    await supabase.from('initial_balances').upsert({ platform: pid, amount: val });
    setEditBal(null); await loadAll();
  };
  const addSub = async () => {
    const a = parseFloat(sf.amount); if (!a || !sf.name) return;
    if (editingSub) {
      // Mode édition
      await supabase.from('subscriptions').update({
        name: sf.name, amount: a, platform: sf.platform, day: parseInt(sf.day) || 1
      }).eq('id', editingSub);
      setEditingSub(null);
    } else {
      // Mode création
      await supabase.from('subscriptions').insert({ id: uid(), name: sf.name, amount: a, platform: sf.platform, day: parseInt(sf.day) || 1, active: true, start_date: new Date().toISOString().split("T")[0] });
    }
    setSf({ name: "", amount: "", platform: "revolut", day: 1 }); setModal(null); await loadAll();
  };

  // Démarrer l'édition d'un abo : remplir le formulaire + ouvrir le modal
  const startEditSub = (sub) => {
    setSf({ name: sub.name, amount: String(sub.amount), platform: sub.platform, day: sub.day });
    setEditingSub(sub.id);
    setModal("sub");
  };

  const toggleSub = async (id) => {
    const s = subs.find(x => x.id === id); if (!s) return;
    await supabase.from('subscriptions').update({ active: !s.active }).eq('id', id); await loadAll();
  };
  const delSub = async (id) => { await supabase.from('subscriptions').delete().eq('id', id); setConfirmDelSub(null); await loadAll(); };

  const addRefund = async () => {
    const a = parseFloat(refundForm.amount); if (!a || !refundForm.label) return;
    await supabase.from('refunds').insert({ id: uid(), label: refundForm.label, amount: a, date: refundForm.date });
    setRefundForm({ label: "", amount: "", date: new Date().toISOString().split("T")[0] }); setModal(null); await loadAll();
  };
  const resolveRefund = async (id) => {
    await supabase.from('refunds').update({ resolved: true, resolved_date: new Date().toISOString().split("T")[0] }).eq('id', id); await loadAll();
  };
  const delRefund = async (id) => { await supabase.from('refunds').delete().eq('id', id); await loadAll(); };

  const exportCSV = () => {
    const rows = [["Date","Type","Plateforme","Catégorie","Montant","Vers","Frais","Note"]];
    [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(tx => {
      const p = PLATFORMS.find(pl => pl.id === tx.platform); const cat = [...EXP_CATS,...INC_CATS].find(c => c.id === (tx.category || tx.inc_category));
      rows.push([tx.date, tx.type, p?.name, cat?.name || "", tx.amount, PLATFORMS.find(pl => pl.id === tx.to)?.name || "", tx.fees || "", tx.note || ""]);
    });
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" })); a.download = "matteo-finances.csv"; a.click();
  };

  if (!loaded) return <div style={{ background: bg, color: "#fff", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ff }}>⏳</div>;

  const donutExp = EXP_CATS.map(c => ({ value: stats.bc[c.id] || 0, color: c.color, label: c.name })).filter(d => d.value > 0);
  const donutInc = INC_CATS.map(c => ({ value: stats.ic[c.id] || 0, color: c.color, label: c.name })).filter(d => d.value > 0);
  const visTx = showAllTx ? mTx : mTx.slice(0, isDesktop ? 10 : 6);

  const pill = (active, color) => ({
    padding: "7px 14px", borderRadius: 20, border: `1px solid ${active ? (color || vio) + "50" : "rgba(255,255,255,0.05)"}`,
    background: active ? (color || vio) + "15" : "transparent", color: active ? (color || vio) : t2,
    fontSize: 12, cursor: "pointer", fontFamily: ff, fontWeight: 600, whiteSpace: "nowrap",
  });
  const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 12px", color: t1, fontFamily: ff, fontSize: 14, width: "100%", outline: "none", boxSizing: "border-box" };
  const tipStyle = { background: "rgba(10,10,20,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontFamily: ff, fontSize: 11, color: t1 };

  const TxRow = ({ tx }) => {
    const p = PLATFORMS.find(pl => pl.id === tx.platform);
    const cat = EXP_CATS.find(c => c.id === tx.category);
    const incCat = INC_CATS.find(c => c.id === tx.inc_category);
    const toP = PLATFORMS.find(pl => pl.id === tx.to);
    const isInc = tx.type === "income", isTr = tx.type === "transfer", isRec = tx.is_recurring;
    const dc = isInc ? incCat : cat;
    const hasElea = (tx.note || "").toLowerCase().includes("elea");
    return (
      <G glow={confirmDel === tx.id ? red : null} style={{ padding: "10px 12px", marginBottom: 5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 0, cursor: isRec ? "default" : "pointer" }} onClick={() => !isRec && startEdit(tx)}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
            <span style={{ fontSize: 14 }}>{dc?.emoji || (isTr ? "↔" : "💰")}</span>
            <span style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {tx.note || dc?.name || (isTr ? `${p?.name} → ${toP?.name}` : "Revenu")}
            </span>
            {isRec && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 4, background: vio + "15", color: vio }}>auto</span>}
            {hasElea && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 4, background: "#f472b6" + "15", color: "#f472b6" }}>Elea</span>}
          </div>
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <span style={{ fontSize: 10, color: t2 }}>{new Date(tx.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
            <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: p?.color + "10", color: p?.color }}>{p?.name}</span>
            {isTr && toP && <><span style={{ fontSize: 9, color: t2 }}>→</span><span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: toP?.color + "10", color: toP?.color }}>{toP?.name}</span></>}
            {isTr && tx.fees > 0 && <span style={{ fontSize: 9, color: red }}>frais {fmt2(tx.fees)}</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: isInc ? green : isTr ? purple : red }}>
            {isInc ? "+" : isTr ? "" : "-"}{fmt2(tx.amount)}
          </div>
          {!isRec && (tx.type === "expense" || tx.type === "income") && (
            <button onClick={(e) => { e.stopPropagation(); duplicateTx(tx); }}
              title="Dupliquer cette transaction"
              style={{ background: "none", border: "none", color: vio + "60", cursor: "pointer", fontSize: 12, padding: 2 }}>
              📋
            </button>
          )}
          {!isRec && (confirmDel === tx.id ? (
            <div style={{ display: "flex", gap: 3 }}>
              <button onClick={() => del(tx.id)} style={{ background: red, border: "none", borderRadius: 5, color: "#fff", fontSize: 10, padding: "4px 8px", cursor: "pointer", fontFamily: ff }}>Oui</button>
              <button onClick={() => setConfirmDel(null)} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 5, color: t2, fontSize: 10, padding: "4px 8px", cursor: "pointer", fontFamily: ff }}>Non</button>
            </div>
          ) : <button onClick={() => setConfirmDel(tx.id)} style={{ background: "none", border: "none", color: t2 + "30", cursor: "pointer", fontSize: 13, padding: 2 }}>🗑</button>)}
        </div>
      </G>
    );
  };

  // ─── COMPOSANT MONTH SWITCHER (réutilisable) ───
  const MonthSwitcher = ({ size = "normal" }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: size === "big" ? 24 : 20, marginBottom: size === "big" ? 14 : 10 }}>
      <button onClick={() => shiftMonth(-1)} style={{ background: "none", border: "none", color: t2, fontSize: size === "big" ? 26 : 22, cursor: "pointer", fontFamily: ff }}>‹</button>
      <span style={{ fontSize: size === "big" ? 19 : 17, fontWeight: 600 }}>{mlabel(month)}</span>
      <button onClick={() => shiftMonth(1)} style={{ background: "none", border: "none", color: t2, fontSize: size === "big" ? 26 : 22, cursor: "pointer", fontFamily: ff }}>›</button>
    </div>
  );

  // ============ DESKTOP NAV ITEMS ============
  const navItems = [
    ["home", "🏠", "Accueil"],
    ["details", "📊", "Détails"],
    ["chart", "📈", "Évolution"],
    ["heatmap", "📅", "Heatmap"],
    ["flux", "🌊", "Flux"],
    ["subs", "🔄", "Abos"],
    ["refunds", "💸", "Remb."],
  ];

  // ============ RENDER ============
  // On a deux modes : DESKTOP (≥900px) ou MOBILE (<900px)
  // Le contenu des onglets est partagé via une fonction renderTab()

  const renderTab = () => (
    <>
      {/* HOME */}
      {tab === "home" && (<>
        <MonthSwitcher size={isDesktop ? "big" : "normal"} />

        {insight && <div style={{ padding: "8px 14px", marginBottom: isDesktop ? 14 : 8, borderRadius: 10, background: insight.color + "10", border: `1px solid ${insight.color}20`, fontSize: 12, color: insight.color, fontWeight: 500, textAlign: "center" }}>{insight.text}</div>}

        {/* PANNEAU INSIGHTS AUTOMATIQUES */}
        {autoInsights.length > 0 && (
          <div style={{ marginBottom: isDesktop ? 14 : 10, display: "flex", flexDirection: "column", gap: 6 }}>
            {autoInsights.map(ins => (
              <div key={ins.id} style={{
                padding: "10px 14px", borderRadius: 10,
                background: ins.color + "10", border: `1px solid ${ins.color}25`,
                display: "flex", alignItems: "center", gap: 10,
                boxShadow: `0 0 14px ${ins.color}08`,
              }}>
                <span style={{ fontSize: 16 }}>{ins.icon}</span>
                <span style={{ flex: 1, fontSize: 12, color: ins.color, fontWeight: 500 }}>{ins.text}</span>
                <button onClick={() => dismissInsight(ins.id)} style={{ background: "none", border: "none", color: ins.color + "70", cursor: "pointer", fontSize: 14, padding: 2 }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* CARD TRAJECTOIRE PATRIMOINE → OBJECTIF AU 31/12/2026 */}
        {trajectory.monthsLeft > 0 && trajectory.avgMonthlyNet !== 0 && (
          <G glow={trajectory.isOnTrack ? green : "#fbbf24"} style={{ padding: isDesktop ? "16px 20px" : "14px 16px", marginBottom: isDesktop ? 16 : 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: t2, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 }}>🎯 Trajectoire vers {fmt(trajectory.targetGoal)}</div>
                <div style={{ fontSize: 13, color: t1, fontWeight: 500 }}>au 31/12/2026 · dans {trajectory.monthsLeft} mois</div>
              </div>
              <div style={{
                padding: "5px 10px", borderRadius: 8,
                background: (trajectory.isOnTrack ? green : "#fbbf24") + "15",
                border: `1px solid ${(trajectory.isOnTrack ? green : "#fbbf24")}40`,
                color: trajectory.isOnTrack ? green : "#fbbf24",
                fontSize: 11, fontWeight: 700,
              }}>
                {trajectory.isOnTrack ? "✅ Sur les rails" : "⚠️ En retard"}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr 1fr" : "1fr", gap: 10 }}>
              <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: 10, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>📈 À ce rythme</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: trajectory.isOnTrack ? green : "#fbbf24" }}>
                  {fmt(trajectory.projectedAtTarget)}
                </div>
                <div style={{ fontSize: 10, color: t2, marginTop: 2 }}>
                  {trajectory.isOnTrack
                    ? `+${fmt(-trajectory.gap)} au-dessus 🎉`
                    : `-${fmt(trajectory.gap)} en dessous`}
                </div>
              </div>
              <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: 10, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>💰 Net moyen actuel</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: trajectory.avgMonthlyNet >= 0 ? green : red }}>
                  {trajectory.avgMonthlyNet >= 0 ? "+" : "-"}{fmt(Math.abs(trajectory.avgMonthlyNet))}
                </div>
                <div style={{ fontSize: 10, color: t2, marginTop: 2 }}>par mois (pondéré)</div>
              </div>
              <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: `1px solid ${vio}30` }}>
                <div style={{ fontSize: 10, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>🎯 Rythme nécessaire</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: vioBright }}>
                  {fmt(trajectory.neededMonthly)}
                </div>
                <div style={{ fontSize: 10, color: t2, marginTop: 2 }}>
                  par mois pour atteindre {fmt(trajectory.targetGoal)}
                </div>
              </div>
            </div>
          </G>
        )}

        {isDesktop ? (
          // ─── DESKTOP HOME : 2 colonnes ───
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr)", gap: 18 }}>
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <G glow={green} style={{ padding: "18px" }}>
                  <div style={{ fontSize: 11, color: t2, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>Rentrées</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: green }}>+{fmt(stats.inc)}</div>
                </G>
                <G glow={red} style={{ padding: "18px" }}>
                  <div style={{ fontSize: 11, color: t2, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>Dépenses</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: red }}>-{fmt(stats.exp)}</div>
                </G>
              </div>
              <G glow={stats.net >= 0 ? green : red} style={{ padding: "16px 18px", marginBottom: 12, textAlign: "center" }}>
                <span style={{ fontSize: 11, color: t2, letterSpacing: 1.2 }}>NET </span>
                <span style={{ fontSize: 30, fontWeight: 700, color: stats.net >= 0 ? green : red }}>{stats.net >= 0 ? "+" : "-"}{fmt(stats.net)}</span>
              </G>

              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                {totalSubsMonth > 0 && <G style={{ padding: "10px 14px", flex: "1 1 30%", textAlign: "center" }}><div style={{ fontSize: 10, color: t2, marginBottom: 2 }}>📱 Abos</div><div style={{ fontSize: 13, fontWeight: 600, color: vio }}>{fmt(totalSubsMonth)}/mois</div></G>}
                {eleaTotal > 0 && <G style={{ padding: "10px 14px", flex: "1 1 30%", textAlign: "center" }}><div style={{ fontSize: 10, color: t2, marginBottom: 2 }}>💕 Elea</div><div style={{ fontSize: 13, fontWeight: 600, color: "#f472b6" }}>{fmt(eleaTotal)}</div></G>}
                {totalPendingRefunds > 0 && <G style={{ padding: "10px 14px", flex: "1 1 30%", textAlign: "center" }} onClick={() => setTab("refunds")}><div style={{ fontSize: 10, color: t2, marginBottom: 2 }}>💸 Remb.</div><div style={{ fontSize: 13, fontWeight: 600, color: "#fbbf24" }}>{fmt(totalPendingRefunds)}</div></G>}
                {inconnuStats.count > 0 && <G glow="#facc15" style={{ padding: "10px 14px", flex: "1 1 30%", textAlign: "center", border: "1px solid #facc1540" }} onClick={() => setInconnuFilter(true)}><div style={{ fontSize: 10, color: t2, marginBottom: 2 }}>❓ À vérifier</div><div style={{ fontSize: 13, fontWeight: 600, color: "#facc15" }}>{inconnuStats.count} tx · {fmt(inconnuStats.total)}</div></G>}
              </div>

              {/* Mini donut dépenses */}
              {donutExp.length > 0 && (
                <G style={{ padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: red }}>Dépenses du mois</div>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <Donut data={donutExp} size={120} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                      {donutExp.slice(0, 5).map(d => (
                        <div key={d.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
                            <span style={{ fontSize: 11, color: t2 }}>{d.label}</span>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: t1 }}>{fmt(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </G>
              )}
            </div>

            <div>
              <div style={{ display: "flex", gap: 6, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button onClick={() => setShowSearch(!showSearch)} style={{ ...pill(showSearch), padding: "6px 12px" }}>🔍</button>
                <button onClick={() => {
                  // cycle: date -> amount_desc -> amount_asc -> date
                  if (sortBy === "date") setSortBy("amount_desc");
                  else if (sortBy === "amount_desc") setSortBy("amount_asc");
                  else setSortBy("date");
                }} style={{ ...pill(sortBy !== "date"), padding: "6px 12px", fontSize: 11 }}>
                  {sortBy === "date" ? "📅 Date" : sortBy === "amount_desc" ? "💰 ↓ Plus grand" : "💰 ↑ Plus petit"}
                </button>
                <button onClick={() => setTxTypeFilter(txTypeFilter === "all" ? "income" : txTypeFilter === "income" ? "expense" : "all")}
                  style={{ ...pill(txTypeFilter !== "all", txTypeFilter === "income" ? green : txTypeFilter === "expense" ? red : null), padding: "6px 12px", fontSize: 11 }}>
                  {txTypeFilter === "all" ? "Tout" : txTypeFilter === "income" ? "📥 Rentrées" : "📤 Sorties"}
                </button>
                <button onClick={() => setEleaFilter(!eleaFilter)} style={{ ...pill(eleaFilter, "#f472b6"), padding: "6px 12px", fontSize: 11 }}>💕 Elea</button>
                <button onClick={() => setInconnuFilter(!inconnuFilter)} style={{ ...pill(inconnuFilter, "#facc15"), padding: "6px 12px", fontSize: 11 }}>❓ Inconnu</button>
                <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
                  <button onClick={() => setPFilter("all")} style={{ ...pill(pFilter === "all"), padding: "6px 10px", fontSize: 11 }}>Tout</button>
                  {PLATFORMS.map(p => <button key={p.id} onClick={() => setPFilter(p.id)} style={{ ...pill(pFilter === p.id, p.color), padding: "6px 10px", fontSize: 11 }} title={p.name}>{p.icon}</button>)}
                </div>
              </div>
              {showSearch && <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." autoFocus style={{ ...inputStyle, marginBottom: 10, fontSize: 13 }} />}

              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Transactions ({mTx.length})</div>
              {mTx.length === 0 && <G style={{ padding: 30, textAlign: "center" }}><span style={{ color: t2 }}>Aucune transaction</span></G>}
              {visTx.map(tx => <TxRow key={tx.id} tx={tx} />)}
              {mTx.length > 10 && <button onClick={() => setShowAllTx(!showAllTx)} style={{ ...pill(false), width: "100%", marginTop: 6, textAlign: "center", display: "block" }}>{showAllTx ? "Voir moins" : `Tout voir (${mTx.length})`}</button>}
            </div>
          </div>
        ) : (
          // ─── MOBILE HOME (inchangé) ───
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <G glow={green} style={{ padding: "14px" }}>
                <div style={{ fontSize: 10, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Rentrées</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: green }}>+{fmt(stats.inc)}</div>
              </G>
              <G glow={red} style={{ padding: "14px" }}>
                <div style={{ fontSize: 10, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Dépenses</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: red }}>-{fmt(stats.exp)}</div>
              </G>
            </div>
            <G glow={stats.net >= 0 ? green : red} style={{ padding: "10px 14px", marginBottom: 8, textAlign: "center" }}>
              <span style={{ fontSize: 10, color: t2 }}>NET </span>
              <span style={{ fontSize: 24, fontWeight: 700, color: stats.net >= 0 ? green : red }}>{stats.net >= 0 ? "+" : "-"}{fmt(stats.net)}</span>
            </G>

            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              {totalSubsMonth > 0 && <G style={{ padding: "8px 12px", flex: 1, textAlign: "center" }}><span style={{ fontSize: 10, color: t2 }}>📱 Abos : </span><span style={{ fontSize: 12, fontWeight: 600, color: vio }}>{fmt(totalSubsMonth)}/mois</span></G>}
              {eleaTotal > 0 && <G style={{ padding: "8px 12px", flex: 1, textAlign: "center" }}><span style={{ fontSize: 10, color: t2 }}>💕 Elea : </span><span style={{ fontSize: 12, fontWeight: 600, color: "#f472b6" }}>{fmt(eleaTotal)}</span></G>}
              {totalPendingRefunds > 0 && <G style={{ padding: "8px 12px", flex: 1, textAlign: "center" }} onClick={() => setTab("refunds")}><span style={{ fontSize: 10, color: t2 }}>💸 Remb : </span><span style={{ fontSize: 12, fontWeight: 600, color: "#fbbf24" }}>{fmt(totalPendingRefunds)}</span></G>}
              {inconnuStats.count > 0 && <G glow="#facc15" style={{ padding: "8px 12px", flex: 1, textAlign: "center", border: "1px solid #facc1540" }} onClick={() => setInconnuFilter(true)}><span style={{ fontSize: 10, color: t2 }}>❓ Vérifier : </span><span style={{ fontSize: 12, fontWeight: 600, color: "#facc15" }}>{inconnuStats.count} ({fmt(inconnuStats.total)})</span></G>}
            </div>

            <div style={{ display: "flex", gap: 5, marginBottom: 6, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={() => setShowSearch(!showSearch)} style={{ ...pill(showSearch), padding: "5px 10px" }}>🔍</button>
              <button onClick={() => {
                if (sortBy === "date") setSortBy("amount_desc");
                else if (sortBy === "amount_desc") setSortBy("amount_asc");
                else setSortBy("date");
              }} style={{ ...pill(sortBy !== "date"), padding: "5px 10px", fontSize: 11 }}>
                {sortBy === "date" ? "📅" : sortBy === "amount_desc" ? "💰↓" : "💰↑"}
              </button>
              <button onClick={() => setTxTypeFilter(txTypeFilter === "all" ? "income" : txTypeFilter === "income" ? "expense" : "all")}
                style={{ ...pill(txTypeFilter !== "all", txTypeFilter === "income" ? green : txTypeFilter === "expense" ? red : null), padding: "5px 10px", fontSize: 11 }}>
                {txTypeFilter === "all" ? "Type" : txTypeFilter === "income" ? "📥" : "📤"}
              </button>
              <button onClick={() => setEleaFilter(!eleaFilter)} style={{ ...pill(eleaFilter, "#f472b6"), padding: "5px 10px", fontSize: 11 }}>💕</button>
              <button onClick={() => setInconnuFilter(!inconnuFilter)} style={{ ...pill(inconnuFilter, "#facc15"), padding: "5px 10px", fontSize: 11 }}>❓</button>
              <div style={{ display: "flex", gap: 3, overflowX: "auto", scrollbarWidth: "none" }}>
                <button onClick={() => setPFilter("all")} style={{ ...pill(pFilter === "all"), padding: "5px 8px", fontSize: 10 }}>Tout</button>
                {PLATFORMS.map(p => <button key={p.id} onClick={() => setPFilter(p.id)} style={{ ...pill(pFilter === p.id, p.color), padding: "5px 8px", fontSize: 10 }}>{p.icon}</button>)}
              </div>
            </div>
            {showSearch && <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." autoFocus style={{ ...inputStyle, marginBottom: 6, fontSize: 13 }} />}

            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Transactions</div>
            {mTx.length === 0 && <G style={{ padding: 24, textAlign: "center" }}><span style={{ color: t2 }}>Aucune transaction</span></G>}
            {visTx.map(tx => <TxRow key={tx.id} tx={tx} />)}
            {mTx.length > 6 && <button onClick={() => setShowAllTx(!showAllTx)} style={{ ...pill(false), width: "100%", marginTop: 4, textAlign: "center", display: "block" }}>{showAllTx ? "Voir moins" : `Tout voir (${mTx.length})`}</button>}
          </>
        )}
      </>)}

      {/* DETAILS - REFONTE */}
      {tab === "details" && (<>
        <MonthSwitcher size={isDesktop ? "big" : "normal"} />

        {/* STATS GLOBALES — 6 cards */}
        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(6, 1fr)" : "repeat(2, 1fr)", gap: isDesktop ? 10 : 8, marginBottom: isDesktop ? 16 : 12 }}>
          <G style={{ padding: isDesktop ? "14px" : "12px" }}>
            <div style={{ fontSize: 9, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>€ / jour</div>
            <div style={{ fontSize: isDesktop ? 18 : 16, fontWeight: 700, color: t1 }}>{fmt(advStats.avgPerDayElapsed)}</div>
            <div style={{ fontSize: 9, color: t2, marginTop: 2 }}>sur {advStats.daysElapsed}j</div>
          </G>
          <G style={{ padding: isDesktop ? "14px" : "12px" }}>
            <div style={{ fontSize: 9, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>€ / jour actif</div>
            <div style={{ fontSize: isDesktop ? 18 : 16, fontWeight: 700, color: vio }}>{fmt(advStats.avgPerActiveDay)}</div>
            <div style={{ fontSize: 9, color: t2, marginTop: 2 }}>{advStats.activeDays} jours</div>
          </G>
          <G style={{ padding: isDesktop ? "14px" : "12px" }}>
            <div style={{ fontSize: 9, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Médiane</div>
            <div style={{ fontSize: isDesktop ? 18 : 16, fontWeight: 700, color: t1 }}>{fmt(advStats.median)}</div>
            <div style={{ fontSize: 9, color: t2, marginTop: 2 }}>par tx</div>
          </G>
          <G style={{ padding: isDesktop ? "14px" : "12px" }}>
            <div style={{ fontSize: 9, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Plus grosse</div>
            <div style={{ fontSize: isDesktop ? 18 : 16, fontWeight: 700, color: red }}>{advStats.maxTx ? fmt(advStats.maxTx.amount) : "—"}</div>
            <div style={{ fontSize: 9, color: t2, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{advStats.maxTx?.note || EXP_CATS.find(c => c.id === advStats.maxTx?.category)?.name || "—"}</div>
          </G>
          <G style={{ padding: isDesktop ? "14px" : "12px" }}>
            <div style={{ fontSize: 9, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Transactions</div>
            <div style={{ fontSize: isDesktop ? 18 : 16, fontWeight: 700, color: t1 }}>{advStats.txCount}</div>
            <div style={{ fontSize: 9, color: t2, marginTop: 2 }}>ce mois</div>
          </G>
          <G style={{ padding: isDesktop ? "14px" : "12px" }}>
            <div style={{ fontSize: 9, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{advStats.isCurrentMonth ? "Projection" : "Total"}</div>
            <div style={{ fontSize: isDesktop ? 18 : 16, fontWeight: 700, color: advStats.isCurrentMonth ? "#fbbf24" : red }}>{fmt(advStats.projection)}</div>
            <div style={{ fontSize: 9, color: t2, marginTop: 2 }}>{advStats.isCurrentMonth ? "fin de mois" : "réalisé"}</div>
          </G>
        </div>

        {isDesktop ? (
          // ─── DESKTOP DÉTAILS : grille 2 cols ───
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            {/* Donut dépenses */}
            <G style={{ padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: red }}>📤 Dépenses par catégorie</div>
              <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                <Donut data={donutExp} size={140} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                  {donutExp.length === 0 && <span style={{ fontSize: 11, color: t2 }}>—</span>}
                  {donutExp.map(d => <div key={d.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} /><span style={{ fontSize: 11, color: t2 }}>{d.label}</span></div><span style={{ fontSize: 11, fontWeight: 600, color: t1 }}>{fmt(d.value)}</span></div>)}
                </div>
              </div>
            </G>

            {/* Donut revenus */}
            <G style={{ padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: green }}>📥 Revenus par source</div>
              <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                <Donut data={donutInc} size={140} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                  {donutInc.length === 0 && <span style={{ fontSize: 11, color: t2 }}>—</span>}
                  {donutInc.map(d => <div key={d.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} /><span style={{ fontSize: 11, color: t2 }}>{d.label}</span></div><span style={{ fontSize: 11, fontWeight: 600, color: t1 }}>{fmt(d.value)}</span></div>)}
                </div>
              </div>
            </G>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <G style={{ padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: red }}>Dépenses</div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <Donut data={donutExp} />
                {donutExp.map(d => <div key={d.label} style={{ display: "flex", justifyContent: "space-between", width: "100%" }}><div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 7, height: 7, borderRadius: 2, background: d.color }} /><span style={{ fontSize: 10, color: t2 }}>{d.label}</span></div><span style={{ fontSize: 10, fontWeight: 600, color: t2 }}>{fmt(d.value)}</span></div>)}
                {donutExp.length === 0 && <span style={{ fontSize: 10, color: t2 }}>—</span>}
              </div>
            </G>
            <G style={{ padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: green }}>Revenus</div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <Donut data={donutInc} />
                {donutInc.map(d => <div key={d.label} style={{ display: "flex", justifyContent: "space-between", width: "100%" }}><div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 7, height: 7, borderRadius: 2, background: d.color }} /><span style={{ fontSize: 10, color: t2 }}>{d.label}</span></div><span style={{ fontSize: 10, fontWeight: 600, color: t2 }}>{fmt(d.value)}</span></div>)}
                {donutInc.length === 0 && <span style={{ fontSize: 10, color: t2 }}>—</span>}
              </div>
            </G>
          </div>
        )}

        {/* RÉPARTITION DE L'ARGENT (desktop only en grille, sinon stack) */}
        <G glow={vio} style={{ padding: isDesktop ? 18 : 14, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: vioBright }}>💰 Où est ton argent ?</div>
            <div style={{ fontSize: 11, color: t2 }}>Répartition par compte</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {moneyDistribution.map(p => (
              <div key={p.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: p.color + "20", color: p.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11 }}>{p.icon}</div>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{p.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 11, color: t2 }}>{p.pct.toFixed(1)}%</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: t1, minWidth: 70, textAlign: "right" }}>{fmtSigned(balances[p.id])}</span>
                  </div>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${p.pct}%`, background: p.color, boxShadow: `0 0 10px ${p.color}60`, transition: "width 0.6s" }} />
                </div>
              </div>
            ))}
          </div>
        </G>

        {/* DÉPENSES PAR JOUR DE LA SEMAINE */}
        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap: 14, marginBottom: 14 }}>
          <G style={{ padding: isDesktop ? 18 : 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>📆 Par jour de la semaine</div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 6, height: 100 }}>
              {[1,2,3,4,5,6,0].map(idx => {
                const max = Math.max(...advStats.byDow, 1);
                const h = (advStats.byDow[idx] / max) * 100;
                const isMax = idx === advStats.maxDow && advStats.byDow[idx] > 0;
                return (
                  <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ fontSize: 9, color: t2, fontWeight: 600 }}>{advStats.byDow[idx] > 0 ? fmt(advStats.byDow[idx]) : ""}</div>
                    <div style={{ width: "100%", height: `${h}%`, minHeight: advStats.byDow[idx] > 0 ? 4 : 0, borderRadius: "4px 4px 0 0", background: isMax ? red : vio + "60", boxShadow: isMax ? `0 0 12px ${red}50` : "none", transition: "height 0.5s" }} />
                    <div style={{ fontSize: 10, color: isMax ? red : t2, fontWeight: isMax ? 600 : 400 }}>{DOW[idx]}</div>
                  </div>
                );
              })}
            </div>
          </G>

          <G style={{ padding: isDesktop ? 18 : 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>🏆 Top 5 dépenses</div>
            {[...allTx.filter(tx => mkey(tx.date) === month && tx.type === "expense")].sort((a, b) => b.amount - a.amount).slice(0, 5).map((tx, i) => {
              const cat = EXP_CATS.find(c => c.id === tx.category);
              return <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.04)" : "none", alignItems: "center" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 11, color: t2, width: 18 }}>#{i+1}</span><span style={{ fontSize: 14 }}>{cat?.emoji || "📦"}</span><span style={{ fontSize: 12 }}>{tx.note || cat?.name}</span></div><span style={{ fontSize: 13, fontWeight: 600, color: red }}>{fmt2(tx.amount)}</span></div>;
            })}
            {advStats.txCount === 0 && <div style={{ fontSize: 11, color: t2, textAlign: "center", padding: 20 }}>Aucune dépense ce mois</div>}
          </G>
        </div>

        {/* COMPARAISON MOIS DERNIER */}
        {catComparison.length > 0 && (
          <G style={{ padding: isDesktop ? 18 : 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>📊 Évolution vs mois dernier</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {catComparison.slice(0, 8).map(c => {
                const isUp = c.diff > 0;
                const isFlat = Math.abs(c.diff) < 1;
                return (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", borderRadius: 8, background: "rgba(255,255,255,0.02)" }}>
                    <span style={{ fontSize: 16, width: 24 }}>{c.emoji}</span>
                    <span style={{ fontSize: 12, flex: 1, color: t1 }}>{c.name}</span>
                    <span style={{ fontSize: 11, color: t2, minWidth: 60, textAlign: "right" }}>{fmt(c.previous)} →</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: c.color, minWidth: 60, textAlign: "right" }}>{fmt(c.current)}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: isFlat ? t2 : isUp ? red : green, minWidth: 55, textAlign: "right" }}>
                      {isFlat ? "≈" : isUp ? "↑" : "↓"} {Math.abs(Math.round(c.diffPct))}%
                    </span>
                  </div>
                );
              })}
            </div>
          </G>
        )}
      </>)}

      {/* CHART */}
      {tab === "chart" && (<>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <button onClick={() => setChartView("monthly")} style={pill(chartView === "monthly")}>Mois</button>
          <button onClick={() => setChartView("yearly")} style={pill(chartView === "yearly")}>Année</button>
        </div>

        {/* GRAPHIQUE TRAJECTOIRE OBJECTIF */}
        {trajectory.monthsLeft > 0 && (() => {
          // Construire les données : passé (réel) + futur (projeté + idéal)
          const data = [];
          // Passé : 6 derniers mois de patrimoine réel
          let running = PLATFORMS.reduce((s, p) => s + (initialBalances[p.id] || 0), 0);
          for (let i = 11; i >= 0; i--) {
            const d = new Date(); d.setMonth(d.getMonth() - i);
            const mk = mkey(d);
            allTx.filter(tx => mkey(tx.date) === mk).forEach(tx => {
              if (tx.type === "income") running += tx.amount;
              if (tx.type === "expense") running -= tx.amount;
            });
            data.push({
              name: mshort(mk) + " " + mk.slice(2, 4),
              reel: Math.round(running),
              projete: null,
              ideal: null,
            });
          }
          // Présent : on ajoute la dernière valeur réelle aussi en projete et ideal pour relier les courbes
          const lastReal = data[data.length - 1].reel;
          data[data.length - 1].projete = lastReal;
          data[data.length - 1].ideal = lastReal;

          // Futur : on projette mois par mois jusqu'à décembre 2026
          const today = new Date();
          let projectedRunning = lastReal;
          // Trajectoire idéale : ligne droite vers l'objectif
          const idealStartValue = lastReal;
          const idealEndValue = trajectory.targetGoal;
          const totalMonthsToTarget = trajectory.monthsLeft;

          for (let i = 1; i <= trajectory.monthsLeft; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const mk = mkey(d);
            projectedRunning += trajectory.avgMonthlyNet;
            const idealValue = idealStartValue + (idealEndValue - idealStartValue) * (i / totalMonthsToTarget);
            data.push({
              name: mshort(mk) + " " + mk.slice(2, 4),
              reel: null,
              projete: Math.round(projectedRunning),
              ideal: Math.round(idealValue),
            });
          }

          return (
            <G glow={trajectory.isOnTrack ? green : "#fbbf24"} style={{ padding: isDesktop ? "18px 12px 12px" : "14px 8px 8px", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingLeft: 8, paddingRight: 8, flexWrap: "wrap", gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>🎯 Trajectoire vers {fmt(trajectory.targetGoal)}</div>
                <div style={{ display: "flex", gap: 12, fontSize: 10, color: t2 }}>
                  <span><span style={{ display: "inline-block", width: 12, height: 2, background: vio, marginRight: 4, verticalAlign: "middle" }}></span>Réel</span>
                  <span><span style={{ display: "inline-block", width: 12, height: 2, background: trajectory.isOnTrack ? green : "#fbbf24", marginRight: 4, verticalAlign: "middle", borderTop: `1px dashed ${trajectory.isOnTrack ? green : "#fbbf24"}` }}></span>Projeté</span>
                  <span><span style={{ display: "inline-block", width: 12, height: 2, background: vioBright, marginRight: 4, verticalAlign: "middle", borderTop: `1px dashed ${vioBright}` }}></span>Idéal</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={isDesktop ? 280 : 220}>
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={vio} stopOpacity={0.3} /><stop offset="100%" stopColor={vio} stopOpacity={0} /></linearGradient>
                    <linearGradient id="prg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={trajectory.isOnTrack ? green : "#fbbf24"} stopOpacity={0.2} /><stop offset="100%" stopColor={trajectory.isOnTrack ? green : "#fbbf24"} stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: t2, fontFamily: ff }} axisLine={false} tickLine={false} interval={isDesktop ? 1 : 2} />
                  <YAxis tick={{ fontSize: 10, fill: t2, fontFamily: ff }} axisLine={false} tickLine={false} width={55} />
                  <Tooltip contentStyle={tipStyle} formatter={(value) => value !== null ? fmt(value) : "—"} />
                  <Area type="monotone" dataKey="reel" stroke={vio} fill="url(#rg)" strokeWidth={2.5} connectNulls={false} />
                  <Area type="monotone" dataKey="projete" stroke={trajectory.isOnTrack ? green : "#fbbf24"} fill="url(#prg)" strokeWidth={2} strokeDasharray="6 4" connectNulls={false} />
                  <Area type="monotone" dataKey="ideal" stroke={vioBright} fill="none" strokeWidth={1.5} strokeDasharray="3 3" connectNulls={false} />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ padding: "10px 14px 0", display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr 1fr" : "1fr", gap: 8 }}>
                <div style={{ fontSize: 11, color: t2 }}>
                  📈 Projection au 31/12/2026 : <span style={{ color: trajectory.isOnTrack ? green : "#fbbf24", fontWeight: 600 }}>{fmt(trajectory.projectedAtTarget)}</span>
                </div>
                <div style={{ fontSize: 11, color: t2 }}>
                  💰 Net moyen : <span style={{ color: trajectory.avgMonthlyNet >= 0 ? green : red, fontWeight: 600 }}>{trajectory.avgMonthlyNet >= 0 ? "+" : "-"}{fmt(Math.abs(trajectory.avgMonthlyNet))}/mois</span>
                </div>
                <div style={{ fontSize: 11, color: t2 }}>
                  🎯 Rythme nécessaire : <span style={{ color: vioBright, fontWeight: 600 }}>{fmt(trajectory.neededMonthly)}/mois</span>
                </div>
              </div>
            </G>
          );
        })()}

        <G glow={vio} style={{ padding: isDesktop ? "18px 12px 12px" : "14px 8px 8px", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, paddingLeft: 8 }}>📈 Patrimoine</div>
          <ResponsiveContainer width="100%" height={isDesktop ? 240 : 180}>
            <AreaChart data={patriData}>
              <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={vio} stopOpacity={0.3} /><stop offset="100%" stopColor={vio} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: t2, fontFamily: ff }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: t2, fontFamily: ff }} axisLine={false} tickLine={false} width={50} />
              <Tooltip contentStyle={tipStyle} />
              <Area type="monotone" dataKey="patrimoine" stroke={vio} fill="url(#pg)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </G>
        <G style={{ padding: isDesktop ? "18px 12px 12px" : "14px 8px 8px", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, paddingLeft: 8 }}>Revenus vs Dépenses</div>
          <ResponsiveContainer width="100%" height={isDesktop ? 240 : 180}>
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: t2, fontFamily: ff }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: t2, fontFamily: ff }} axisLine={false} tickLine={false} width={50} />
              <Tooltip contentStyle={tipStyle} />
              <Bar dataKey="revenus" fill={green} radius={[4,4,0,0]} />
              <Bar dataKey="depenses" fill={red} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </G>
        <G style={{ padding: isDesktop ? "18px 12px 12px" : "14px 8px 8px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, paddingLeft: 8 }}>Net mensuel</div>
          <ResponsiveContainer width="100%" height={isDesktop ? 220 : 170}>
            <AreaChart data={chartData}>
              <defs><linearGradient id="ng" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={green} stopOpacity={0.25} /><stop offset="100%" stopColor={green} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: t2, fontFamily: ff }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: t2, fontFamily: ff }} axisLine={false} tickLine={false} width={50} />
              <Tooltip contentStyle={tipStyle} />
              <Area type="monotone" dataKey="net" stroke={green} fill="url(#ng)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </G>
      </>)}

      {/* HEATMAP */}
      {tab === "heatmap" && (<>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: isDesktop ? 17 : 15, fontWeight: 600 }}>📅 Heatmap</div>
          <div style={{ display: "flex", gap: 5 }}>
            {availableYears.map(y => (
              <button key={y} onClick={() => { setHeatmapYear(y); setHeatmapSelectedDate(null); }} style={pill(heatmapYear === y)}>{y}</button>
            ))}
          </div>
        </div>

        {/* TOGGLE MODE : Dépenses / Revenus / Net */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          <button onClick={() => { setHeatmapMode("expense"); setHeatmapSelectedDate(null); }}
            style={pill(heatmapMode === "expense", red)}>📤 Dépenses</button>
          <button onClick={() => { setHeatmapMode("income"); setHeatmapSelectedDate(null); }}
            style={pill(heatmapMode === "income", green)}>📥 Revenus</button>
          <button onClick={() => { setHeatmapMode("net"); setHeatmapSelectedDate(null); }}
            style={pill(heatmapMode === "net", vio)}>⚖️ Net (bénéfice/déficit)</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(4, 1fr)" : "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <G style={{ padding: "12px 14px" }}>
            <div style={{ fontSize: 10, color: t2, textTransform: "uppercase", letterSpacing: 1 }}>
              {heatmapMode === "expense" ? `Dépenses ${heatmapYear}` : heatmapMode === "income" ? `Revenus ${heatmapYear}` : `Net ${heatmapYear}`}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: heatmapMode === "expense" ? red : heatmapMode === "income" ? green : (heatmapStats.total >= 0 ? green : red) }}>
              {heatmapMode === "net" && heatmapStats.total >= 0 ? "+" : ""}{fmt(heatmapStats.total)}
            </div>
          </G>
          <G style={{ padding: "12px 14px" }}>
            <div style={{ fontSize: 10, color: t2, textTransform: "uppercase", letterSpacing: 1 }}>Jours actifs</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: vio }}>{heatmapStats.daysWithExp}j</div>
          </G>
          <G style={{ padding: "12px 14px" }}>
            <div style={{ fontSize: 10, color: t2, textTransform: "uppercase", letterSpacing: 1 }}>Moy / jour actif</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: t1 }}>{fmt(heatmapStats.avgPerDay)}</div>
          </G>
          <G style={{ padding: "12px 14px", cursor: heatmapStats.maxDay ? "pointer" : "default" }} onClick={() => heatmapStats.maxDay && setHeatmapSelectedDate(heatmapStats.maxDay)}>
            <div style={{ fontSize: 10, color: t2, textTransform: "uppercase", letterSpacing: 1 }}>
              {heatmapMode === "expense" ? "Pire journée" : heatmapMode === "income" ? "Meilleure journée" : "Top journée"}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fbbf24" }}>
              {heatmapStats.maxDay ? `${new Date(heatmapStats.maxDay).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} • ${fmt(heatmapStats.maxDayAmount)}` : "—"}
            </div>
          </G>
        </div>

        <G style={{ padding: 16, marginBottom: 12 }}>
          <Heatmap allTx={allTx} year={heatmapYear} onCellClick={setHeatmapSelectedDate} selectedDate={heatmapSelectedDate} t2={t2} mode={heatmapMode} />
        </G>

        {heatmapSelectedDate && (
          <G style={{ padding: 14 }} glow={vio}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {new Date(heatmapSelectedDate).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </div>
              <button onClick={() => setHeatmapSelectedDate(null)} style={{ background: "none", border: "none", color: t2, cursor: "pointer", fontSize: 14 }}>✕</button>
            </div>
            {selectedDayTx.length === 0 && <div style={{ fontSize: 12, color: t2, textAlign: "center", padding: 12 }}>Aucune transaction ce jour-là</div>}
            {selectedDayTx.map(tx => <TxRow key={tx.id} tx={tx} />)}
          </G>
        )}

        {!heatmapSelectedDate && (
          <div style={{ fontSize: 11, color: t2, textAlign: "center", marginTop: 10 }}>
            💡 Clique sur un carré pour voir le détail de ce jour
          </div>
        )}
      </>)}

      {/* FLUX (SANKEY) */}
      {tab === "flux" && (<>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontSize: isDesktop ? 17 : 15, fontWeight: 600 }}>🌊 Flux d'argent</div>
            <div style={{ fontSize: 11, color: t2, marginTop: 2 }}>D'où vient ton argent et où il va</div>
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            <button onClick={() => setSankeyPeriod("month")} style={pill(sankeyPeriod === "month")}>Mois en cours</button>
            <button onClick={() => setSankeyPeriod("3months")} style={pill(sankeyPeriod === "3months")}>3 derniers mois</button>
            <button onClick={() => setSankeyPeriod("all")} style={pill(sankeyPeriod === "all")}>Depuis le début</button>
          </div>
        </div>

        {/* Stats récap */}
        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "1fr", gap: 10, marginBottom: 14 }}>
          {(() => {
            const today = new Date();
            let startDate;
            if (sankeyPeriod === "month") startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            else if (sankeyPeriod === "3months") startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
            else startDate = new Date(2000, 0, 1);
            const filtered = allTx.filter(tx => new Date(tx.date) >= startDate);
            const inc = filtered.filter(tx => tx.type === "income").reduce((s, tx) => s + tx.amount, 0);
            const exp = filtered.filter(tx => tx.type === "expense").reduce((s, tx) => s + tx.amount, 0);
            const tr = filtered.filter(tx => tx.type === "transfer").reduce((s, tx) => s + tx.amount, 0);
            return (
              <>
                <G glow={green} style={{ padding: "12px 16px" }}>
                  <div style={{ fontSize: 10, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>📥 Total reçu</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: green }}>+{fmt(inc)}</div>
                </G>
                <G glow={red} style={{ padding: "12px 16px" }}>
                  <div style={{ fontSize: 10, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>📤 Total dépensé</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: red }}>-{fmt(exp)}</div>
                </G>
                <G glow={vio} style={{ padding: "12px 16px" }}>
                  <div style={{ fontSize: 10, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>↔ Transferts internes</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: vio }}>{fmt(tr)}</div>
                </G>
              </>
            );
          })()}
        </div>

        <G glow={vio} style={{ padding: isDesktop ? 20 : 12 }}>
          <SankeyDiagram allTx={allTx} period={sankeyPeriod} t1={t1} t2={t2} vio={vio} green={green} red={red} purple={purple} />
        </G>

        {/* Légende */}
        <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)", fontSize: 11, color: t2 }}>
          <div style={{ fontWeight: 600, color: t1, marginBottom: 6 }}>💡 Comment lire ce diagramme ?</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div>• <span style={{ color: green, fontWeight: 600 }}>À gauche</span> : les sources de tes revenus (Rainbet, YouTube, etc.)</div>
            <div>• <span style={{ color: vioBright, fontWeight: 600 }}>Au milieu</span> : tes comptes (Revolut, Phantom, etc.) — l'argent transite par eux</div>
            <div>• <span style={{ color: red, fontWeight: 600 }}>À droite</span> : tes dépenses totales</div>
            <div>• Les <span style={{ color: vio, fontWeight: 600 }}>traits violets</span> entre comptes = transferts internes</div>
            <div>• Survole un trait ou un bloc pour voir le détail</div>
          </div>
        </div>
      </>)}

      {/* SUBS */}
      {tab === "subs" && (<>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: isDesktop ? 17 : 15, fontWeight: 600 }}>🔄 Abonnements</div>
            <div style={{ fontSize: 12, color: t2 }}>{subsStats.activeCount} actif{subsStats.activeCount > 1 ? "s" : ""} sur {subsStats.totalCount}</div>
          </div>
          <button onClick={() => { setEditingSub(null); setSf({ name: "", amount: "", platform: "revolut", day: 1 }); setModal("sub"); }} style={{ background: vio + "20", color: vio, border: `1px solid ${vio}40`, borderRadius: 10, padding: "8px 16px", cursor: "pointer", fontFamily: ff, fontSize: 12, fontWeight: 600 }}>+ Ajouter</button>
        </div>

        {/* CARDS STATS RICHES */}
        {subsStats.activeCount > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(4, 1fr)" : "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <G glow={vio} style={{ padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>💰 Mensuel</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: vio }}>{fmt(subsStats.monthly)}</div>
            </G>
            <G style={{ padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>📅 Annuel</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: t1 }}>{fmt(subsStats.yearly)}</div>
            </G>
            <G style={{ padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>🔢 Actifs</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: t1 }}>{subsStats.activeCount}</div>
            </G>
            {subsStats.mostExpensive && (
              <G style={{ padding: "12px 14px" }}>
                <div style={{ fontSize: 10, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>💸 Plus cher</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: red, lineHeight: 1.2 }}>{subsStats.mostExpensive.name}</div>
                <div style={{ fontSize: 11, color: t2, marginTop: 2 }}>{fmt2(subsStats.mostExpensive.amount)}</div>
              </G>
            )}
          </div>
        )}

        {subs.length === 0 && <G style={{ padding: 28, textAlign: "center" }}><span style={{ color: t2 }}>Aucun abonnement</span></G>}

        <div style={{ display: isDesktop ? "grid" : "block", gridTemplateColumns: isDesktop ? "1fr 1fr" : undefined, gap: isDesktop ? 8 : 0 }}>
          {subs.map(s => {
            const p = PLATFORMS.find(pl => pl.id === s.platform);
            const days = s.active ? daysUntilNext(s.day) : null;
            const debitColor = s.active ? getNextDebitColor(days) : t2;
            return (
              <G key={s.id} style={{ padding: "12px 14px", marginBottom: isDesktop ? 0 : 5, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: s.active ? 1 : 0.4 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>🔄 {s.name}</span>
                    <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: p?.color + "10", color: p?.color }}>{p?.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, color: t2 }}>Le {s.day}/mois</span>
                    {s.active && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: debitColor, padding: "1px 6px", borderRadius: 4, background: debitColor + "15", border: `1px solid ${debitColor}30` }}>
                        {days <= 1 ? "🔔 " : ""}{formatNextDebit(days)}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: red }}>-{fmt2(s.amount)}</span>
                  <button onClick={() => toggleSub(s.id)} style={{ width: 36, height: 22, borderRadius: 11, border: "none", cursor: "pointer", position: "relative", background: s.active ? green : "rgba(255,255,255,0.06)" }}><div style={{ width: 16, height: 16, borderRadius: 8, background: "#fff", position: "absolute", top: 3, left: s.active ? 17 : 3, transition: "left 0.2s" }} /></button>
                  <button onClick={() => startEditSub(s)} title="Modifier" style={{ background: "none", border: "none", color: vio + "80", cursor: "pointer", fontSize: 13, padding: 2 }}>🖌️</button>
                  {confirmDelSub === s.id ? (
                    <div style={{ display: "flex", gap: 3 }}>
                      <button onClick={() => delSub(s.id)} style={{ background: red, border: "none", borderRadius: 5, color: "#fff", fontSize: 10, padding: "4px 8px", cursor: "pointer", fontFamily: ff }}>Oui</button>
                      <button onClick={() => setConfirmDelSub(null)} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 5, color: t2, fontSize: 10, padding: "4px 8px", cursor: "pointer", fontFamily: ff }}>Non</button>
                    </div>
                  ) : <button onClick={() => setConfirmDelSub(s.id)} style={{ background: "none", border: "none", color: t2 + "30", cursor: "pointer", fontSize: 13 }}>🗑</button>}
                </div>
              </G>
            );
          })}
        </div>
      </>)}

      {/* REFUNDS */}
      {tab === "refunds" && (<>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div><div style={{ fontSize: isDesktop ? 17 : 15, fontWeight: 600 }}>💸 Remboursements</div><div style={{ fontSize: 12, color: t2 }}>{pendingRefunds.length} en attente — {fmt(totalPendingRefunds)}</div></div>
          <button onClick={() => setModal("refund")} style={{ background: "#fbbf24" + "20", color: "#fbbf24", border: `1px solid #fbbf2440`, borderRadius: 10, padding: "8px 16px", cursor: "pointer", fontFamily: ff, fontSize: 12, fontWeight: 600 }}>+ Ajouter</button>
        </div>
        {refunds.length === 0 && <G style={{ padding: 28, textAlign: "center" }}><span style={{ color: t2 }}>Aucun remboursement en attente 🎉</span></G>}
        <div style={{ display: isDesktop ? "grid" : "block", gridTemplateColumns: isDesktop ? "1fr 1fr" : undefined, gap: isDesktop ? 8 : 0 }}>
          {refunds.map(r => (
            <G key={r.id} style={{ padding: "12px 14px", marginBottom: isDesktop ? 0 : 5, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: r.resolved ? 0.4 : 1 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{r.resolved ? "✅" : "⏳"} {r.label}</span>
                </div>
                <div style={{ fontSize: 10, color: t2 }}>{new Date(r.date).toLocaleDateString("fr-FR")}{r.resolved_date ? ` → remboursé le ${new Date(r.resolved_date).toLocaleDateString("fr-FR")}` : ""}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: r.resolved ? green : "#fbbf24" }}>{fmt2(r.amount)}</span>
                {!r.resolved && <button onClick={() => resolveRefund(r.id)} style={{ background: green + "20", color: green, border: `1px solid ${green}40`, borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontFamily: ff, fontSize: 10, fontWeight: 600 }}>✓ Reçu</button>}
                <button onClick={() => delRefund(r.id)} style={{ background: "none", border: "none", color: t2 + "30", cursor: "pointer", fontSize: 13 }}>🗑</button>
              </div>
            </G>
          ))}
        </div>
      </>)}
    </>
  );

  // ============== RENDER ROOT ==============
  if (isDesktop) {
    return (
      <div style={{ background: bg, color: t1, fontFamily: ff, minHeight: "100vh", fontSize: 13, display: "flex" }}>
        {/* SIDEBAR DESKTOP */}
        <div style={{ width: 240, minHeight: "100vh", background: "rgba(255,255,255,0.015)", borderRight: "1px solid rgba(255,255,255,0.05)", padding: "24px 16px", display: "flex", flexDirection: "column", position: "sticky", top: 0, alignSelf: "flex-start", height: "100vh", boxSizing: "border-box" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: vioBright, textShadow: `0 0 24px ${vio}50`, marginBottom: 32, paddingLeft: 4 }}>⚡ Tracker</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
            {navItems.map(([k, ico, l]) => {
              const active = tab === k;
              return (
                <button key={k} onClick={() => setTab(k)} style={{
                  background: active ? vio + "15" : "transparent",
                  border: `1px solid ${active ? vio + "35" : "transparent"}`,
                  color: active ? vioBright : t2,
                  fontSize: 13, fontWeight: active ? 600 : 500,
                  padding: "10px 14px", borderRadius: 10, cursor: "pointer", fontFamily: ff,
                  textAlign: "left", display: "flex", alignItems: "center", gap: 10,
                  boxShadow: active ? `0 0 16px ${vio}15` : "none", transition: "all 0.15s",
                }}>
                  <span style={{ fontSize: 15 }}>{ico}</span>{l}
                </button>
              );
            })}
          </div>

          {streak > 0 && (
            <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, background: vio + "08", border: `1px solid ${vio}20`, textAlign: "center" }}>
              <div style={{ fontSize: 9, color: t2, textTransform: "uppercase", letterSpacing: 1.2 }}>🔥 Streak</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: vio }}>{streak} jours</div>
            </div>
          )}

          {/* Patrimoine + objectif en bas de la sidebar */}
          <G glow={vio} style={{ padding: 14 }}>
            <div style={{ fontSize: 9, color: t2, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>Patrimoine</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: totalEur < 0 ? red : t1, marginBottom: 10, lineHeight: 1.1 }}>{fmtSigned(totalEur)}</div>
            <div style={{ fontSize: 9, color: t2, marginBottom: 4 }}>🎯 Objectif {fmt(goal)}</div>
            <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${goalPct}%`, background: `linear-gradient(90deg, ${purple}, ${vioBright}, #e879f9)`, boxShadow: `0 0 12px ${vio}60`, transition: "width 0.8s" }} />
            </div>
            <div style={{ textAlign: "right", marginTop: 4, fontSize: 11, fontWeight: 600, color: vioBright }}>{goalPct.toFixed(1)}%</div>
          </G>

          <button onClick={exportCSV} style={{ marginTop: 10, padding: "8px 12px", borderRadius: 10, background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: t2, fontSize: 11, fontFamily: ff, cursor: "pointer" }}>↓ Export CSV</button>
          <button onClick={toggleMute} style={{ marginTop: 6, padding: "8px 12px", borderRadius: 10, background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: muted ? red : t2, fontSize: 11, fontFamily: ff, cursor: "pointer" }}>
            {muted ? "🔇 Sons coupés" : "🔊 Sons activés"}
          </button>
        </div>

        {/* CONTENU PRINCIPAL DESKTOP */}
        <div style={{ flex: 1, padding: "28px 32px", maxWidth: 1280, margin: "0 auto", boxSizing: "border-box", width: "100%" }}>

          {/* PLATEFORMES en grille 6 cols */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 10, marginBottom: 24 }}>
            {PLATFORMS.map(p => (
              <G key={p.id} glow={editBal === p.id ? p.color : null}
                onClick={() => { if (editBal === p.id) return; setEditBal(p.id); setEditBalVal(String(initialBalances[p.id] || 0)); }}
                style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: p.color + "18", color: p.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>{p.icon}</div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: t1 }}>{p.name}</span>
                </div>
                {editBal === p.id ? (
                  <input type="number" value={editBalVal} onChange={e => setEditBalVal(e.target.value)} autoFocus style={{ ...inputStyle, fontSize: 13, padding: "6px 10px" }}
                    onKeyDown={e => { if (e.key === "Enter") saveBal(p.id); if (e.key === "Escape") setEditBal(null); }} onBlur={() => saveBal(p.id)} />
                ) : <div style={{ fontWeight: 700, fontSize: 18, color: balances[p.id] < 0 ? red : t1 }}>{fmtSigned(balances[p.id])}</div>}
              </G>
            ))}
          </div>

          {renderTab()}
        </div>

        {/* BOTTOM BUTTONS */}
        <div style={{ position: "fixed", bottom: 20, right: 32, display: "flex", gap: 8, zIndex: 50 }}>
          {[["expense","− Dépense",red],["income","+ Revenu",green],["transfer","↔ Transfert",purple]].map(([type,label,color]) => (
            <button key={type} onClick={() => { uf("type", type); setEditTx(null); setModal("tx"); }}
              style={{ background: color + "18", color, border: `1px solid ${color}35`, borderRadius: 12, padding: "12px 18px", cursor: "pointer", fontSize: 13, fontFamily: ff, fontWeight: 600, boxShadow: `0 0 20px ${color}20`, backdropFilter: "blur(10px)" }}>
              {label}
            </button>
          ))}
        </div>

        {renderModals()}
      </div>
    );
  }

  // ============== MOBILE RENDER (inchangé) ==============
  return (
    <div style={{ background: bg, color: t1, fontFamily: ff, minHeight: "100vh", fontSize: 13, paddingBottom: 90, maxWidth: 900, margin: "0 auto" }}>

      {/* HEADER */}
      <div style={{ padding: "16px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: vioBright, textShadow: `0 0 24px ${vio}50` }}>⚡ Tracker</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {streak > 0 && <div style={{ padding: "3px 8px", borderRadius: 10, background: vio + "12", border: `1px solid ${vio}25`, fontSize: 11, fontWeight: 600, color: vio }}>🔥 {streak}j</div>}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: t2, textTransform: "uppercase", letterSpacing: 1.5 }}>Patrimoine</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: totalEur < 0 ? red : t1 }}>{fmtSigned(totalEur)}</div>
          </div>
        </div>
      </div>

      {/* GOAL */}
      <div style={{ padding: "10px 16px 0" }}>
        <G style={{ padding: "12px 14px" }} glow={vio}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: t2 }}>🎯 Objectif</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: vioBright }}>{fmtSigned(totalEur)} / {fmt(goal)}</span>
          </div>
          <div style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 5, width: `${goalPct}%`, background: `linear-gradient(90deg, ${purple}, ${vioBright}, #e879f9)`, boxShadow: `0 0 16px ${vio}70`, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
          </div>
          <div style={{ textAlign: "right", marginTop: 3, fontSize: 11, fontWeight: 600, color: vioBright }}>{goalPct.toFixed(1)}%</div>
        </G>
      </div>

      {/* PLATFORMS */}
      <div style={{ padding: "10px 16px", display: "flex", gap: 7, overflowX: "auto", scrollbarWidth: "none" }}>
        {PLATFORMS.map(p => (
          <G key={p.id} glow={editBal === p.id ? p.color : null}
            onClick={() => { if (editBal === p.id) return; setEditBal(p.id); setEditBalVal(String(initialBalances[p.id] || 0)); }}
            style={{ minWidth: 120, padding: "12px 14px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: p.color + "18", color: p.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>{p.icon}</div>
              <span style={{ fontSize: 12, fontWeight: 500, color: t1 }}>{p.name}</span>
            </div>
            {editBal === p.id ? (
              <input type="number" value={editBalVal} onChange={e => setEditBalVal(e.target.value)} autoFocus style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }}
                onKeyDown={e => { if (e.key === "Enter") saveBal(p.id); if (e.key === "Escape") setEditBal(null); }} onBlur={() => saveBal(p.id)} />
            ) : <div style={{ fontWeight: 600, fontSize: 16, color: balances[p.id] < 0 ? red : t1 }}>{fmtSigned(balances[p.id])}</div>}
          </G>
        ))}
      </div>

      {/* TABS */}
      <div style={{ padding: "0 16px 8px", display: "flex", gap: 5, overflowX: "auto", scrollbarWidth: "none" }}>
        {[["home","Accueil"],["details","Détails"],["chart","Évolution"],["heatmap","📅 Heatmap"],["flux","🌊 Flux"],["subs","Abos"],["refunds","💸 Remb."]].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={pill(tab === k)}>{l}</button>
        ))}
        <button onClick={toggleMute} style={{ ...pill(false), marginLeft: "auto", fontSize: 11, color: muted ? red : t2 }}>{muted ? "🔇" : "🔊"}</button>
        <button onClick={exportCSV} style={{ ...pill(false), fontSize: 11 }}>↓ CSV</button>
      </div>

      <div style={{ padding: "0 16px" }}>
        {renderTab()}
      </div>

      {/* BOTTOM BUTTONS */}
      <div style={{ position: "fixed", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6, zIndex: 50, maxWidth: 400 }}>
        {[["expense","− Dépense",red],["income","+ Revenu",green],["transfer","↔ Transfert",purple]].map(([type,label,color]) => (
          <button key={type} onClick={() => { uf("type", type); setEditTx(null); setModal("tx"); }}
            style={{ background: color + "18", color, border: `1px solid ${color}35`, borderRadius: 12, padding: "10px 16px", cursor: "pointer", fontSize: 12, fontFamily: ff, fontWeight: 600, boxShadow: `0 0 16px ${color}15` }}>
            {label}
          </button>
        ))}
      </div>

      {renderModals()}
    </div>
  );

  // ============== MODALS (partagés) ==============
  function renderModals() {
    return (
      <>
        {/* MODAL TX */}
        {modal === "tx" && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)", display: "flex", alignItems: isDesktop ? "center" : "flex-end", justifyContent: "center", zIndex: 100 }} onClick={() => { setModal(null); setEditTx(null); }}>
            <div style={{ background: "#0a0a10", borderRadius: isDesktop ? 18 : "18px 18px 0 0", border: "1px solid rgba(255,255,255,0.07)", borderBottom: isDesktop ? "1px solid rgba(255,255,255,0.07)" : "none", padding: "18px 16px 28px", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
              {!isDesktop && <div style={{ width: 30, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", margin: "0 auto 12px" }} />}

              {!editTx && lastTx && (
                <button onClick={redoLast} style={{ width: "100%", padding: "9px 12px", borderRadius: 10, background: vio + "08", border: `1px solid ${vio}20`, cursor: "pointer", fontFamily: ff, fontSize: 12, color: vio, marginBottom: 12, textAlign: "left", display: "flex", justifyContent: "space-between" }}>
                  <span>🔁 {lastTx.note || [...EXP_CATS,...INC_CATS].find(c => c.id === (lastTx.category || lastTx.inc_category))?.name} — {fmt2(lastTx.amount)}</span><span style={{ opacity: 0.5 }}>→</span>
                </button>
              )}

              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, textAlign: "center" }}>
                {editTx ? "✏️ Modifier" : f.type === "expense" ? "➖ Dépense" : f.type === "income" ? "➕ Revenu" : "↔ Transfert"}
              </div>

              <NumPad
                value={f.amount}
                onChange={(v) => uf("amount", v)}
                color={f.type === "expense" ? red : f.type === "income" ? green : purple}
                muted={muted}
              />

              <div style={{ marginTop: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>{f.type === "transfer" ? "De" : "Plateforme"}</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {PLATFORMS.map(p => (
                    <button key={p.id} onClick={() => uf("platform", p.id)}
                      style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${f.platform === p.id ? p.color + "50" : "rgba(255,255,255,0.05)"}`, background: f.platform === p.id ? p.color + "12" : "transparent", color: f.platform === p.id ? p.color : t2, fontSize: 12, cursor: "pointer", fontFamily: ff, fontWeight: 600 }}>
                      {p.icon} {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {f.type === "transfer" && (<>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Vers</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {PLATFORMS.filter(p => p.id !== f.platform).map(p => (
                      <button key={p.id} onClick={() => uf("to", p.id)}
                        style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${f.to === p.id ? p.color + "50" : "rgba(255,255,255,0.05)"}`, background: f.to === p.id ? p.color + "12" : "transparent", color: f.to === p.id ? p.color : t2, fontSize: 12, cursor: "pointer", fontFamily: ff, fontWeight: 600 }}>
                        {p.icon} {p.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}><div style={{ fontSize: 10, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Frais (optionnel)</div><input type="number" value={f.fees} onChange={e => uf("fees", e.target.value)} placeholder="0" style={inputStyle} /></div>
              </>)}

              {f.type === "expense" && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Catégorie</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 5 }}>
                    {EXP_CATS.map(c => (
                      <button key={c.id} onClick={() => uf("category", c.id)}
                        style={{ padding: "8px 3px", borderRadius: 10, border: `1px solid ${f.category === c.id ? c.color + "50" : "rgba(255,255,255,0.05)"}`, background: f.category === c.id ? c.color + "12" : "transparent", color: f.category === c.id ? c.color : t2, fontSize: 10, cursor: "pointer", fontFamily: ff, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <span style={{ fontSize: 17 }}>{c.emoji}</span>{c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* CASE À COCHER ABO RÉCURRENT (uniquement si dépense + catégorie abo + pas en mode édition) */}
              {f.type === "expense" && f.category === "abonnement" && !editTx && (
                <div onClick={() => uf("makeRecurring", !f.makeRecurring)}
                  style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, background: f.makeRecurring ? vio + "10" : "rgba(255,255,255,0.025)", border: `1px solid ${f.makeRecurring ? vio + "35" : "rgba(255,255,255,0.06)"}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 5,
                    border: `1.5px solid ${f.makeRecurring ? vio : t2}`,
                    background: f.makeRecurring ? vio : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 13, fontWeight: 700,
                  }}>
                    {f.makeRecurring && "✓"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: f.makeRecurring ? vio : t1 }}>🔄 En faire un abonnement récurrent</div>
                    <div style={{ fontSize: 10, color: f.makeRecurring && !f.note ? "#fbbf24" : t2, marginTop: 2 }}>
                      {f.makeRecurring
                        ? (f.note ? `Sera débité auto chaque ${new Date(f.date).getDate()} du mois` : "⚠️ Ajoute une note (nom de l'abo) pour activer")
                        : "One-shot, pas de récurrence"}
                    </div>
                  </div>
                </div>
              )}

              {f.type === "income" && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Source</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 5 }}>
                    {INC_CATS.map(c => (
                      <button key={c.id} onClick={() => uf("incCategory", c.id)}
                        style={{ padding: "8px 3px", borderRadius: 10, border: `1px solid ${f.incCategory === c.id ? c.color + "50" : "rgba(255,255,255,0.05)"}`, background: f.incCategory === c.id ? c.color + "12" : "transparent", color: f.incCategory === c.id ? c.color : t2, fontSize: 10, cursor: "pointer", fontFamily: ff, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <span style={{ fontSize: 17 }}>{c.emoji}</span>{c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <div style={{ flex: 1 }}><div style={{ fontSize: 10, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Date</div><input type="date" value={f.date} onChange={e => uf("date", e.target.value)} style={inputStyle} /></div>
                <div style={{ flex: 2 }}><div style={{ fontSize: 10, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Note</div><input value={f.note} onChange={e => uf("note", e.target.value)} placeholder="Optionnel... (écris 'elea' pour tracker)" style={inputStyle} /></div>
              </div>

              <button onClick={submit} style={{
                width: "100%", padding: "14px", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: ff, fontSize: 15, fontWeight: 600, color: "#fff",
                background: `linear-gradient(135deg, ${f.type === "expense" ? red : f.type === "income" ? green : purple}, ${f.type === "expense" ? "#dc2626" : f.type === "income" ? "#059669" : "#7c3aed"})`,
              }}>
                {editTx ? "Sauvegarder" : f.type === "transfer" ? "Transférer" : "Ajouter"}
              </button>
            </div>
          </div>
        )}

        {/* MODAL SUB */}
        {modal === "sub" && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)", display: "flex", alignItems: isDesktop ? "center" : "flex-end", justifyContent: "center", zIndex: 100 }} onClick={() => { setModal(null); setEditingSub(null); setSf({ name: "", amount: "", platform: "revolut", day: 1 }); }}>
            <div style={{ background: "#0a0a10", borderRadius: isDesktop ? 18 : "18px 18px 0 0", border: "1px solid rgba(255,255,255,0.07)", borderBottom: isDesktop ? "1px solid rgba(255,255,255,0.07)" : "none", padding: "18px 16px 28px", width: "100%", maxWidth: 480 }} onClick={e => e.stopPropagation()}>
              {!isDesktop && <div style={{ width: 30, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", margin: "0 auto 12px" }} />}
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, textAlign: "center" }}>{editingSub ? "🖌️ Modifier l'abonnement" : "🔄 Nouvel abonnement"}</div>
              <div style={{ marginBottom: 10 }}><div style={{ fontSize: 10, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Nom</div><input value={sf.name} onChange={e => usf("name", e.target.value)} placeholder="Netflix, Spotify..." autoFocus style={inputStyle} /></div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1 }}><div style={{ fontSize: 10, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>€/mois</div><input type="number" value={sf.amount} onChange={e => usf("amount", e.target.value)} placeholder="9.99" style={inputStyle} /></div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 10, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Jour</div><input type="number" min="1" max="31" value={sf.day} onChange={e => usf("day", e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Plateforme</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {PLATFORMS.map(p => (<button key={p.id} onClick={() => usf("platform", p.id)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${sf.platform === p.id ? p.color + "50" : "rgba(255,255,255,0.05)"}`, background: sf.platform === p.id ? p.color + "12" : "transparent", color: sf.platform === p.id ? p.color : t2, fontSize: 12, cursor: "pointer", fontFamily: ff, fontWeight: 600 }}>{p.icon} {p.name}</button>))}
                </div>
              </div>
              <button onClick={addSub} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: ff, fontSize: 15, fontWeight: 600, color: "#fff", background: `linear-gradient(135deg, ${vio}, ${purple})` }}>{editingSub ? "Sauvegarder" : "Ajouter"}</button>
            </div>
          </div>
        )}

        {/* MODAL REFUND */}
        {modal === "refund" && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)", display: "flex", alignItems: isDesktop ? "center" : "flex-end", justifyContent: "center", zIndex: 100 }} onClick={() => setModal(null)}>
            <div style={{ background: "#0a0a10", borderRadius: isDesktop ? 18 : "18px 18px 0 0", border: "1px solid rgba(255,255,255,0.07)", borderBottom: isDesktop ? "1px solid rgba(255,255,255,0.07)" : "none", padding: "18px 16px 28px", width: "100%", maxWidth: 480 }} onClick={e => e.stopPropagation()}>
              {!isDesktop && <div style={{ width: 30, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", margin: "0 auto 12px" }} />}
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, textAlign: "center" }}>💸 Nouveau remboursement</div>
              <div style={{ marginBottom: 10 }}><div style={{ fontSize: 10, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Qui / Quoi</div><input value={refundForm.label} onChange={e => setRefundForm(p => ({ ...p, label: e.target.value }))} placeholder="Amazon, Jonathan..." autoFocus style={inputStyle} /></div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1 }}><div style={{ fontSize: 10, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Montant (€)</div><input type="number" value={refundForm.amount} onChange={e => setRefundForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" style={inputStyle} /></div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 10, color: t2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Date</div><input type="date" value={refundForm.date} onChange={e => setRefundForm(p => ({ ...p, date: e.target.value }))} style={inputStyle} /></div>
              </div>
              <button onClick={addRefund} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: ff, fontSize: 15, fontWeight: 600, color: "#fff", background: `linear-gradient(135deg, #fbbf24, #f59e0b)` }}>Ajouter</button>
            </div>
          </div>
        )}
      </>
    );
  }
}
