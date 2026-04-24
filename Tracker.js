'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

const ff = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
const bg = "#0a0a0f"
const card = "rgba(255,255,255,0.04)"
const border = "rgba(255,255,255,0.08)"
const t1 = "#ffffff"
const t2 = "rgba(255,255,255,0.45)"
const vio = "#8b5cf6"
const purple = "#a855f7"
const green = "#10b981"
const red = "#ef4444"
const rose = "#ec4899"

const PLATFORMS = [
  { id: "binance", name: "Binance", icon: "🟡", color: "#F0B90B" },
  { id: "n26", name: "N26", icon: "🏦", color: "#48AC98" },
  { id: "bourso", name: "Boursorama", icon: "🔵", color: "#0078D4" },
  { id: "wise", name: "Wise", icon: "🌍", color: "#9FE870" },
  { id: "cash", name: "Cash", icon: "💵", color: "#85BB65" },
  { id: "paypal", name: "PayPal", icon: "🅿️", color: "#003087" },
]

const EXP_CATS = [
  { id: "food", name: "Alimentation", icon: "🛒" },
  { id: "resto", name: "Resto/Sorties", icon: "🍽️" },
  { id: "transport", name: "Transport", icon: "🚗" },
  { id: "shopping", name: "Shopping", icon: "🛍️" },
  { id: "housing", name: "Logement", icon: "🏠" },
  { id: "health", name: "Santé", icon: "💊" },
  { id: "leisure", name: "Loisirs", icon: "🎮" },
  { id: "bills", name: "Factures", icon: "📄" },
  { id: "travel", name: "Voyage", icon: "✈️" },
  { id: "gifts", name: "Cadeaux", icon: "🎁" },
  { id: "other", name: "Autre", icon: "📦" },
]

const INC_SOURCES = [
  { id: "celsius", name: "Celsius" },
  { id: "rainbet", name: "Rainbet" },
  { id: "rainbet_gains", name: "Rainbet Gains" },
  { id: "mobilfox", name: "Mobilfox" },
  { id: "tiktok_fr", name: "TikTok FR" },
  { id: "unfamous", name: "Unfamous" },
  { id: "collab", name: "Collab" },
  { id: "snapchat", name: "Snapchat" },
]

const GOAL = 200000

