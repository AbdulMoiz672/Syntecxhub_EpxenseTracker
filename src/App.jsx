import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  CreditCard,
  Ellipsis,
  ForkKnife,
  House,
  LayoutDashboard,
  Plus,
  Search,
  ShoppingBag,
  ShoppingBasket,
  Sparkles,
  Tag,
  TrainFront,
  Trash2,
  Wallet,
  X,
} from 'lucide-react'
import { createExpense, fetchExpenses, removeExpense } from './data/expensesApi.js'

const categories = ['Groceries', 'Dining', 'Transport', 'Shopping', 'Subscriptions', 'Housing', 'Other']
const categoryStyles = {
  Groceries: { color: '#5e8b4c', background: '#eaf1e4', icon: ShoppingBasket },
  Dining: { color: '#c1764d', background: '#f7eae2', icon: ForkKnife },
  Transport: { color: '#597b91', background: '#e8eff3', icon: TrainFront },
  Shopping: { color: '#9a7850', background: '#f2ede3', icon: ShoppingBag },
  Subscriptions: { color: '#8876ab', background: '#eeeaf5', icon: CreditCard },
  Housing: { color: '#527c72', background: '#e6efeb', icon: House },
  Other: { color: '#737c76', background: '#eceeeb', icon: Tag },
}
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const today = new Date().toISOString().slice(0, 10)

