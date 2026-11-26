import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import type { Ticket } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'

const statusColors: Record<string, string> = {
  open: '#7c3aed', in_progress: '#2563eb', pending_review: '#d97706',
  resolved: '#16a34a', closed: '#6b7280'
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

  if (loading) return <LoadingSpinner />

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Support Tickets</h1>
        <Link to="/tickets/new" style={{ padding: '10px 20px', background: '#7c83fd', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
          + New Ticket
        </Link>
      </div>

      {/* filter buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['', 'open', 'in_progress', 'pending_review', 'resolved', 'closed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13,
              background: filter === f ? '#7c83fd' : '#e8e8e8',
              color: filter === f ? '#fff' : '#555'
            }}
          >
            {f ? f.replace('_', ' ') : 'All'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>
          <p style={{ fontSize: 40 }}>🎫</p>
          <p>No tickets found.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(t => {
            const color = statusColors[t.status] || '#888'
            return (
              <div key={t.id} style={{
                background: '#fff', borderRadius: 10, padding: 20,
                boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>#{t.id} — {t.subject}</div>
                  <div style={{ fontSize: 13, color: '#888' }}>
                    {t.category} · {new Date(t.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ background: color + '22', color, padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>
                    {t.status.replace('_', ' ')}
                  </span>
                  <Link to={`/tickets/${t.id}`} style={{ color: '#7c83fd', fontSize: 13, textDecoration: 'none' }}>
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
