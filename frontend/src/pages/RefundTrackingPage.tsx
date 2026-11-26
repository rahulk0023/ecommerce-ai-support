import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import type { Refund } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

const statusInfo: Record<string, { color: string; label: string; icon: string; step: number }> = {
  pending:   { color: '#d97706', label: 'Pending Review', icon: '⏳', step: 2 },
  escalated: { color: '#7c3aed', label: 'Escalated to Staff', icon: '👤', step: 2 },
  approved:  { color: '#16a34a', label: 'Approved', icon: '✅', step: 3 },
  rejected:  { color: '#dc2626', label: 'Rejected', icon: '❌', step: 3 },
  processed: { color: '#2563eb', label: 'Processed', icon: '💰', step: 3 },
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

  if (loading) return <LoadingSpinner />

  return (
    <div className="page-wrap" style={{ maxWidth: 820 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Refund Tracking</h1>

      {error && <ErrorMessage message={error} />}

      {refunds.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 50, color: '#888' }}>
          <p style={{ fontSize: 40, marginBottom: 8 }}>💸</p>
          <p>No refund requests found.</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>
            Open an order or chat with our AI agent to request an eligible refund.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {refunds.map(r => {
            const info = statusInfo[r.status] || { color: '#888', label: r.status, icon: '?', step: 1 }
            const steps = [
              'Submitted',
              r.status === 'escalated' ? 'Escalated Review' : 'Eligibility Check',
              r.status === 'rejected' ? 'Rejected' : 'Approved / Credited'
            ]
            return (
              <div key={r.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                      Refund #{r.id} — <Link to={`/orders/${r.order_id}`} style={{ color: '#7c83fd', textDecoration: 'none' }}>Order #{r.order_id}</Link>
                      {r.ticket_id && (
                        <> · <Link to={`/tickets/${r.ticket_id}`} style={{ color: '#7c83fd', textDecoration: 'none', fontSize: 13 }}>Ticket #{r.ticket_id}</Link></>
                      )}
                    </div>
                    <div style={{ color: '#333', fontSize: 14 }}>
                      Amount: <strong>₹{r.amount.toFixed(2)}</strong>
                    </div>
                    {r.reason && (
                      <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
                        Reason: {r.reason}
                      </div>
                    )}
                    <div style={{ color: '#999', fontSize: 12, marginTop: 6 }}>
                      Requested on {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>
                  <span style={{
                    background: info.color + '22', color: info.color,
                    padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                    whiteSpace: 'nowrap'
                  }}>
                    {info.icon} {info.label}
                  </span>
                </div>

                {/* simple 3-step progress bar */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 16, paddingTop: 14, borderTop: '1px solid #f0f0f0' }}>
                  {steps.map((label, idx) => {
                    const active = idx + 1 <= info.step
                    const barColor = r.status === 'rejected' && idx === 2 ? '#dc2626' : active ? '#7c83fd' : '#e5e7eb'
                    return (
                      <div key={label}>
                        <div style={{ height: 5, borderRadius: 4, background: barColor, marginBottom: 5 }} />
                        <div style={{ fontSize: 11, color: active ? '#333' : '#999', fontWeight: active ? 600 : 400 }}>
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
