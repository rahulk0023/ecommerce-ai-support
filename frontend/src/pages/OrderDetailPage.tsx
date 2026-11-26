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

  // direct refund request form state
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

  if (loading) return <LoadingSpinner />

  const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f2f2f2', gap: 16 }

  return (
    <div className="page-wrap" style={{ maxWidth: 740 }}>
      <Link to="/orders" style={{ color: '#7c83fd', fontSize: 14, textDecoration: 'none' }}>← Back to Orders</Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '14px 0 20px' }}>Order #{id}</h1>

      {error && <ErrorMessage message={error} />}

      {order && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={row}><span style={{ color: '#888', fontSize: 14 }}>Item</span><span style={{ fontWeight: 500, fontSize: 14 }}>{formatItemDetails(order.item_details)}</span></div>
            <div style={row}><span style={{ color: '#888', fontSize: 14 }}>Status</span><span style={{ fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}>{order.status}</span></div>
            <div style={row}><span style={{ color: '#888', fontSize: 14 }}>Category</span><span style={{ fontWeight: 500, fontSize: 14 }}>{order.item_category || '—'}</span></div>
            <div style={row}><span style={{ color: '#888', fontSize: 14 }}>Total Amount</span><span style={{ fontWeight: 600, fontSize: 14 }}>₹{order.total_amount.toFixed(2)}</span></div>
            <div style={row}><span style={{ color: '#888', fontSize: 14 }}>Delivery Date</span><span style={{ fontWeight: 500, fontSize: 14 }}>{order.delivery_date || 'Not delivered yet'}</span></div>
            <div style={{ ...row, borderBottom: 'none' }}><span style={{ color: '#888', fontSize: 14 }}>Ordered On</span><span style={{ fontWeight: 500, fontSize: 14 }}>{new Date(order.created_at).toLocaleDateString()}</span></div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            <Link
              to="/tickets/new"
              state={{ orderId: order.id }}
              style={{ padding: '10px 20px', background: '#7c83fd', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}
            >
              Raise Support Ticket
            </Link>
            <button
              onClick={() => setShowRefundForm(v => !v)}
              style={{ padding: '10px 20px', background: '#fff', color: '#333', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
            >
              {showRefundForm ? 'Hide Refund Form' : 'Request Refund'}
            </button>
          </div>

          {showRefundForm && (
            <form onSubmit={submitRefund} className="card">
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Submit Refund Request</h3>
              {refundErr && <ErrorMessage message={refundErr} />}

              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, marginBottom: 14, fontSize: 14 }}
                required
              />

              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Reason *</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Explain why you want to return or refund this order..."
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, marginBottom: 14, fontSize: 14, minHeight: 80 }}
                required
              />

              <button
                type="submit"
                disabled={submitting}
                style={{ padding: '10px 22px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
              >
                {submitting ? 'Submitting...' : 'Submit Refund Request'}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  )
}
