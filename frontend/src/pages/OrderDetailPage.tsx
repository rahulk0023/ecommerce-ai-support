import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import type { Order } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

function formatItemDetails(raw: string | null) {
  if (!raw) return '—'
  try {
    const parsed = JSON.parse(raw)
    if (parsed.name) {
      return `${parsed.name}${parsed.qty ? ` (Qty: ${parsed.qty})` : ''}`
    }
    return raw
  } catch {
    return raw
  }
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showRefundForm, setShowRefundForm] = useState(false)
  const [reason, setReason] = useState('')
  const [amount, setAmount] = useState('')
  const [refundErr, setRefundErr] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get(`/orders/${id}`)
      .then(r => {
        setOrder(r.data)
        setAmount(String(r.data.total_amount))
      })
      .catch(err => setError(err.response?.data?.detail || 'Failed to load order.'))
      .finally(() => setLoading(false))
  }, [id])

  const submitRefund = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order) return
    if (!reason.trim()) {
      setRefundErr('Please enter a reason for the refund.')
      return
    }
    setRefundErr('')
    setSubmitting(true)
    try {
      await api.post('/refunds/', {
        order_id: order.id,
        amount: parseFloat(amount),
        reason: reason.trim(),
        idempotency_key: `order-${order.id}-user-${order.customer_id}`
      })
      navigate('/refunds')
    } catch (err: any) {
      setRefundErr(err.response?.data?.detail || 'Refund request failed.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner text="Loading order details..." />

  const row: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', padding: '11px 0',
    borderBottom: '1px solid #f1f5f9', gap: 16
  }
  const willEscalate = parseFloat(amount || '0') > 5000

  return (
    <div className="page-wrap" style={{ maxWidth: 760 }}>
      <Link to="/orders" style={{ fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}>← Back to Orders</Link>
      <h1 className="page-title" style={{ margin: '12px 0 20px' }}>Order #{id}</h1>

      {error && <ErrorMessage message={error} />}

      {order && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={row}><span style={{ color: '#64748b', fontSize: 14 }}>Item</span><span style={{ fontWeight: 600, fontSize: 14 }}>{formatItemDetails(order.item_details)}</span></div>
            <div style={row}><span style={{ color: '#64748b', fontSize: 14 }}>Status</span><span style={{ fontWeight: 700, fontSize: 14, textTransform: 'capitalize' }}>{order.status}</span></div>
            <div style={row}><span style={{ color: '#64748b', fontSize: 14 }}>Category</span><span style={{ fontWeight: 500, fontSize: 14, textTransform: 'capitalize' }}>{order.item_category || '—'}</span></div>
            <div style={row}><span style={{ color: '#64748b', fontSize: 14 }}>Total Amount</span><span style={{ fontWeight: 700, fontSize: 15 }}>₹{order.total_amount.toFixed(2)}</span></div>
            <div style={row}><span style={{ color: '#64748b', fontSize: 14 }}>Delivery Date</span><span style={{ fontWeight: 500, fontSize: 14 }}>{order.delivery_date || 'Not delivered yet'}</span></div>
            <div style={{ ...row, borderBottom: 'none' }}><span style={{ color: '#64748b', fontSize: 14 }}>Ordered On</span><span style={{ fontWeight: 500, fontSize: 14 }}>{new Date(order.created_at).toLocaleDateString()}</span></div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            <Link
              to="/tickets/new"
              state={{ orderId: order.id }}
              className="btn btn-primary"
            >
              Raise Support Ticket
            </Link>
            <button
              onClick={() => setShowRefundForm(v => !v)}
              className="btn btn-secondary"
            >
              {showRefundForm ? 'Hide Refund Form' : 'Request Refund'}
            </button>
          </div>

          {showRefundForm && (
            <form onSubmit={submitRefund} className="card">
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Submit Refund Request</h3>
              {refundErr && <ErrorMessage message={refundErr} />}

              <div style={{ marginBottom: 14 }}>
                <label className="field-label">Amount (₹)</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                />
              </div>

              {amount && (
                <div style={{
                  padding: '9px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, marginBottom: 14,
                  background: willEscalate ? '#f3e8ff' : '#dcfce7',
                  color: willEscalate ? '#6d28d9' : '#15803d',
                  border: `1px solid ${willEscalate ? '#ddd6fe' : '#bbf7d0'}`,
                }}>
                  {willEscalate
                    ? 'Amount > ₹5,000: This refund will be escalated to human support for review.'
                    : 'Amount ≤ ₹5,000: Eligible for automatic approval (subject to 7-day return window).'}
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label className="field-label">Reason *</label>
                <textarea
                  className="textarea"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Explain why you want to return or refund this order..."
                  rows={3}
                  required
                />
              </div>

              <button type="submit" disabled={submitting} className="btn btn-success">
                {submitting ? 'Submitting...' : 'Submit Refund Request'}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  )
}
