import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../api/client'
import type { Order, Ticket, Refund } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

const statusColor: Record<string, string> = {
  delivered: '#16a34a', shipped: '#2563eb', pending: '#d97706',
  open: '#7c3aed', in_progress: '#2563eb', resolved: '#16a34a',
  pending_review: '#d97706', escalated: '#7c3aed', approved: '#16a34a',
  rejected: '#dc2626', cancelled: '#6b7280', closed: '#6b7280'
}

function Badge({ status }: { status: string }) {
  const color = statusColor[status] || '#888'
  return (
    <span style={{
      background: color + '22', color,
      padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap'
    }}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export default function DashboardPage() {
  const { user, isStaff } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/orders/').then(r => setOrders(r.data)),
      api.get('/tickets/').then(r => setTickets(r.data)),
      api.get('/refunds/').then(r => setRefunds(r.data))
    ])
      .catch(() => setError('Could not load dashboard data. Please refresh.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner text="Loading dashboard..." />

  const openTickets = tickets.filter(t => ['open', 'in_progress', 'pending_review'].includes(t.status))

  const th: React.CSSProperties = {
    textAlign: 'left', padding: '12px 16px', background: '#f8f8f8',
    fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5
  }
  const td: React.CSSProperties = { padding: '12px 16px', borderTop: '1px solid #f0f0f0', fontSize: 14 }

  return (
    <div className="page-wrap">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            Hello, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ color: '#666', fontSize: 14 }}>Here is an overview of your orders, tickets, and refunds.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {isStaff && (
            <Link to="/staff" style={{ padding: '9px 16px', background: '#1a1a2e', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
              Open Staff Panel
            </Link>
          )}
          <Link to="/tickets/new" style={{ padding: '9px 16px', background: '#7c83fd', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            + New Support Ticket
          </Link>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total Orders', value: orders.length },
          { label: 'Active Tickets', value: openTickets.length },
          { label: 'Refund Requests', value: refunds.length },
        ].map(c => (
          <div key={c.label} className="card">
            <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: '#1a1a2e' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* recent orders */}
      <div style={{ marginBottom: 30 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 17, fontWeight: 600 }}>Recent Orders</span>
          <Link to="/orders" style={{ color: '#7c83fd', textDecoration: 'none', fontSize: 14 }}>See all →</Link>
        </div>
        <div className="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Order ID</th>
                <th style={th}>Category</th>
                <th style={th}>Amount</th>
                <th style={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 5).map(o => (
                <tr key={o.id}>
                  <td style={td}><Link to={`/orders/${o.id}`} style={{ color: '#7c83fd', fontWeight: 500 }}>#{o.id}</Link></td>
                  <td style={td}>{o.item_category || '—'}</td>
                  <td style={td}>₹{o.total_amount.toFixed(2)}</td>
                  <td style={td}><Badge status={o.status} /></td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: '#aaa' }}>No orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* recent tickets */}
      <div style={{ marginBottom: 30 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 17, fontWeight: 600 }}>Recent Tickets</span>
          <Link to="/tickets" style={{ color: '#7c83fd', textDecoration: 'none', fontSize: 14 }}>See all →</Link>
        </div>
        <div className="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Ticket</th>
                <th style={th}>Category</th>
                <th style={th}>Status</th>
                <th style={th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {tickets.slice(0, 5).map(t => (
                <tr key={t.id}>
                  <td style={td}><Link to={`/tickets/${t.id}`} style={{ color: '#7c83fd', fontWeight: 500 }}>#{t.id} {t.subject}</Link></td>
                  <td style={td}>{t.category}</td>
                  <td style={td}><Badge status={t.status} /></td>
                  <td style={td}>{new Date(t.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: '#aaa' }}>No tickets yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* refund statuses */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 17, fontWeight: 600 }}>Recent Refunds</span>
          <Link to="/refunds" style={{ color: '#7c83fd', textDecoration: 'none', fontSize: 14 }}>Track refunds →</Link>
        </div>
        <div className="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Refund</th>
                <th style={th}>Order</th>
                <th style={th}>Amount</th>
                <th style={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {refunds.slice(0, 5).map(r => (
                <tr key={r.id}>
                  <td style={td}>#{r.id}</td>
                  <td style={td}><Link to={`/orders/${r.order_id}`} style={{ color: '#7c83fd' }}>Order #{r.order_id}</Link></td>
                  <td style={td}>₹{r.amount.toFixed(2)}</td>
                  <td style={td}><Badge status={r.status} /></td>
                </tr>
              ))}
              {refunds.length === 0 && (
                <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: '#aaa' }}>No refund requests yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