export default function Tracker() {
  const [tab, setTab] = useState("home")
  const [transactions, setTransactions] = useState([])
  const [platformBalances, setPlatformBalances] = useState({})
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showSub, setShowSub] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [editId, setEditId] = useState(null)
  const [confirmDeleteSub, setConfirmDeleteSub] = useState(null)
  const [filterElea, setFilterElea] = useState(false)
  const [filterPlatform, setFilterPlatform] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [streak, setStreak] = useState(0)

  // Form state
  const [cf, setCf] = useState({ type: "expense", amount: "", category: "food", source: "celsius", platform: "n26", note: "", date: new Date().toISOString().split("T")[0] })
  const [sf, setSf] = useState({ name: "", amount: "", platform: "n26" })
  const [tf, setTf] = useState({ from: "n26", to: "binance", amount: "", fee: "", note: "", date: new Date().toISOString().split("T")[0] })

  const ucf = (k, v) => setCf(p => ({ ...p, [k]: v }))
  const usf = (k, v) => setSf(p => ({ ...p, [k]: v }))
  const utf = (k, v) => setTf(p => ({ ...p, [k]: v }))

  // Load data from Supabase
  const loadData = useCallback(async () => {
    try {
      const [txRes, platRes, subRes] = await Promise.all([
        supabase.from('transactions').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('platforms').select('*'),
        supabase.from('subscriptions').select('*').order('created_at', { ascending: false }),
      ])
      if (txRes.data) setTransactions(txRes.data)
      if (platRes.data) {
        const balMap = {}
        platRes.data.forEach(p => { balMap[p.id] = p.balance })
        setPlatformBalances(balMap)
      }
      if (subRes.data) setSubscriptions(subRes.data)

      // Calculate streak
      if (txRes.data && txRes.data.length > 0) {
        let s = 0
        const today = new Date()
        for (let i = 0; i < 365; i++) {
          const d = new Date(today)
          d.setDate(d.getDate() - i)
          const ds = d.toISOString().split("T")[0]
          if (txRes.data.some(t => t.date === ds)) s++
          else break
        }
        setStreak(s)
      }
    } catch (e) {
      console.error('Load error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Current month filter
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const monthTx = useMemo(() => transactions.filter(t => {
    const d = new Date(t.date)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  }), [transactions, currentMonth, currentYear])

  const totalIncome = monthTx.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = monthTx.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0)
  const totalNet = totalIncome - totalExpense
  const totalBalance = Object.values(platformBalances).reduce((s, b) => s + Number(b), 0)
  const totalSubs = subscriptions.reduce((s, sub) => s + Number(sub.amount), 0)
  const goalPct = Math.min((totalBalance / GOAL) * 100, 100)

  // Filtered transactions for display
  const displayTx = useMemo(() => {
    let list = monthTx
    if (filterElea) list = list.filter(t => t.note && t.note.toLowerCase().includes("elea"))
    if (filterPlatform) list = list.filter(t => t.platform === filterPlatform || t.platform_to === filterPlatform)
    if (searchQuery) list = list.filter(t =>
      (t.note && t.note.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.category && t.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.source && t.source.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    return list
  }, [monthTx, filterElea, filterPlatform, searchQuery])

  const eleaTotal = monthTx.filter(t => t.note && t.note.toLowerCase().includes("elea") && t.type === "expense").reduce((s, t) => s + Number(t.amount), 0)

  // Expense by category for donut
  const expByCat = useMemo(() => {
    const map = {}
    monthTx.filter(t => t.type === "expense").forEach(t => {
      map[t.category] = (map[t.category] || 0) + Number(t.amount)
    })
    return Object.entries(map).map(([k, v]) => {
      const cat = EXP_CATS.find(c => c.id === k)
      return { name: cat ? cat.icon + " " + cat.name : k, value: v }
    })
  }, [monthTx])

  // Income by source for donut
  const incBySource = useMemo(() => {
    const map = {}
    monthTx.filter(t => t.type === "income").forEach(t => {
      map[t.source] = (map[t.source] || 0) + Number(t.amount)
    })
    return Object.entries(map).map(([k, v]) => {
      const src = INC_SOURCES.find(s => s.id === k)
      return { name: src ? src.name : k, value: v }
    })
  }, [monthTx])

  // Charts data — last 6 months
  const chartData = useMemo(() => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1)
      const m = d.getMonth()
      const y = d.getFullYear()
      const mTx = transactions.filter(t => {
        const td = new Date(t.date)
        return td.getMonth() === m && td.getFullYear() === y
      })
      const inc = mTx.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0)
      const exp = mTx.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0)
      months.push({
        label: d.toLocaleDateString("fr-FR", { month: "short" }),
        income: inc,
        expense: exp,
        net: inc - exp,
      })
    }
    return months
  }, [transactions, currentMonth, currentYear])

  // Add transaction
  const addTransaction = async () => {
    const amt = parseFloat(cf.amount)
    if (!amt || amt <= 0) return
    const tx = {
      type: cf.type,
      amount: amt,
      category: cf.type === "expense" ? cf.category : null,
      source: cf.type === "income" ? cf.source : null,
      platform: cf.platform,
      note: cf.note,
      date: cf.date,
    }
    const { error } = await supabase.from('transactions').insert(tx)
    if (error) { console.error(error); return }

    // Update platform balance
    const delta = cf.type === "income" ? amt : -amt
    await supabase.from('platforms').update({
      balance: (platformBalances[cf.platform] || 0) + delta
    }).eq('id', cf.platform)

    setCf({ type: cf.type, amount: "", category: "food", source: "celsius", platform: cf.platform, note: "", date: new Date().toISOString().split("T")[0] })
    setShowAdd(false)
    setEditId(null)
    loadData()
  }

  // Edit transaction
  const startEdit = (t) => {
    setCf({
      type: t.type,
      amount: String(t.amount),
      category: t.category || "food",
      source: t.source || "celsius",
      platform: t.platform || "n26",
      note: t.note || "",
      date: t.date,
    })
    setEditId(t.id)
    setShowAdd(true)
  }

  const updateTransaction = async () => {
    const amt = parseFloat(cf.amount)
    if (!amt || amt <= 0) return
    const oldTx = transactions.find(t => t.id === editId)
    if (!oldTx) return

    // Reverse old balance impact
    const oldDelta = oldTx.type === "income" ? -Number(oldTx.amount) : Number(oldTx.amount)
    await supabase.from('platforms').update({
      balance: (platformBalances[oldTx.platform] || 0) + oldDelta
    }).eq('id', oldTx.platform)

    // Update transaction
    await supabase.from('transactions').update({
      type: cf.type,
      amount: amt,
      category: cf.type === "expense" ? cf.category : null,
      source: cf.type === "income" ? cf.source : null,
      platform: cf.platform,
      note: cf.note,
      date: cf.date,
    }).eq('id', editId)

    // Apply new balance impact
    const newDelta = cf.type === "income" ? amt : -amt
    await supabase.from('platforms').update({
      balance: (platformBalances[cf.platform] || 0) + oldDelta + newDelta
    }).eq('id', cf.platform)

    setCf({ type: "expense", amount: "", category: "food", source: "celsius", platform: "n26", note: "", date: new Date().toISOString().split("T")[0] })
    setShowAdd(false)
    setEditId(null)
    loadData()
  }

  // Delete transaction
  const deleteTransaction = async (id) => {
    const tx = transactions.find(t => t.id === id)
    if (!tx) return
    const delta = tx.type === "income" ? -Number(tx.amount) : Number(tx.amount)
    await supabase.from('platforms').update({
      balance: (platformBalances[tx.platform] || 0) + delta
    }).eq('id', tx.platform)
    await supabase.from('transactions').delete().eq('id', id)
    loadData()
  }

  // Transfer
  const addTransfer = async () => {
    const amt = parseFloat(tf.amount)
    if (!amt || amt <= 0 || tf.from === tf.to) return
    const fee = parseFloat(tf.fee) || 0
    const tx = {
      type: "transfer",
      amount: amt,
      platform: tf.from,
      platform_to: tf.to,
      fee: fee,
      note: tf.note,
      date: tf.date,
    }
    await supabase.from('transactions').insert(tx)
    await supabase.from('platforms').update({ balance: (platformBalances[tf.from] || 0) - amt - fee }).eq('id', tf.from)
    await supabase.from('platforms').update({ balance: (platformBalances[tf.to] || 0) + amt }).eq('id', tf.to)
    setTf({ from: "n26", to: "binance", amount: "", fee: "", note: "", date: new Date().toISOString().split("T")[0] })
    setShowTransfer(false)
    loadData()
  }

  // Subscriptions
  const addSub = async () => {
    const amt = parseFloat(sf.amount)
    if (!sf.name || !amt) return
    await supabase.from('subscriptions').insert({ name: sf.name, amount: amt, platform: sf.platform })
    setSf({ name: "", amount: "", platform: "n26" })
    setShowSub(false)
    loadData()
  }

  const deleteSub = async (id) => {
    await supabase.from('subscriptions').delete().eq('id', id)
    setConfirmDeleteSub(null)
    loadData()
  }

  // Styles
  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${border}`,
    background: "rgba(255,255,255,0.04)", color: t1, fontFamily: ff, fontSize: 14,
    outline: "none", boxSizing: "border-box",
  }
  const chipStyle = (active, color) => ({
    padding: "6px 14px", borderRadius: 20, border: `1px solid ${active ? color : border}`,
    background: active ? color + "18" : "transparent", color: active ? color : t2,
    fontSize: 12, cursor: "pointer", fontFamily: ff, fontWeight: 600, whiteSpace: "nowrap",
  })

  const DONUT_COLORS = ["#8b5cf6", "#ec4899", "#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#14b8a6", "#f97316", "#6366f1", "#84cc16", "#e879f9"]

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: bg, color: t2, fontFamily: ff }}>
      Chargement...
    </div>
  )

  const monthLabel = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })

  return (
    <div style={{ fontFamily: ff, background: bg, minHeight: "100vh", color: t1, maxWidth: 600, margin: "0 auto", paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ padding: "20px 20px 10px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: t2, textTransform: "uppercase", letterSpacing: 1.5 }}>{monthLabel}</div>
        <div style={{ fontSize: 38, fontWeight: 800, marginTop: 4 }}>{totalBalance.toLocaleString("fr-FR")}€</div>
        <div style={{ fontSize: 11, color: t2, marginTop: 2 }}>Patrimoine total</div>
        {/* Goal bar */}
        <div style={{ margin: "12px 20px 0", background: "rgba(255,255,255,0.06)", borderRadius: 8, height: 8, overflow: "hidden" }}>
          <div style={{ width: `${goalPct}%`, height: "100%", background: `linear-gradient(90deg, ${vio}, ${green})`, borderRadius: 8, transition: "width 0.5s" }} />
        </div>
        <div style={{ fontSize: 10, color: t2, marginTop: 4 }}>{totalBalance.toLocaleString("fr-FR")}€ / {GOAL.toLocaleString("fr-FR")}€ ({goalPct.toFixed(1)}%)</div>
        {streak > 0 && <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 6 }}>🔥 {streak} jour{streak > 1 ? "s" : ""} de suite</div>}
      </div>

      {/* Income / Expense summary */}
      <div style={{ display: "flex", gap: 10, padding: "10px 20px" }}>
        <div style={{ flex: 1, background: card, borderRadius: 14, padding: "14px", border: `1px solid ${border}` }}>
          <div style={{ fontSize: 10, color: green }}>▲ Revenus</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: green }}>{totalIncome.toLocaleString("fr-FR")}€</div>
        </div>
        <div style={{ flex: 1, background: card, borderRadius: 14, padding: "14px", border: `1px solid ${border}` }}>
          <div style={{ fontSize: 10, color: red }}>▼ Dépenses</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: red }}>{totalExpense.toLocaleString("fr-FR")}€</div>
        </div>
      </div>
      <div style={{ padding: "0 20px 6px", textAlign: "center" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: totalNet >= 0 ? green : red }}>Net: {totalNet >= 0 ? "+" : ""}{totalNet.toLocaleString("fr-FR")}€</span>
        {totalSubs > 0 && <span style={{ fontSize: 11, color: t2, marginLeft: 12 }}>📱 {totalSubs.toLocaleString("fr-FR")}€/mois abos</span>}
      </div>

      {/* Platforms */}
      <div style={{ display: "flex", gap: 6, padding: "6px 20px", overflowX: "auto", flexWrap: "nowrap" }}>
        {PLATFORMS.map(p => (
          <button key={p.id} onClick={() => setFilterPlatform(filterPlatform === p.id ? null : p.id)}
            style={{ ...chipStyle(filterPlatform === p.id, p.color), display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            {p.icon} {p.name} <span style={{ fontWeight: 800 }}>{(platformBalances[p.id] || 0).toLocaleString("fr-FR")}€</span>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, padding: "12px 20px 6px" }}>
        {[["home", "📊"], ["subs", "📱"], ["charts", "📈"]].map(([id, icon]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex: 1, padding: "8px", background: tab === id ? vio + "20" : "transparent", border: `1px solid ${tab === id ? vio : border}`, borderRadius: 10, color: tab === id ? vio : t2, fontFamily: ff, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {icon} {id === "home" ? "Accueil" : id === "subs" ? "Abos" : "Graphiques"}
          </button>
        ))}
      </div>

      {/* TAB: HOME */}
      {tab === "home" && (
        <div style={{ padding: "6px 20px" }}>
          {/* Search + Elea filter */}
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="🔍 Rechercher..."
              style={{ ...inputStyle, flex: 1 }} />
            <button onClick={() => setFilterElea(!filterElea)}
              style={{ ...chipStyle(filterElea, rose), display: "flex", alignItems: "center", gap: 4 }}>
              💕 {filterElea && eleaTotal > 0 ? `${eleaTotal.toLocaleString("fr-FR")}€` : "Elea"}
            </button>
          </div>

          {/* Donuts */}
          {(expByCat.length > 0 || incBySource.length > 0) && (
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              {expByCat.length > 0 && (
                <div style={{ flex: 1, background: card, borderRadius: 14, padding: 10, border: `1px solid ${border}` }}>
                  <div style={{ fontSize: 10, color: t2, textAlign: "center", marginBottom: 4 }}>Dépenses</div>
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie data={expByCat} dataKey="value" cx="50%" cy="50%" innerRadius={28} outerRadius={48} paddingAngle={2}>
                        {expByCat.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => `${v.toLocaleString("fr-FR")}€`} contentStyle={{ background: "#1a1a2e", border: "none", borderRadius: 8, fontSize: 11, color: t1 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              {incBySource.length > 0 && (
                <div style={{ flex: 1, background: card, borderRadius: 14, padding: 10, border: `1px solid ${border}` }}>
                  <div style={{ fontSize: 10, color: t2, textAlign: "center", marginBottom: 4 }}>Revenus</div>
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie data={incBySource} dataKey="value" cx="50%" cy="50%" innerRadius={28} outerRadius={48} paddingAngle={2}>
                        {incBySource.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => `${v.toLocaleString("fr-FR")}€`} contentStyle={{ background: "#1a1a2e", border: "none", borderRadius: 8, fontSize: 11, color: t1 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Transaction list */}
          {displayTx.length === 0 && <div style={{ textAlign: "center", color: t2, padding: 30, fontSize: 13 }}>Aucune transaction ce mois</div>}
          {displayTx.map(t => {
            const isInc = t.type === "income"
            const isTr = t.type === "transfer"
            const cat = EXP_CATS.find(c => c.id === t.category)
            const src = INC_SOURCES.find(s => s.id === t.source)
            const plat = PLATFORMS.find(p => p.id === t.platform)
            const platTo = PLATFORMS.find(p => p.id === t.platform_to)
            const isElea = t.note && t.note.toLowerCase().includes("elea")
            return (
              <div key={t.id} onClick={() => startEdit(t)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${border}`, cursor: "pointer" }}>
                <div style={{ fontSize: 20, width: 36, textAlign: "center" }}>
                  {isTr ? "↔️" : isInc ? "💰" : cat ? cat.icon : "📦"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    {isTr ? `${plat?.name} → ${platTo?.name}` : isInc ? (src?.name || "Revenu") : (cat?.name || "Dépense")}
                    {isElea && <span style={{ fontSize: 9, background: rose + "25", color: rose, padding: "2px 6px", borderRadius: 6, fontWeight: 700 }}>Elea</span>}
                  </div>
                  <div style={{ fontSize: 10, color: t2 }}>
                    {plat?.icon} {plat?.name} · {t.date}{t.note ? ` · ${t.note}` : ""}
                    {isTr && t.fee > 0 ? ` · frais: ${t.fee}€` : ""}
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: isTr ? vio : isInc ? green : red }}>
                  {isTr ? "" : isInc ? "+" : "-"}{Number(t.amount).toLocaleString("fr-FR")}€
                </div>
                <div onClick={e => { e.stopPropagation(); deleteTransaction(t.id) }} style={{ fontSize: 12, color: t2, cursor: "pointer", padding: 4 }}>✕</div>
              </div>
            )
          })}
        </div>
      )}

      {/* TAB: SUBSCRIPTIONS */}
      {tab === "subs" && (
        <div style={{ padding: "10px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>📱 Abonnements</div>
            <div style={{ fontSize: 13, color: vio, fontWeight: 700 }}>{totalSubs.toLocaleString("fr-FR")}€/mois</div>
          </div>
          {subscriptions.map(s => {
            const plat = PLATFORMS.find(p => p.id === s.platform)
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${border}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                  <div style={{ fontSize: 10, color: t2 }}>{plat?.icon} {plat?.name}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: red }}>{Number(s.amount).toLocaleString("fr-FR")}€</div>
                {confirmDeleteSub === s.id ? (
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => deleteSub(s.id)} style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: red, color: "#fff", fontSize: 11, cursor: "pointer", fontFamily: ff }}>Oui</button>
                    <button onClick={() => setConfirmDeleteSub(null)} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${border}`, background: "transparent", color: t2, fontSize: 11, cursor: "pointer", fontFamily: ff }}>Non</button>
                  </div>
                ) : (
                  <div onClick={() => setConfirmDeleteSub(s.id)} style={{ fontSize: 12, color: t2, cursor: "pointer", padding: 4 }}>✕</div>
                )}
              </div>
            )
          })}
          <button onClick={() => setShowSub(true)}
            style={{ width: "100%", padding: 14, borderRadius: 12, border: `1px dashed ${border}`, background: "transparent", color: t2, fontFamily: ff, fontSize: 13, cursor: "pointer", marginTop: 10 }}>
            + Ajouter un abonnement
          </button>
        </div>
      )}

      {/* TAB: CHARTS */}
      {tab === "charts" && (
        <div style={{ padding: "10px 20px" }}>
          {[
            { title: "💰 Revenus vs Dépenses", content: (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData}>
                  <XAxis dataKey="label" tick={{ fill: t2, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: t2, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#1a1a2e", border: "none", borderRadius: 8, fontSize: 11, color: t1 }} formatter={v => `${v.toLocaleString("fr-FR")}€`} />
                  <Bar dataKey="income" fill={green} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill={red} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )},
            { title: "📈 Net mensuel", content: (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <XAxis dataKey="label" tick={{ fill: t2, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: t2, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#1a1a2e", border: "none", borderRadius: 8, fontSize: 11, color: t1 }} formatter={v => `${v.toLocaleString("fr-FR")}€`} />
                  <Line type="monotone" dataKey="net" stroke={vio} strokeWidth={2} dot={{ fill: vio, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )},
          ].map((chart, i) => (
            <div key={i} style={{ background: card, borderRadius: 14, padding: 14, border: `1px solid ${border}`, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{chart.title}</div>
              {chart.content}
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, zIndex: 100 }}>
        <button onClick={() => { setCf(p => ({ ...p, type: "expense" })); setEditId(null); setShowAdd(true) }}
          style={{ padding: "12px 20px", borderRadius: 50, border: "none", background: red, color: "#fff", fontFamily: ff, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 20px rgba(239,68,68,0.4)" }}>
          − Dépense
        </button>
        <button onClick={() => { setShowTransfer(true) }}
          style={{ padding: "12px 16px", borderRadius: 50, border: "none", background: vio, color: "#fff", fontFamily: ff, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 20px ${vio}66` }}>
          ↔
        </button>
        <button onClick={() => { setCf(p => ({ ...p, type: "income" })); setEditId(null); setShowAdd(true) }}
          style={{ padding: "12px 20px", borderRadius: 50, border: "none", background: green, color: "#fff", fontFamily: ff, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 20px rgba(16,185,129,0.4)" }}>
          + Revenu
        </button>
      </div>

      {/* MODAL: Add/Edit Transaction */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={() => { setShowAdd(false); setEditId(null) }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#1a1a2e", borderRadius: "20px 20px 0 0", padding: 20, width: "100%", maxWidth: 600, maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>
              {editId ? "✏️ Modifier" : cf.type === "income" ? "💰 Nouveau revenu" : "💸 Nouvelle dépense"}
            </div>
            {/* Amount */}
            <input type="number" inputMode="decimal" value={cf.amount} onChange={e => ucf("amount", e.target.value)} placeholder="0"
              style={{ ...inputStyle, fontSize: 32, fontWeight: 700, textAlign: "center", color: cf.type === "income" ? green : red, marginBottom: 14 }} />
            {/* Category or Source */}
            {cf.type === "expense" ? (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: t2, marginBottom: 6 }}>Catégorie</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {EXP_CATS.map(c => (
                    <button key={c.id} onClick={() => ucf("category", c.id)} style={chipStyle(cf.category === c.id, vio)}>
                      {c.icon} {c.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: t2, marginBottom: 6 }}>Source</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {INC_SOURCES.map(s => (
                    <button key={s.id} onClick={() => ucf("source", s.id)} style={chipStyle(cf.source === s.id, green)}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Platform */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: t2, marginBottom: 6 }}>Plateforme</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {PLATFORMS.map(p => (
                  <button key={p.id} onClick={() => ucf("platform", p.id)} style={chipStyle(cf.platform === p.id, p.color)}>
                    {p.icon} {p.name}
                  </button>
                ))}
              </div>
            </div>
            {/* Date + Note */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: t2, marginBottom: 4 }}>Date</div>
                <input type="date" value={cf.date} onChange={e => ucf("date", e.target.value)} style={inputStyle} />
              </div>
              <div style={{ flex: 2 }}>
                <div style={{ fontSize: 10, color: t2, marginBottom: 4 }}>Note</div>
                <input value={cf.note} onChange={e => ucf("note", e.target.value)} placeholder="écris 'elea' pour tracker" style={inputStyle} />
              </div>
            </div>
            <button onClick={editId ? updateTransaction : addTransaction}
              style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", cursor: "pointer", fontFamily: ff, fontSize: 15, fontWeight: 700, color: "#fff", background: `linear-gradient(135deg, ${vio}, ${cf.type === "income" ? green : red})` }}>
              {editId ? "Modifier" : "Ajouter"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Transfer */}
      {showTransfer && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={() => setShowTransfer(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#1a1a2e", borderRadius: "20px 20px 0 0", padding: 20, width: "100%", maxWidth: 600 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>↔️ Transfert</div>
            <input type="number" inputMode="decimal" value={tf.amount} onChange={e => utf("amount", e.target.value)} placeholder="Montant"
              style={{ ...inputStyle, fontSize: 28, fontWeight: 700, textAlign: "center", color: vio, marginBottom: 14 }} />
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: t2, marginBottom: 6 }}>De</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {PLATFORMS.map(p => (
                    <button key={p.id} onClick={() => utf("from", p.id)} style={chipStyle(tf.from === p.id, p.color)}>
                      {p.icon} {p.name}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: t2, marginBottom: 6 }}>Vers</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {PLATFORMS.map(p => (
                    <button key={p.id} onClick={() => utf("to", p.id)} style={chipStyle(tf.to === p.id, p.color)}>
                      {p.icon} {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: t2, marginBottom: 4 }}>Frais</div>
                <input type="number" inputMode="decimal" value={tf.fee} onChange={e => utf("fee", e.target.value)} placeholder="0" style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: t2, marginBottom: 4 }}>Date</div>
                <input type="date" value={tf.date} onChange={e => utf("date", e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: t2, marginBottom: 4 }}>Note</div>
              <input value={tf.note} onChange={e => utf("note", e.target.value)} placeholder="Optionnel" style={inputStyle} />
            </div>
            <button onClick={addTransfer}
              style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", cursor: "pointer", fontFamily: ff, fontSize: 15, fontWeight: 700, color: "#fff", background: `linear-gradient(135deg, ${vio}, ${purple})` }}>
              Transférer
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Add Subscription */}
      {showSub && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={() => setShowSub(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#1a1a2e", borderRadius: "20px 20px 0 0", padding: 20, width: "100%", maxWidth: 600 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>📱 Nouvel abonnement</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <div style={{ flex: 2 }}>
                <div style={{ fontSize: 10, color: t2, marginBottom: 4 }}>Nom</div>
                <input value={sf.name} onChange={e => usf("name", e.target.value)} placeholder="Netflix, Spotify..." style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: t2, marginBottom: 4 }}>€/mois</div>
                <input type="number" inputMode="decimal" value={sf.amount} onChange={e => usf("amount", e.target.value)} placeholder="0" style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: t2, marginBottom: 6 }}>Plateforme</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {PLATFORMS.map(p => (
                  <button key={p.id} onClick={() => usf("platform", p.id)} style={chipStyle(sf.platform === p.id, p.color)}>
                    {p.icon} {p.name}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={addSub}
              style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", cursor: "pointer", fontFamily: ff, fontSize: 15, fontWeight: 700, color: "#fff", background: `linear-gradient(135deg, ${vio}, ${purple})` }}>
              Ajouter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
