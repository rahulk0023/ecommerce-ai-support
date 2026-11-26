import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import type { Refund } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

const statusInfo: Record<string, { color: string; bg: string; label: string; step: number }> = {
  pending:   { color: '#b45309', bg: '#fef3c7', label: 'Pending Review',     step: 2 },
  escalated: { color: '#6d28d9', bg: '#f3e8ff', label: 'Escalated to Staff', step: 2 },
  approved:  { color: '#15803d', bg: '#dcfce7', label: 'Approved',           step: 3 },
  rejected:  { color: '#b91c1c', bg: '#fee2e2', label: 'Rejected',           step: 3 },
  processed: { color: '#0d9488', bg: '#ccfbf1', label: 'Processed',          step: 3 },
}

export default function RefundTrackingPage() {
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/refunds/')
      .then(r => setRefunds(r.data))
      .catch(() => setError('Failed to load refund records.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner text="Loading refund tracking..." />

  return (
    <div className="page-wrap" style={{ maxWidth: 860 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Refund Tracking</h1>
          <p className="page-subtitle">Monitor eligibility checks, human escalations, and payout approvals.</p>
        </div>
        <Link to="/orders" className="btn btn-secondary">View Orders</Link>
      </div>

      {error && <ErrorMessage message={error} />}

      {refunds.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 54, color: '#64748b' }}>
          <p style={{ fontWeight: 700, color: '#0f172a', fontSize: 16 }}>No refund requests found.</p>
          <p style={{ fontSize: 13.5, marginTop: 6 }}>
            Open an order or chat with our support assistant to request an eligible refund.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {refunds.map(r => {
            const info = statusInfo[r.status] || { color: '#475569', bg: '#f1f5f9', label: r.status, step: 1 }
            const steps = [
              'Submitted',
              r.status === 'escalated' ? 'Escalated Review' : 'Eligibility Check',
              r.status === 'rejected' ? 'Rejected' : 'Approved / Credited'
            ]
            return (
              <div key={r.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 4 }}>
                      Refund #{r.id} — <Link to={`/orders/${r.order_id}`} style={{ textDecoration: 'none' }}>Order #{r.order_id}</Link>
                      {r.ticket_id && (
                        <> · <Link to={`/tickets/${r.ticket_id}`} style={{ textDecoration: 'none', fontSize: 13.5 }}>Ticket #{r.ticket_id}</Link></>
                      )}
                    </div>
                    <div style={{ color: '#334155', fontSize: 14 }}>
                      Amount: <strong>₹{r.amount.toFixed(2)}</strong>
                    </div>
                    {r.reason && (
                      <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
                        Reason: {r.reason}
                      </div>
                    )}
                    <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 6 }}>
                      Requested on {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>
                  <span style={{
                    background: info.bg, color: info.color,
                    padding: '4px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 700,
                    whiteSpace: 'nowrap'
                  }}>
                    {info.label}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 16, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
                  {steps.map((label, idx) => {
                    const active = idx + 1 <= info.step
                    const barColor = r.status === 'rejected' && idx === 2 ? '#dc2626' : active ? '#4f46e5' : '#e2e8f0'
                    return (
                      <div key={label}>
                        <div style={{ height: 6, borderRadius: 4, background: barColor, marginBottom: 6 }} />
                        <div style={{ fontSize: 11.5, color: active ? '#0f172a' : '#94a3b8', fontWeight: active ? 600 : 400 }}>
                          {label}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