export default function App() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7))
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Groceries')
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [formError, setFormError] = useState('')
  const [adding, setAdding] = useState(false)
  const [notice, setNotice] = useState('')
  const merchantRef = useRef(null)

  useEffect(() => {
    let current = true
    fetchExpenses()
      .then((data) => { if (current) setExpenses(data) })
      .catch((error) => { if (current) setNotice(error.message) })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [])

  const monthOptions = useMemo(() => Array.from({ length: 6 }, (_, offset) => {
    const monthDate = new Date(`${today}T12:00:00`)
    monthDate.setDate(1)
    monthDate.setMonth(monthDate.getMonth() - offset)
    return {
      value: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`,
      label: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(monthDate),
    }
  }), [])

  const monthExpenses = useMemo(
    () => expenses.filter((expense) => expense.date.startsWith(selectedMonth)),
    [expenses, selectedMonth],
  )

  const monthTotal = useMemo(
    () => monthExpenses.reduce((total, expense) => total + Number(expense.amount), 0),
    [monthExpenses],
  )

  const categoryTotals = useMemo(() => {
    const totals = monthExpenses.reduce((result, expense) => {
      result[expense.category] = (result[expense.category] || 0) + Number(expense.amount)
      return result
    }, {})
    return Object.entries(totals).sort((first, second) => second[1] - first[1])
  }, [monthExpenses])

  const weeklySpending = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const day = new Date(`${today}T12:00:00`)
    day.setDate(day.getDate() - 6 + index)
    const dateKey = day.toISOString().slice(0, 10)
    const total = expenses
      .filter((expense) => expense.date === dateKey)
      .reduce((sum, expense) => sum + Number(expense.amount), 0)
    return { label: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(day), amount: total }
  }), [expenses])

  const weekTotal = useMemo(
    () => weeklySpending.reduce((total, day) => total + day.amount, 0),
    [weeklySpending],
  )
  const weekMax = Math.max(1, ...weeklySpending.map((day) => day.amount))
  const [selectedYear, selectedMonthNumber] = selectedMonth.split('-').map(Number)
  const daysInSelectedMonth = new Date(selectedYear, selectedMonthNumber, 0).getDate()
  const elapsedDays = selectedMonth === today.slice(0, 7)
    ? new Date(`${today}T12:00:00`).getDate()
    : daysInSelectedMonth

  const filteredExpenses = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return expenses
      .filter((expense) => activeCategory === 'All' || expense.category === activeCategory)
      .filter((expense) => !normalizedSearch || `${expense.merchant} ${expense.category} ${expense.note}`.toLowerCase().includes(normalizedSearch))
      .sort((first, second) => second.date.localeCompare(first.date))
  }, [expenses, activeCategory, search])

  const handleAddExpense = useCallback(async (event) => {
    event.preventDefault()
    const parsedAmount = Number(amount)
    if (!merchant.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0 || !date) {
      setFormError('Add a name, a valid amount, and a date.')
      return
    }
    setFormError('')
    setAdding(true)
    try {
      const created = await createExpense({
        merchant: merchant.trim(), category, amount: parsedAmount, date, note: note.trim(),
      })
      setExpenses((current) => [created, ...current])
      setMerchant('')
      setAmount('')
      setNote('')
      setNotice('Expense added')
      merchantRef.current?.focus()
    } catch (error) {
      setFormError(error.message || 'That expense could not be saved. Please try again.')
    } finally {
      setAdding(false)
    }
  }, [amount, category, date, merchant, note])

  const handleDeleteExpense = useCallback(async (id) => {
    const previous = expenses
    setExpenses((current) => current.filter((expense) => expense.id !== id))
    try {
      await removeExpense(id)
      setNotice('Expense removed')
    } catch {
      setExpenses(previous)
      setNotice('Could not remove that expense')
    }
  }, [expenses])

  const focusExpenseForm = useCallback(() => {
    merchantRef.current?.focus()
    merchantRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  useEffect(() => {
    if (!notice) return undefined
    const timeout = window.setTimeout(() => setNotice(''), 2600)
    return () => window.clearTimeout(timeout)
  }, [notice])

  const budget = 3000
  const budgetPercent = Math.min((monthTotal / budget) * 100, 100)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="Pennywise home">
          <span className="brand-mark"><Wallet size={19} strokeWidth={2.2} /></span>
          <span>pennywise<span className="brand-period">.</span></span>
        </a>

        <div className="workspace-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          <a className="nav-link active" href="#overview"><LayoutDashboard size={18} /><span>Overview</span></a>
          <a className="nav-link" href="#transactions"><ArrowDownLeft size={18} /><span>Transactions</span><span className="nav-count">{expenses.length}</span></a>
          <a className="nav-link" href="#spending"><Tag size={18} /><span>Categories</span></a>
        </nav>

        <div className="sidebar-bottom">
          <div className="budget-note">
            <div className="budget-note-top"><span className="budget-note-icon"><Sparkles size={15} /></span><span>Monthly budget</span><Ellipsis size={18} /></div>
            <p>A little progress, every day.</p>
            <div className="budget-track"><span style={{ width: `${budgetPercent}%` }} /></div>
            <div className="budget-note-meta"><span>{money.format(Math.max(0, budget - monthTotal))} left</span><span>{Math.round(budgetPercent)}%</span></div>
          </div>
          <button className="profile-button" type="button" aria-label="Account profile">
            <span className="avatar">JD</span>
            <span className="profile-copy"><strong>Jamie Davis</strong><small>Personal account</small></span>
            <Ellipsis size={19} />
          </button>
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>Overview</strong></div>
          <div className="topbar-actions">
            <span className="sync-status"><span /> All changes saved</span>
            <button className="top-add-button" type="button" onClick={focusExpenseForm}><Plus size={16} /> <span>New expense</span></button>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><CalendarDays size={14} /> YOUR MONEY, IN FOCUS</div>
              <h1>Good morning, Jamie <span className="wave">✳</span></h1>
              <p className="welcome-copy">A clear view of where your money goes.</p>
            </div>
              <label className="period-button"><CalendarDays size={16} /><span className="sr-only">Summary month</span><select className="period-select" aria-label="Summary month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>{monthOptions.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}</select><ChevronDown size={15} /></label>
          </section>

          <section className="summary-grid" aria-label="Monthly summary">
            <article className="summary-card primary-summary">
              <div className="summary-label">Total spent this month <span className="summary-icon"><Wallet size={17} /></span></div>
              <div className="summary-value">{money.format(monthTotal)}</div>
              <div className="summary-foot"><span className="neutral-pill">{monthExpenses.length} entries</span><span>tracked this month</span></div>
              <div className="summary-accent" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
            </article>
            <article className="summary-card budget-summary">
              <div className="summary-label">Monthly budget <span className="summary-icon"><CreditCard size={17} /></span></div>
              <div className="summary-value">{money.format(budget)}</div>
              <div className="budget-progress"><span style={{ width: `${budgetPercent}%` }} /></div>
              <div className="summary-foot"><strong>{money.format(Math.max(0, budget - monthTotal))}</strong><span>left to spend</span></div>
            </article>
            <article className="summary-card">
              <div className="summary-label">Daily average <span className="summary-icon"><ArrowUpRight size={17} /></span></div>
              <div className="summary-value">{money.format(monthTotal / Math.max(1, elapsedDays))}</div>
              <div className="summary-foot"><span className="neutral-pill">Daily average</span><span>this month</span></div>
            </article>
          </section>

          <section className="dashboard-grid">
            <div className="primary-column">
              <section className="panel spending-panel" id="spending">
                <div className="panel-heading">
                  <div><h2>Spending rhythm</h2><p>Your day-by-day snapshot</p></div>
                  <button className="icon-button" type="button" aria-label="Spending chart options"><Ellipsis size={20} /></button>
                </div>
                <div className="chart-summary"><span className="chart-total">{money.format(weekTotal)}</span><span className="chart-caption">spent in the last 7 days</span><span className="chart-change">7-day view</span></div>
                <div className="bar-chart" role="img" aria-label="Bar chart showing daily spending this week">
                  {weeklySpending.map((day, index) => (
                    <div className={`chart-day ${index === 6 ? 'highlight-day' : ''}`} key={day.label}>
                      <span className="bar-value">${day.amount.toFixed(2)}</span><div className="bar-track"><span style={{ height: `${(day.amount / weekMax) * 100}%` }} /></div><span className="day-label">{day.label}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="panel transactions-panel" id="transactions">
                <div className="panel-heading transaction-heading">
                  <div><h2>Recent transactions</h2><p>The little things add up</p></div>
                  <a className="text-link" href="#transactions">View all <ArrowRight size={15} /></a>
                </div>
                <div className="transaction-tools">
                  <label className="search-box"><Search size={16} /><input type="search" placeholder="Search expenses" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search expenses" />{search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search"><X size={14} /></button>}</label>
                  <label className="filter-select"><span className="sr-only">Filter by category</span><select value={activeCategory} onChange={(event) => setActiveCategory(event.target.value)}><option>All</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={14} /></label>
                </div>
                <div className="transaction-list">
                  {loading ? <div className="list-message">Getting your expenses ready…</div> : filteredExpenses.length === 0 ? <div className="empty-state"><span className="empty-icon"><Search size={18} /></span><strong>No expenses found</strong><span>Try another search or category.</span></div> : filteredExpenses.slice(0, 8).map((expense) => {
                    const style = categoryStyles[expense.category] || categoryStyles.Other
                    const Icon = style.icon
                    return <article className="transaction-row" key={expense.id}>
                      <span className="transaction-icon" style={{ color: style.color, background: style.background }}><Icon size={17} /></span>
                      <span className="transaction-main"><strong>{expense.merchant}</strong><small>{expense.category}{expense.note ? ` · ${expense.note}` : ''}</small></span>
                      <span className="transaction-date">{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${expense.date}T12:00:00`))}</span>
                      <strong className="transaction-amount">−{money.format(Number(expense.amount))}</strong>
                      <button className="delete-button" type="button" onClick={() => handleDeleteExpense(expense.id)} aria-label={`Delete ${expense.merchant}`} title="Delete expense"><Trash2 size={15} /></button>
                    </article>
                  })}
                </div>
                {!loading && filteredExpenses.length > 8 && <button className="load-more" type="button" onClick={() => setActiveCategory('All')}>Showing your 8 most recent expenses</button>}
              </section>
            </div>

            <aside className="secondary-column">
              <section className="quick-add-panel" aria-labelledby="quick-add-title">
                <div className="quick-add-heading"><span className="quick-add-mark"><Plus size={17} /></span><div><h2 id="quick-add-title">Quick add</h2><p>Log it while it's fresh</p></div></div>
                <form onSubmit={handleAddExpense} noValidate>
                  <label className="field-label" htmlFor="merchant">What was it?</label>
                  <input ref={merchantRef} id="merchant" className="form-input" type="text" placeholder="e.g. Lunch at Olive's" value={merchant} onChange={(event) => setMerchant(event.target.value)} maxLength={60} />
                  <div className="form-row">
                    <div className="form-field"><label className="field-label" htmlFor="amount">Amount</label><div className="amount-input-wrap"><span>$</span><input id="amount" className="amount-input" type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} /></div></div>
                    <div className="form-field"><label className="field-label" htmlFor="expense-date">Date</label><input id="expense-date" className="form-input date-input" type="date" value={date} max={today} onChange={(event) => setDate(event.target.value)} /></div>
                  </div>
                  <label className="field-label" htmlFor="category">Category</label>
                  <div className="category-select-wrap"><select id="category" className="form-input" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={15} /></div>
                  <label className="field-label" htmlFor="note">Note <span className="optional-label">optional</span></label>
                  <input id="note" className="form-input" type="text" placeholder="Add a little detail" value={note} onChange={(event) => setNote(event.target.value)} maxLength={80} />
                  {formError && <p className="form-error" role="alert">{formError}</p>}
                  <button className="submit-button" type="submit" disabled={adding}>{adding ? <span className="button-spinner" /> : <><Plus size={17} /> Add expense</>}</button>
                </form>
                <div className="form-footnote"><Check size={13} /> Saved privately on this device</div>
              </section>

              <section className="panel category-panel">
                <div className="panel-heading"><div><h2>By category</h2><p>Where it went this month</p></div><button className="icon-button" type="button" aria-label="Category options"><Ellipsis size={20} /></button></div>
                {categoryTotals.length === 0 ? <div className="category-empty">Your category breakdown will appear here.</div> : <div className="category-list">{categoryTotals.slice(0, 4).map(([name, total]) => {
                  const style = categoryStyles[name] || categoryStyles.Other
                  const Icon = style.icon
                  return <div className="category-item" key={name}><span className="category-item-icon" style={{ color: style.color, background: style.background }}><Icon size={15} /></span><span className="category-item-name">{name}</span><span className="category-item-amount">{money.format(total)}</span><div className="category-progress"><span style={{ width: `${Math.max(5, (total / (categoryTotals[0]?.[1] || 1)) * 100)}%`, background: style.color }} /></div></div>
                })}</div>}
              </section>
            </aside>
          </section>
          <footer className="page-footer"><span>Made for a little more clarity.</span><span><span className="footer-dot" /> Your data stays on this device</span></footer>
        </div>
      </main>
      {notice && <div className="toast" role="status"><Check size={16} />{notice}</div>}
    </div>
  )
}