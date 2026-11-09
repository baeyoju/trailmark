import { useCallback, useEffect, useState } from 'react'
import { Activity, Clock3, Globe2, Search, ShieldCheck, Trash2, ExternalLink, RotateCw } from 'lucide-react'

const API = 'http://127.0.0.1:5000/api'
const KEY = 'change-this-local-key'
const headers = { 'X-Tracker-Key': KEY }

function hostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}
function timeLabel(value) {
  const date = new Date(value)
  return date.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' })
}

export default function App() {
  const [visits, setVisits] = useState([])
  const [summary, setSummary] = useState({ total_visits: 0, unique_sites: 0, top_sites: [] })
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('loading')
  const [confirmClear, setConfirmClear] = useState(false)

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      const [visitResponse, summaryResponse] = await Promise.all([
        fetch(`${API}/visits?limit=300&q=${encodeURIComponent(query)}`, { headers }),
        fetch(`${API}/summary`, { headers })
      ])
      if (!visitResponse.ok || !summaryResponse.ok) throw new Error('Could not load tracker data')
      setVisits(await visitResponse.json())
      setSummary(await summaryResponse.json())
      setStatus('ready')
    } catch { setStatus('offline') }
  }, [query])

  useEffect(() => { load() }, [load])

  async function clearHistory() {
    try {
      await fetch(`${API}/visits`, { method: 'DELETE', headers })
      setConfirmClear(false)
      await load()
    } catch { setStatus('offline') }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Activity size={19} /></span><span>Trail<span className="brand-light">mark</span></span></div>
      <div className="side-label">YOUR SPACE</div>
      <div className="nav-item active"><Clock3 size={17} /><span>Browsing history</span><span className="nav-count">{summary.total_visits}</span></div>
      <div className="side-bottom"><div className="privacy-card"><ShieldCheck size={18} /><div><strong>Private by design</strong><p>Your history stays on this device.</p></div></div><div className="version">LOCAL TRACKER · V1.0</div></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">Your space <span>/</span> <strong>Browsing history</strong></div><div className="connection"><i className={status === 'ready' ? 'dot online' : 'dot'} />{status === 'ready' ? 'Local service connected' : status === 'offline' ? 'Backend unavailable' : 'Connecting'}</div></header>
      <div className="content">
        <section className="page-heading"><div><div className="eyebrow">PERSONAL ACTIVITY</div><h1>Browsing history</h1><p className="subtitle">A quiet record of the places you’ve been online.</p></div><button className="refresh-button" onClick={load} aria-label="Refresh history"><RotateCw size={16} /> Refresh</button></section>

        {status === 'offline' && <div className="notice"><strong>Can’t connect to the local service.</strong><span>Start Flask in the backend folder, then refresh this page.</span></div>}

        <section className="stats-grid">
          <div className="stat-card"><div className="stat-top"><span>Total visits</span><span className="stat-icon violet"><Activity size={17} /></span></div><div className="stat-value">{summary.total_visits.toLocaleString()}</div><div className="stat-foot">Pages recorded on this device</div></div>
          <div className="stat-card"><div className="stat-top"><span>Unique sites</span><span className="stat-icon blue"><Globe2 size={17} /></span></div><div className="stat-value">{summary.unique_sites.toLocaleString()}</div><div className="stat-foot">Different domains visited</div></div>
          <div className="stat-card top-card"><div className="stat-top"><span>Most visited</span><span className="stat-icon green"><Clock3 size={17} /></span></div>{summary.top_sites[0] ? <><div className="stat-value domain-value">{summary.top_sites[0].domain}</div><div className="stat-foot">{summary.top_sites[0].visits} visits</div></> : <><div className="stat-value empty-stat">—</div><div className="stat-foot">Your top site will appear here</div></>}</div>
        </section>

        <section className="history-panel">
          <div className="panel-heading"><div><h2>Recent activity</h2><p>Your latest pages, across tracked browsers</p></div><div className="panel-actions"><label className="search-box"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search history" /></label><button className="clear-button" onClick={() => setConfirmClear(true)} disabled={!summary.total_visits}><Trash2 size={15} /> Clear</button></div></div>
          <div className="table-head"><span>PAGE</span><span>DEVICE</span><span>LAST VISITED · LOCAL TIME</span></div>
          {visits.length ? <div className="visit-list">{visits.map(visit => <a className="visit-row" href={visit.url} target="_blank" rel="noreferrer" key={visit.id}><span className="favicon-placeholder"><Globe2 size={13} /></span><div className="visit-info"><div className="visit-title">{visit.title || hostname(visit.url)}</div><div className="visit-url">{visit.url}</div></div><div className="visit-device">{visit.device_hostname || 'Unknown device'}</div><div className="visit-time">{timeLabel(visit.visited_at)}</div><ExternalLink className="external" size={14} /></a>)}</div> : <div className="empty-state"><div className="empty-icon"><Globe2 size={22} /></div><strong>{status === 'loading' ? 'Loading your history…' : query ? 'No matching pages' : 'Your trail starts here'}</strong><p>{query ? 'Try a different search.' : 'Visit a page in a tracked browser and it will show up here.'}</p></div>}
          {visits.length > 0 && <div className="list-footer">Showing {visits.length} recent {visits.length === 1 ? 'visit' : 'visits'}{summary.total_visits > visits.length ? ` of ${summary.total_visits.toLocaleString()}` : ''}</div>}
        </section>
        <div className="page-footer"><ShieldCheck size={14} /> Stored locally on your computer <span>·</span> No account required</div>
      </div>
    </main>
    {confirmClear && <div className="modal-backdrop" onClick={() => setConfirmClear(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-icon"><Trash2 size={19} /></div><h3>Clear all browsing history?</h3><p>This permanently removes all recorded pages from this device.</p><div className="modal-actions"><button onClick={() => setConfirmClear(false)}>Cancel</button><button className="danger" onClick={clearHistory}>Clear history</button></div></div></div>}
  </div>
}
