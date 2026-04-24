'use client'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

// ─── HELPERS ───
const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const monthLabel = (mk) => {
  const [y, m] = mk.split('-')
  return new Date(y, m - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

// ─── TABS ───
const TABS = [
  { id: 'dash', icon: '📊', label: 'Dashboard' },
  { id: 'add', icon: '➕', label: 'Ajouter' },
  { id: 'list', icon: '📋', label: 'Historique' },
  { id: 'budget', icon: '🎯', label: 'Budgets' },
]

export default function ExpenseTracker() {
  const [tab, setTab] = useState('dash')
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(monthKey())

  // ─── FORM STATE ───
  const [form, setForm] = useState({ amount: '', description: '', category_id: '', date: new Date().toISOString().slice(0, 10) })
  const [editingId, setEditingId] = useState(null)
  const [budgetForm, setBudgetForm] = useState({})
  const [saving, setSaving] = useState(false)

  // ─── LOAD DATA ───
  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: cats }, { data: exps }, { data: buds }] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('expenses').select('*, categories(name, icon, color)').order('date', { ascending: false }),
      supabase.from('budgets').select('*, categories(name, icon)'),
    ])
    setCategories(cats || [])
    setExpenses(exps || [])
    setBudgets(buds || [])
    setLoading(false)
  }

  // ─── COMPUTED ───
  const monthExpenses = useMemo(() =>
    expenses.filter(e => e.date?.startsWith(month)),
    [expenses, month]
  )

  const totalMonth = useMemo(() =>
    monthExpenses.reduce((s, e) => s + Number(e.amount), 0),
    [monthExpenses]
  )

  const byCategory = useMemo(() => {
    const map = {}
    monthExpenses.forEach(e => {
      const cid = e.category_id || 'none'
      if (!map[cid]) map[cid] = { total: 0, cat: e.categories || { name: 'Sans catégorie', icon: '📦', color: '#64748b' } }
      map[cid].total += Number(e.amount)
    })
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total)
  }, [monthExpenses])

  const monthBudgets = useMemo(() =>
    budgets.filter(b => b.month_year === month),
    [budgets, month]
  )

  const totalBudget = useMemo(() =>
    monthBudgets.reduce((s, b) => s + Number(b.amount), 0),
    [monthBudgets]
  )

  // ─── ACTIONS ───
  async function saveExpense() {
    if (!form.amount || Number(form.amount) <= 0) return
    setSaving(true)
    const payload = {
      amount: Number(form.amount),
      description: form.description || null,
      category_id: form.category_id || null,
      date: form.date,
    }
    if (editingId) {
      await supabase.from('expenses').update(payload).eq('id', editingId)
    } else {
      await supabase.from('expenses').insert(payload)
    }
    setForm({ amount: '', description: '', category_id: '', date: new Date().toISOString().slice(0, 10) })
    setEditingId(null)
    setSaving(false)
    await loadAll()
    setTab('dash')
  }

  async function deleteExpense(id) {
    if (!confirm('Supprimer cette dépense ?')) return
    await supabase.from('expenses').delete().eq('id', id)
    await loadAll()
  }

  function editExpense(e) {
    setForm({ amount: e.amount, description: e.description || '', category_id: e.category_id || '', date: e.date })
    setEditingId(e.id)
    setTab('add')
  }

  async function saveBudgets() {
    setSaving(true)
    for (const [catId, amount] of Object.entries(budgetForm)) {
      if (!amount && amount !== 0) continue
      const existing = monthBudgets.find(b => b.category_id === catId)
      if (existing) {
        await supabase.from('budgets').update({ amount: Number(amount) }).eq('id', existing.id)
      } else if (Number(amount) > 0) {
        await supabase.from('budgets').insert({ category_id: catId, month_year: month, amount: Number(amount) })
      }
    }
    setSaving(false)
    await loadAll()
  }

  // Init budget form when budgets/categories change
  useEffect(() => {
    const init = {}
    categories.forEach(c => {
      const b = monthBudgets.find(b => b.category_id === c.id)
      init[c.id] = b ? b.amount : ''
    })
    setBudgetForm(init)
  }, [categories, monthBudgets])

  // ─── MONTH NAV ───
  function shiftMonth(dir) {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 1 + dir)
    setMonth(monthKey(d))
  }

  // ─── LOADING ───
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-bounce">💰</div>
        <p className="text-[#6B7885] text-sm font-semibold tracking-wider uppercase">Chargement...</p>
      </div>
    </div>
  )

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col">
      {/* HEADER */}
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-xl font-extrabold tracking-tight">
          <span className="text-[var(--gold)]">💰</span> Matteo Tracker
        </h1>
      </div>

      {/* MONTH SELECTOR */}
      <div className="flex items-center justify-between px-4 pb-3">
        <button onClick={() => shiftMonth(-1)} className="w-9 h-9 rounded-xl bg-[var(--dark3)] flex items-center justify-center text-lg hover:bg-[var(--dark4)] transition-colors">←</button>
        <span className="text-sm font-bold uppercase tracking-widest text-[#6B7885]">{monthLabel(month)}</span>
        <button onClick={() => shiftMonth(1)} className="w-9 h-9 rounded-xl bg-[var(--dark3)] flex items-center justify-center text-lg hover:bg-[var(--dark4)] transition-colors">→</button>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {/* ─── DASHBOARD ─── */}
        {tab === 'dash' && (
          <div className="space-y-4">
            {/* Total card */}
            <div className="rounded-2xl bg-gradient-to-br from-[var(--dark3)] to-[var(--dark2)] border border-white/5 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-[#6B7885] mb-1">Dépenses du mois</p>
              <p className="text-3xl font-extrabold text-[var(--gold)]">{fmt(totalMonth)}</p>
              {totalBudget > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-[#6B7885] mb-1">
                    <span>Budget: {fmt(totalBudget)}</span>
                    <span className={totalMonth > totalBudget ? 'text-[var(--red)]' : 'text-[var(--green)]'}>
                      {totalMonth > totalBudget ? '⚠️' : '✅'} {Math.round((totalMonth / totalBudget) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--dark1)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (totalMonth / totalBudget) * 100)}%`,
                        background: totalMonth > totalBudget ? 'var(--red)' : 'var(--gold)',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* By category */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-[#6B7885]">Par catégorie</p>
              {byCategory.length === 0 && (
                <p className="text-sm text-[#6B7885] text-center py-8">Aucune dépense ce mois</p>
              )}
              {byCategory.map(([cid, { total, cat }]) => {
                const budget = monthBudgets.find(b => b.category_id === cid)
                const pct = budget ? (total / Number(budget.amount)) * 100 : 0
                return (
                  <div key={cid} className="rounded-xl bg-[var(--dark3)] border border-white/5 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold">{cat.icon} {cat.name}</span>
                      <span className="text-sm font-bold" style={{ color: cat.color }}>{fmt(total)}</span>
                    </div>
                    {budget && (
                      <div className="h-1.5 rounded-full bg-[var(--dark1)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, pct)}%`,
                            background: pct > 100 ? 'var(--red)' : cat.color,
                          }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Recent */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-[#6B7885]">Dernières dépenses</p>
              {monthExpenses.slice(0, 5).map(e => (
                <div key={e.id} className="flex items-center gap-3 rounded-xl bg-[var(--dark3)] border border-white/5 p-3">
                  <span className="text-lg">{e.categories?.icon || '📦'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{e.description || e.categories?.name || 'Dépense'}</p>
                    <p className="text-xs text-[#6B7885]">{new Date(e.date).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <span className="text-sm font-bold text-[var(--red)]">-{fmt(e.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── ADD / EDIT ─── */}
        {tab === 'add' && (
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-[#6B7885]">
              {editingId ? '✏️ Modifier' : '➕ Nouvelle dépense'}
            </p>

            {/* Amount */}
            <div>
              <label className="text-xs text-[#6B7885] font-semibold block mb-1">Montant (€)</label>
              <input
                type="number"
                inputMode="decimal"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                className="w-full bg-[var(--dark3)] border border-white/10 rounded-xl px-4 py-3 text-xl font-bold text-[var(--gold)] placeholder:text-[#3A4450] focus:outline-none focus:border-[var(--gold)] transition-colors"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-xs text-[#6B7885] font-semibold block mb-2">Catégorie</label>
              <div className="grid grid-cols-4 gap-2">
                {categories.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setForm({ ...form, category_id: c.id })}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                      form.category_id === c.id
                        ? 'border-[var(--gold)] bg-[var(--gold)]/10'
                        : 'border-white/5 bg-[var(--dark3)] hover:border-white/15'
                    }`}
                  >
                    <span className="text-lg">{c.icon}</span>
                    <span className="text-[10px] font-semibold truncate w-full text-center">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs text-[#6B7885] font-semibold block mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Ex: Courses Carrefour..."
                className="w-full bg-[var(--dark3)] border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-[#3A4450] focus:outline-none focus:border-[var(--gold)] transition-colors"
              />
            </div>

            {/* Date */}
            <div>
              <label className="text-xs text-[#6B7885] font-semibold block mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full bg-[var(--dark3)] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--gold)] transition-colors"
              />
            </div>

            {/* Submit */}
            <button
              onClick={saveExpense}
              disabled={saving || !form.amount}
              className="w-full py-3.5 rounded-xl bg-[var(--gold)] text-[var(--dark1)] font-extrabold text-sm uppercase tracking-wider disabled:opacity-40 hover:brightness-110 active:scale-[0.98] transition-all"
            >
              {saving ? '⏳' : editingId ? '✏️ Modifier' : '💰 Ajouter'}
            </button>

            {editingId && (
              <button
                onClick={() => { setEditingId(null); setForm({ amount: '', description: '', category_id: '', date: new Date().toISOString().slice(0, 10) }) }}
                className="w-full py-2 text-xs text-[#6B7885] font-semibold"
              >
                Annuler la modification
              </button>
            )}
          </div>
        )}

        {/* ─── HISTORY ─── */}
        {tab === 'list' && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-[#6B7885] mb-2">
              {monthExpenses.length} dépense{monthExpenses.length > 1 ? 's' : ''} — {fmt(totalMonth)}
            </p>
            {monthExpenses.length === 0 && (
              <p className="text-sm text-[#6B7885] text-center py-12">Aucune dépense ce mois 🎉</p>
            )}
            {monthExpenses.map(e => (
              <div key={e.id} className="flex items-center gap-3 rounded-xl bg-[var(--dark3)] border border-white/5 p-3 group">
                <span className="text-lg">{e.categories?.icon || '📦'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{e.description || e.categories?.name || 'Dépense'}</p>
                  <p className="text-xs text-[#6B7885]">
                    {e.categories?.name && <span className="mr-2">{e.categories.name}</span>}
                    {new Date(e.date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <span className="text-sm font-bold text-[var(--red)] mr-1">-{fmt(e.amount)}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => editExpense(e)} className="w-7 h-7 rounded-lg bg-[var(--dark4)] flex items-center justify-center text-xs hover:bg-[var(--gold)] hover:text-[var(--dark1)] transition-colors">✏️</button>
                  <button onClick={() => deleteExpense(e.id)} className="w-7 h-7 rounded-lg bg-[var(--dark4)] flex items-center justify-center text-xs hover:bg-[var(--red)] transition-colors">🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── BUDGETS ─── */}
        {tab === 'budget' && (
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-[#6B7885]">🎯 Budgets mensuels</p>
            <div className="space-y-2">
              {categories.map(c => {
                const spent = monthExpenses.filter(e => e.category_id === c.id).reduce((s, e) => s + Number(e.amount), 0)
                const budgetAmt = budgetForm[c.id] || 0
                const pct = budgetAmt > 0 ? (spent / budgetAmt) * 100 : 0
                return (
                  <div key={c.id} className="rounded-xl bg-[var(--dark3)] border border-white/5 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span>{c.icon}</span>
                      <span className="text-sm font-semibold flex-1">{c.name}</span>
                      <span className="text-xs text-[#6B7885]">Dépensé: {fmt(spent)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={budgetForm[c.id] || ''}
                        onChange={e => setBudgetForm({ ...budgetForm, [c.id]: e.target.value })}
                        placeholder="0"
                        className="flex-1 bg-[var(--dark1)] border border-white/10 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:border-[var(--gold)] transition-colors"
                      />
                      <span className="text-xs text-[#6B7885]">€</span>
                    </div>
                    {budgetAmt > 0 && (
                      <div className="h-1.5 rounded-full bg-[var(--dark1)] overflow-hidden mt-2">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, pct)}%`,
                            background: pct > 100 ? 'var(--red)' : pct > 80 ? '#FF9500' : c.color,
                          }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <button
              onClick={saveBudgets}
              disabled={saving}
              className="w-full py-3.5 rounded-xl bg-[var(--gold)] text-[var(--dark1)] font-extrabold text-sm uppercase tracking-wider disabled:opacity-40 hover:brightness-110 active:scale-[0.98] transition-all"
            >
              {saving ? '⏳' : '💾 Sauvegarder les budgets'}
            </button>
          </div>
        )}
      </div>

      {/* TAB BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--dark2)] border-t border-white/5 flex z-50">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 flex flex-col items-center gap-0.5 transition-colors ${
              tab === t.id ? 'text-[var(--gold)]' : 'text-[#6B7885]'
            }`}
          >
            <span className="text-lg">{t.icon}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
