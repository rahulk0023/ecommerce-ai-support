import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import type { Ticket } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'

const statusStyles: Record<string, { color: string; bg: string }> = {
  open:           { color: '#6d28d9', bg: '#f3e8ff' },
  in_progress:    { color: '#1d4ed8', bg: '#dbeafe' },
  pending_review: { color: '#b45309', bg: '#fef3c7' },
  resolved:       { color: '#15803d', bg: '#dcfce7' },
  closed:         { color: '#475569', bg: '#f1f5f9' },
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    api.get('/tickets/')
      .then(r => setTickets(r.data))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter ? tickets.filter(t => t.status === filter) : tickets

  if (loading) return <LoadingSpinner text="Loading tickets..." />

  return (
    <div className="page-wrap" style={{ maxWidth: 940 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Support Tickets</h1>
          <p className="page-subtitle">Chat with our support assistant or track ongoing support requests.</p>
        </div>
        <Link to="/tickets/new" className="btn btn-primary">
          + New Ticket
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['', 'open', 'in_progress', 'pending_review', 'resolved', 'closed'].map(f => {
          const active = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px', borderRadius: 20,
                border: active ? '1px solid #4f46e5' : '1px solid #cbd5e1',
                cursor: 'pointer', fontSize: 13, fontWeight: 600, textTransform: 'capitalize',
                background: active ? '#4f46e5' : '#fff',
                color: active ? '#fff' : '#475569',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {f ? f.replace(/_/g, ' ') : 'All'}
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 54, color: '#64748b' }}>
          <p style={{ fontWeight: 700, color: '#0f172a', fontSize: 16 }}>No tickets found.</p>
          <p style={{ fontSize: 13.5, marginTop: 6 }}>Create a new support ticket to get help with an order or refund.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(t => {
            const st = statusStyles[t.status] || { color: '#475569', bg: '#f1f5f9' }
            return (
              <div key={t.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 4 }}>#{t.id} — {t.subject}</div>
                  <div style={{ fontSize: 13, color: '#64748b', textTransform: 'capitalize' }}>
                    {t.category}{t.order_id ? ` · Order #${t.order_id}` : ''} · {new Date(t.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    background: st.bg, color: st.color,
                    padding: '3px 11px', borderRadius: 20, fontSize: 12, fontWeight: 600, textTransform: 'capitalize'
                  }}>
                    {t.status.replace(/_/g, ' ')}
                  </span>
                  <Link to={`/tickets/${t.id}/chat`} className="btn btn-secondary btn-sm">
                    Open Chat
                  </Link>
                  <Link to={`/tickets/${t.id}`} style={{ fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}>
                    View →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
