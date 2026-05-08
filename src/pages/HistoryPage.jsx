import { useState, useEffect } from 'react'
import { HISTORY_LOGS } from '../utils/mockData'
import { pageEntrance } from '../utils/animations'
import { Download, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'

const STATUS_STYLE = {
  normal:   { color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  overload: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  smoke:    { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
}

const PER_PAGE = 12

export default function HistoryPage() {
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState('all')
  const [page, setPage]       = useState(1)

  useEffect(() => { pageEntrance('#history-page') }, [])

  const filtered = HISTORY_LOGS.filter(r => {
    const matchFilter = filter === 'all' || r.status === filter
    const q = search.toLowerCase()
    const matchSearch = !q || r.device.toLowerCase().includes(q) || r.status.includes(q) || r.timestamp.includes(q)
    return matchFilter && matchSearch
  })

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const rows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const handleExport = () => {
    const csv = [
      ['ID','Timestamp','Device','Voltage(V)','Current(A)','Power(W)','Energy(kWh)','PF','Status'].join(','),
      ...filtered.map(r => [r.id, r.timestamp, r.device, r.voltage, r.current, r.power, r.energy, r.powerFactor, r.status].join(','))
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'history.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const COL = { fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '10px 14px', whiteSpace: 'nowrap' }
  const CELL = { fontSize: 12, color: '#cbd5e1', padding: '10px 14px', whiteSpace: 'nowrap', fontFamily: 'monospace' }

  return (
    <div id="history-page" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div className="a-title" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9' }}>History & Logs</h2>
          <p style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>{filtered.length} record ditemukan</p>
        </div>
        <button onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px', borderRadius: 10, fontSize: 12, fontWeight: 700, color: '#020617', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #38BDF8, #22D3EE)', boxShadow: '0 0 14px rgba(56,189,248,0.3)' }}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="a-metric glass-card" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9, padding: '8px 12px', flex: '1 1 200px', minWidth: 0 }}>
          <Search size={13} color="#475569" style={{ flexShrink: 0 }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Cari device, status, waktu…" style={{ background: 'transparent', border: 'none', outline: 'none', color: '#f1f5f9', fontSize: 12, width: '100%' }} />
        </div>
        {/* Status Filter */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['all','normal','overload','smoke'].map(f => (
            <button key={f} onClick={() => { setFilter(f); setPage(1) }} style={{ fontSize: 11, fontWeight: 600, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: filter === f ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.04)', color: filter === f ? '#38BDF8' : '#475569', transition: 'all 0.18s', textTransform: 'capitalize' }}>
              {f === 'all' ? 'Semua' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="a-chart glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['#','Timestamp','Device','Voltage','Current','Power','Energy','PF','Status'].map(h => (
                  <th key={h} style={COL}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#475569', fontSize: 13 }}>Tidak ada data ditemukan</td></tr>
              ) : rows.map((r, i) => {
                const ss = STATUS_STYLE[r.status] || STATUS_STYLE.normal
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...CELL, color: '#334155' }}>{r.id}</td>
                    <td style={{ ...CELL, fontSize: 11 }}>{r.timestamp}</td>
                    <td style={{ ...CELL, color: '#38BDF8', fontWeight: 600 }}>{r.device}</td>
                    <td style={CELL}>{r.voltage}V</td>
                    <td style={CELL}>{r.current}A</td>
                    <td style={CELL}>{r.power}W</td>
                    <td style={CELL}>{r.energy} kWh</td>
                    <td style={CELL}>{r.powerFactor}</td>
                    <td style={{ ...CELL }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: ss.bg, color: ss.color, textTransform: 'capitalize' }}>{r.status}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontSize: 11, color: '#475569' }}>Hal {page} dari {totalPages} · {filtered.length} record</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.04)', cursor: page <= 1 ? 'not-allowed' : 'pointer', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, opacity: page <= 1 ? 0.4 : 1 }}>
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = i + 1 + Math.max(0, page - 3)
              if (p > totalPages) return null
              return (
                <button key={p} onClick={() => setPage(p)} style={{ width: 30, height: 30, borderRadius: 7, border: p === page ? '1px solid rgba(56,189,248,0.4)' : '1px solid rgba(255,255,255,0.06)', background: p === page ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.04)', cursor: 'pointer', color: p === page ? '#38BDF8' : '#475569', fontSize: 11, fontWeight: p === page ? 700 : 400 }}>
                  {p}
                </button>
              )
            })}
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.04)', cursor: page >= totalPages ? 'not-allowed' : 'pointer', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page >= totalPages ? 0.4 : 1 }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
