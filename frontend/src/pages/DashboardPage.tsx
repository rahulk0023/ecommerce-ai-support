import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../api/client'
import type { Order, Ticket, Refund } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

const statusStyles: Record<string, { color: string; bg: string }> = {
  delivered:      { color: '#15803d', bg: '#dcfce7' },
  shipped:        { color: '#1d4ed8', bg: '#dbeafe' },
  pending:        { color: '#b45309', bg: '#fef3c7' },
  open:           { color: '#6d28d9', bg: '#f3e8ff' },
  in_progress:    { color: '#1d4ed8', bg: '#dbeafe' },
  resolved:       { color: '#15803d', bg: '#dcfce7' },
  pending_review: { color: '#b45309', bg: '#fef3c7' },
  escalated:      { color: '#6d28d9', bg: '#f3e8ff' },
  approved:       { color: '#15803d', bg: '#dcfce7' },
  rejected:       { color: '#b91c1c', bg: '#fee2e2' },
  cancelled:      { color: '#475569', bg: '#f1f5f9' },
  closed:         { color: '#475569', bg: '#f1f5f9' },
  processed:      { color: '#0d9488', bg: '#ccfbf1' },
}

function Badge({ status }: { status: string }) {
  const st = statusStyles[status] || { color: '#475569', bg: '#f1f5f9' }
  return (
    <span style={{
      background: st.bg, color: st.color,
      padding: '3px 11px', borderRadius: 20, fontSize: 12, fontWeight: 600,
      whiteSpace: 'nowrap', textTransform: 'capitalize'
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

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p className="page-subtitle">Overview of your recent orders, active support tickets, and refund status.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {isStaff && (
            <Link to="/staff" className="btn btn-dark">
              Open Staff Panel
            </Link>
          )}
          <Link to="/orders" className="btn btn-secondary">
            + Add / View Orders
          </Link>
          <Link to="/tickets/new" className="btn btn-primary">
            + New Support Ticket
          </Link>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="stat-grid">
        <div className="stat-card" style={{ borderTopColor: '#4f46e5' }}>
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">{orders.length}</div>
        </div>
        <div className="stat-card" style={{ borderTopColor: '#0d9488' }}>
          <div className="stat-label">Active Tickets</div>
          <div className="stat-value">{openTickets.length}</div>
        </div>
        <div className="stat-card" style={{ borderTopColor: '#d97706' }}>
          <div className="stat-label">Refund Requests</div>
          <div className="stat-value">{refunds.length}</div>
        </div>
      </div>

      <div style={{ marginBottom: 30 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>Recent Orders</h2>
          <Link to="/orders" style={{ fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}>See all →</Link>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 5).map(o => (
                <tr key={o.id}>
                  <td><Link to={`/orders/${o.id}`} style={{ fontWeight: 600, textDecoration: 'none' }}>#{o.id}</Link></td>
                  <td style={{ textTransform: 'capitalize' }}>{o.item_category || '—'}</td>
                  <td style={{ fontWeight: 600, color: '#0f172a' }}>₹{o.total_amount.toFixed(2)}</td>
                  <td><Badge status={o.status} /></td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>No orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginBottom: 30 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>Recent Tickets</h2>
          <Link to="/tickets" style={{ fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}>See all →</Link>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Category</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {tickets.slice(0, 5).map(t => (
                <tr key={t.id}>
                  <td><Link to={`/tickets/${t.id}`} style={{ fontWeight: 600, textDecoration: 'none' }}>#{t.id} {t.subject}</Link></td>
                  <td style={{ textTransform: 'capitalize' }}>{t.category}</td>
                  <td><Badge status={t.status} /></td>
                  <td>{new Date(t.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>No tickets yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>Recent Refunds</h2>
          <Link to="/refunds" style={{ fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}>Track refunds →</Link>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Refund</th>
                <th>Order</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {refunds.slice(0, 5).map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>#{r.id}</td>
                  <td><Link to={`/orders/${r.order_id}`} style={{ fontWeight: 600, textDecoration: 'none' }}>Order #{r.order_id}</Link></td>
                  <td style={{ fontWeight: 600, color: '#0f172a' }}>₹{r.amount.toFixed(2)}</td>
                  <td><Badge status={r.status} /></td>
                </tr>
              ))}
              {refunds.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>No refund requests yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
