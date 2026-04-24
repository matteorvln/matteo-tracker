'use client'
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
];

const INC_CATS = [
  { id: "celsius", name: "Celsius", emoji: "🎰", color: "#fbbf24" },
  { id: "rainbet_video", name: "Rainbet", emoji: "🎬", color: "#34d399" },
  { id: "rainbet_gains", name: "RB Gains", emoji: "🎲", color: "#4ade80" },
  { id: "mobilfox", name: "Mobilfox", emoji: "📱", color: "#818cf8" },
  { id: "tiktok_fr", name: "TikTok FR", emoji: "🇫🇷", color: "#f87171" },
  { id: "unfamous", name: "Unfamous", emoji: "👕", color: "#c084fc" },
  { id: "collaboration", name: "Collab", emoji: "🤝", color: "#22d3ee" },
  { id: "snapchat", name: "Snapchat", emoji: "👻", color: "#facc15" },
];

const GOAL = 200000;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fmt = (n) => `${Math.abs(n).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€`;
const fmt2 = (n) => `${Math.abs(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`;
const mkey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`; };
const MN = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];
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

function genRec(subs, mk) {
  const [y, m] = mk.split("-").map(Number);
  return subs.filter(s => s.active && mk >= mkey(s.start_date)).map(s => {
    const day = Math.min(s.day || 1, new Date(y, m, 0).getDate());
    return { id: `rec-${s.id}-${mk}`, type: "expense", amount: Number(s.amount), platform: s.platform, category: "abonnement", note: `🔄 ${s.name}`, date: `${y}-${String(m).padStart(2,"0")}-${String(day).padStart(2,"0")}`, is_recurring: true };
  });
}

function Donut({ data, size = 130 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <svg width={size} height={size} viewBox="0 0 130 130"><circle cx="65" cy="65" r="48" fill="none" stroke="#ffffff06" strokeWidth="14" /><text x="65" y="69" textAnchor="middle" fill="#475569" fontSize="12" fontFamily="inherit">0€</text></svg>;
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

export default function App() {
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
  const [refundForm, setRefundForm] = useState({ label: "", amount: "", date: new Date().toISOString().split("T")[0] });

  const [f, setF] = useState({ type: "expense", amount: "", platform: "revolut", category: "quotidien", incCategory: "rainbet_video", note: "", date: new Date().toISOString().split("T")[0], to: "phantom", fees: "" });
  const uf = (k, v) => setF(p => ({ ...p, [k]: v }));
  const [sf, setSf] = useState({ name: "", amount: "", platform: "revolut", day: 1 });
  const usf = (k, v) => setSf(p => ({ ...p, [k]: v }));

  const prevPctRef = useRef(0);

  // ─── LOAD ALL DATA FROM SUPABASE ───
  useEffect(() => { loadAll(); }, []);

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

  const bg = "#050508", t1 = "#e2e8f0", t2 = "#475569", vio = "#a78bfa", vioBright = "#c4b5fd", green = "#34d399", red = "#f47260", purple = "#8b5cf6";
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
    if (search) {
      const q = search.toLowerCase();
      txs = txs.filter(tx => {
        const cat = [...EXP_CATS, ...INC_CATS].find(c => c.id === (tx.category || tx.inc_category));
        const p = PLATFORMS.find(pl => pl.id === tx.platform);
        return (tx.note || "").toLowerCase().includes(q) || (cat?.name || "").toLowerCase().includes(q) || (p?.name || "").toLowerCase().includes(q);
      });
    }
    return sortBy === "amount" ? txs.sort((a, b) => b.amount - a.amount) : txs.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [allTx, month, pFilter, search, sortBy, eleaFilter]);

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
    let exp = 0;
    allTx.filter(tx => mkey(tx.date) === pmk).forEach(tx => { if (tx.type === "expense") exp += tx.amount; });
    return { exp };
  }, [allTx, month]);

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

  const eleaTotal = useMemo(() => {
    return allTx.filter(tx => mkey(tx.date) === month && (tx.note || "").toLowerCase().includes("elea")).reduce((s, tx) => s + tx.amount, 0);
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

  const shiftMonth = (d) => { const [y, m] = month.split("-").map(Number); setMonth(mkey(new Date(y, m - 1 + d, 1))); };

  // ─── SUPABASE ACTIONS ───
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
    }
    setF(p => ({ ...p, amount: "", note: "", fees: "" })); setModal(null);
    await loadAll();
  };

  const startEdit = (tx) => {
    setF({ type: tx.type, amount: String(tx.amount), platform: tx.platform, category: tx.category || "quotidien", incCategory: tx.inc_category || "rainbet_video", note: tx.note || "", date: tx.date, to: tx.to || "phantom", fees: tx.fees ? String(tx.fees) : "" });
    setEditTx(tx.id); setModal("tx");
  };
  const redoLast = () => {
    if (!lastTx) return;
    setF({ type: lastTx.type, amount: String(lastTx.amount), platform: lastTx.platform, category: lastTx.category || "quotidien", incCategory: lastTx.inc_category || "rainbet_video", note: lastTx.note || "", date: new Date().toISOString().split("T")[0], to: lastTx.to || "phantom", fees: lastTx.fees ? String(lastTx.fees) : "" });
    setEditTx(null); setModal("tx");
  };

  const del = async (id) => { await supabase.from('transactions').delete().eq('id', id); setConfirmDel(null); await loadAll(); };
  const saveBal = async (pid) => {
    const val = parseFloat(editBalVal) || 0;
    await supabase.from('initial_balances').upsert({ platform: pid, amount: val });
    setEditBal(null); await loadAll();
  };
  const addSub = async () => {
    const a = parseFloat(sf.amount); if (!a || !sf.name) return;
    await supabase.from('subscriptions').insert({ id: uid(), name: sf.name, amount: a, platform: sf.platform, day: parseInt(sf.day) || 1, active: true, start_date: new Date().toISOString().split("T")[0] });
    setSf({ name: "", amount: "", platform: "revolut", day: 1 }); setModal(null); await loadAll();
  };
  const toggleSub = async (id) => {
    const s = subs.find(x => x.id === id); if (!s) return;
    await supabase.from('subscriptions').update({ active: !s.active }).eq('id', id); await loadAll();
  };
  const delSub = async (id) => { await supabase.from('subscriptions').delete().eq('id', id); setConfirmDelSub(null); await loadAll(); };

  // Refunds
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
  const visTx = showAllTx ? mTx : mTx.slice(0, 6);

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

  return (
    <div style={{ background: bg, color: t1, fontFamily: ff, minHeight: "100vh", fontSize: 13, paddingBottom: 90, maxWidth: 600, margin: "0 auto" }}>

      {/* HEADER */}
      <div style={{ padding: "16px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: vioBright, textShadow: `0 0 24px ${vio}50` }}>⚡ Tracker</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {streak > 0 && <div style={{ padding: "3px 8px", borderRadius: 10, background: vio + "12", border: `1px solid ${vio}25`, fontSize: 11, fontWeight: 600, color: vio }}>🔥 {streak}j</div>}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: t2, textTransform: "uppercase", letterSpacing: 1.5 }}>Patrimoine</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{fmt(totalEur)}</div>
          </div>
        </div>
      </div>

      {/* GOAL */}
      <div style={{ padding: "10px 16px 0" }}>
        <G style={{ padding: "12px 14px" }} glow={vio}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: t2 }}>🎯 Objectif</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: vioBright }}>{fmt(totalEur)} / {fmt(goal)}</span>
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
            ) : <div style={{ fontWeight: 600, fontSize: 16 }}>{fmt(balances[p.id])}</div>}
          </G>
        ))}
      </div>

      {/* TABS */}
      <div style={{ padding: "0 16px 8px", display: "flex", gap: 5, overflowX: "auto", scrollbarWidth: "none" }}>
        {[["home","Accueil"],["details","Détails"],["chart","Évolution"],["subs","Abos"],["refunds","💸 Remb."]].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={pill(tab === k)}>{l}</button>
        ))}
        <button onClick={exportCSV} style={{ ...pill(false), marginLeft: "auto", fontSize: 11 }}>↓ CSV</button>
      </div>

      <div style={{ padding: "0 16px" }}>

        {/* HOME */}
        {tab === "home" && (<>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 8 }}>
            <button onClick={() => shiftMonth(-1)} style={{ background: "none", border: "none", color: t2, fontSize: 22, cursor: "pointer", fontFamily: ff }}>‹</button>
            <span style={{ fontSize: 17, fontWeight: 600 }}>{mlabel(month)}</span>
            <button onClick={() => shiftMonth(1)} style={{ background: "none", border: "none", color: t2, fontSize: 22, cursor: "pointer", fontFamily: ff }}>›</button>
          </div>

          {insight && <div style={{ padding: "7px 12px", marginBottom: 8, borderRadius: 10, background: insight.color + "10", border: `1px solid ${insight.color}20`, fontSize: 12, color: insight.color, fontWeight: 500, textAlign: "center" }}>{insight.text}</div>}

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
            <span style={{ fontSize: 24, fontWeight: 700, color: stats.net >= 0 ? green : red }}>{stats.net >= 0 ? "+" : ""}{fmt(stats.net)}</span>
          </G>

          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {totalSubsMonth > 0 && <G style={{ padding: "8px 12px", flex: 1, textAlign: "center" }}><span style={{ fontSize: 10, color: t2 }}>📱 Abos : </span><span style={{ fontSize: 12, fontWeight: 600, color: vio }}>{fmt(totalSubsMonth)}/mois</span></G>}
            {eleaTotal > 0 && <G style={{ padding: "8px 12px", flex: 1, textAlign: "center" }}><span style={{ fontSize: 10, color: t2 }}>💕 Elea : </span><span style={{ fontSize: 12, fontWeight: 600, color: "#f472b6" }}>{fmt(eleaTotal)}</span></G>}
            {totalPendingRefunds > 0 && <G style={{ padding: "8px 12px", flex: 1, textAlign: "center" }} onClick={() => setTab("refunds")}><span style={{ fontSize: 10, color: t2 }}>💸 Remb : </span><span style={{ fontSize: 12, fontWeight: 600, color: "#fbbf24" }}>{fmt(totalPendingRefunds)}</span></G>}
          </div>

          {/* Search + Sort + Filter */}
          <div style={{ display: "flex", gap: 5, marginBottom: 6, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => setShowSearch(!showSearch)} style={{ ...pill(showSearch), padding: "5px 10px" }}>🔍</button>
            <button onClick={() => setSortBy(sortBy === "date" ? "amount" : "date")} style={{ ...pill(false), padding: "5px 10px", fontSize: 11 }}>{sortBy === "date" ? "📅" : "💰"}</button>
            <button onClick={() => setEleaFilter(!eleaFilter)} style={{ ...pill(eleaFilter, "#f472b6"), padding: "5px 10px", fontSize: 11 }}>💕</button>
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
        </>)}

        {/* DETAILS */}
        {tab === "details" && (<>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 10 }}>
            <button onClick={() => shiftMonth(-1)} style={{ background: "none", border: "none", color: t2, fontSize: 22, cursor: "pointer", fontFamily: ff }}>‹</button>
            <span style={{ fontSize: 17, fontWeight: 600 }}>{mlabel(month)}</span>
            <button onClick={() => shiftMonth(1)} style={{ background: "none", border: "none", color: t2, fontSize: 22, cursor: "pointer", fontFamily: ff }}>›</button>
          </div>
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
          <G style={{ padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Top dépenses</div>
            {[...allTx.filter(tx => mkey(tx.date) === month && tx.type === "expense")].sort((a, b) => b.amount - a.amount).slice(0, 5).map((tx, i) => {
              const cat = EXP_CATS.find(c => c.id === tx.category);
              return <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.03)" : "none" }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 11, color: t2, width: 18 }}>#{i+1}</span><span style={{ fontSize: 13 }}>{cat?.emoji || "📦"}</span><span style={{ fontSize: 12 }}>{tx.note || cat?.name}</span></div><span style={{ fontSize: 12, fontWeight: 600, color: red }}>{fmt2(tx.amount)}</span></div>;
            })}
          </G>
        </>)}

        {/* CHART */}
        {tab === "chart" && (<>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <button onClick={() => setChartView("monthly")} style={pill(chartView === "monthly")}>Mois</button>
            <button onClick={() => setChartView("yearly")} style={pill(chartView === "yearly")}>Année</button>
          </div>
          <G style={{ padding: "14px 8px 8px", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, paddingLeft: 8 }}>📈 Patrimoine</div>
            <ResponsiveContainer width="100%" height={180}>
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
          <G style={{ padding: "14px 8px 8px", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, paddingLeft: 8 }}>Revenus vs Dépenses</div>
            <ResponsiveContainer width="100%" height={180}>
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
          <G style={{ padding: "14px 8px 8px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, paddingLeft: 8 }}>Net mensuel</div>
            <ResponsiveContainer width="100%" height={170}>
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

        {/* SUBS */}
        {tab === "subs" && (<>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div><div style={{ fontSize: 15, fontWeight: 600 }}>Abonnements</div><div style={{ fontSize: 12, color: t2 }}>{fmt(totalSubsMonth)}/mois</div></div>
            <button onClick={() => setModal("sub")} style={{ background: vio + "20", color: vio, border: `1px solid ${vio}40`, borderRadius: 10, padding: "8px 16px", cursor: "pointer", fontFamily: ff, fontSize: 12, fontWeight: 600 }}>+ Ajouter</button>
          </div>
          {subs.length === 0 && <G style={{ padding: 28, textAlign: "center" }}><span style={{ color: t2 }}>Aucun abonnement</span></G>}
          {subs.map(s => { const p = PLATFORMS.find(pl => pl.id === s.platform); return (
            <G key={s.id} style={{ padding: "11px 13px", marginBottom: 5, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: s.active ? 1 : 0.4 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ fontSize: 12, fontWeight: 500 }}>🔄 {s.name}</span><span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: p?.color + "10", color: p?.color }}>{p?.name}</span></div>
                <div style={{ fontSize: 10, color: t2 }}>Le {s.day}/mois</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: red }}>-{fmt2(s.amount)}</span>
                <button onClick={() => toggleSub(s.id)} style={{ width: 36, height: 22, borderRadius: 11, border: "none", cursor: "pointer", position: "relative", background: s.active ? green : "rgba(255,255,255,0.06)" }}><div style={{ width: 16, height: 16, borderRadius: 8, background: "#fff", position: "absolute", top: 3, left: s.active ? 17 : 3, transition: "left 0.2s" }} /></button>
                {confirmDelSub === s.id ? (
                  <div style={{ display: "flex", gap: 3 }}>
                    <button onClick={() => delSub(s.id)} style={{ background: red, border: "none", borderRadius: 5, color: "#fff", fontSize: 10, padding: "4px 8px", cursor: "pointer", fontFamily: ff }}>Oui</button>
                    <button onClick={() => setConfirmDelSub(null)} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 5, color: t2, fontSize: 10, padding: "4px 8px", cursor: "pointer", fontFamily: ff }}>Non</button>
                  </div>
                ) : <button onClick={() => setConfirmDelSub(s.id)} style={{ background: "none", border: "none", color: t2 + "30", cursor: "pointer", fontSize: 13 }}>🗑</button>}
              </div>
            </G>
          ); })}
        </>)}

        {/* REFUNDS */}
        {tab === "refunds" && (<>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div><div style={{ fontSize: 15, fontWeight: 600 }}>💸 Remboursements</div><div style={{ fontSize: 12, color: t2 }}>{pendingRefunds.length} en attente — {fmt(totalPendingRefunds)}</div></div>
            <button onClick={() => setModal("refund")} style={{ background: "#fbbf24" + "20", color: "#fbbf24", border: `1px solid #fbbf2440`, borderRadius: 10, padding: "8px 16px", cursor: "pointer", fontFamily: ff, fontSize: 12, fontWeight: 600 }}>+ Ajouter</button>
          </div>
          {refunds.length === 0 && <G style={{ padding: 28, textAlign: "center" }}><span style={{ color: t2 }}>Aucun remboursement en attente 🎉</span></G>}
          {refunds.map(r => (
            <G key={r.id} style={{ padding: "11px 13px", marginBottom: 5, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: r.resolved ? 0.4 : 1 }}>
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
        </>)}
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

      {/* MODAL TX */}
      {modal === "tx" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 }} onClick={() => { setModal(null); setEditTx(null); }}>
          <div style={{ background: "#0a0a10", borderRadius: "18px 18px 0 0", border: "1px solid rgba(255,255,255,0.07)", borderBottom: "none", padding: "18px 16px 28px", width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 30, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", margin: "0 auto 12px" }} />

            {!editTx && lastTx && (
              <button onClick={redoLast} style={{ width: "100%", padding: "9px 12px", borderRadius: 10, background: vio + "08", border: `1px solid ${vio}20`, cursor: "pointer", fontFamily: ff, fontSize: 12, color: vio, marginBottom: 12, textAlign: "left", display: "flex", justifyContent: "space-between" }}>
                <span>🔁 {lastTx.note || [...EXP_CATS,...INC_CATS].find(c => c.id === (lastTx.category || lastTx.inc_category))?.name} — {fmt2(lastTx.amount)}</span><span style={{ opacity: 0.5 }}>→</span>
              </button>
            )}

            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, textAlign: "center" }}>
              {editTx ? "✏️ Modifier" : f.type === "expense" ? "➖ Dépense" : f.type === "income" ? "➕ Revenu" : "↔ Transfert"}
            </div>

            <div style={{ textAlign: "center", marginBottom: 14 }}>
              <input type="number" placeholder="0" value={f.amount} onChange={e => uf("amount", e.target.value)} autoFocus
                style={{ background: "none", border: "none", color: f.type === "expense" ? red : f.type === "income" ? green : purple, fontFamily: ff, fontSize: 36, fontWeight: 700, textAlign: "center", outline: "none", width: "100%" }} />
              <div style={{ fontSize: 11, color: t2 }}>EUR</div>
            </div>

            <div style={{ marginBottom: 10 }}>
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 }} onClick={() => setModal(null)}>
          <div style={{ background: "#0a0a10", borderRadius: "18px 18px 0 0", border: "1px solid rgba(255,255,255,0.07)", borderBottom: "none", padding: "18px 16px 28px", width: "100%", maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 30, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, textAlign: "center" }}>🔄 Nouvel abonnement</div>
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
            <button onClick={addSub} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: ff, fontSize: 15, fontWeight: 600, color: "#fff", background: `linear-gradient(135deg, ${vio}, ${purple})` }}>Ajouter</button>
          </div>
        </div>
      )}

      {/* MODAL REFUND */}
      {modal === "refund" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 }} onClick={() => setModal(null)}>
          <div style={{ background: "#0a0a10", borderRadius: "18px 18px 0 0", border: "1px solid rgba(255,255,255,0.07)", borderBottom: "none", padding: "18px 16px 28px", width: "100%", maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 30, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", margin: "0 auto 12px" }} />
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
    </div>
  );
}
