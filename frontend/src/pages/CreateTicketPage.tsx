import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../api/client'
import type { Order } from '../types'
import ErrorMessage from '../components/ErrorMessage'

export default function CreateTicketPage() {
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('other')
  const [orderId, setOrderId] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // pre-fill order if navigated from order detail page
    const prefilledId = location.state?.orderId
    if (prefilledId) setOrderId(String(prefilledId))

    api.get('/orders/').then(r => setOrders(r.data)).catch(() => {})
  }, [location.state])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim()) { setError('Subject is required'); return }
    setLoading(true)
    setError('')
    try {
      const payload: Record<string, any> = { subject, description, category }
      if (orderId) payload.order_id = parseInt(orderId)
      const res = await api.post('/tickets/', payload)
      navigate(`/tickets/${res.data.id}`)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create ticket.')
    } finally {
      setLoading(false)
    }
  }

  const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, marginBottom: 18, boxSizing: 'border-box' }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Create Support Ticket</h1>

      {error && <ErrorMessage message={error} />}

      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>Subject *</label>
        <input style={inp} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief description of your issue" />

        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>Category</label>
        <select style={{ ...inp, background: '#fff' }} value={category} onChange={e => setCategory(e.target.value)}>
          <option value="refund">Refund</option>
          <option value="shipping">Shipping</option>
          <option value="product">Product Issue</option>
          <option value="payment">Payment</option>
          <option value="other">Other</option>
        </select>

        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>Related Order (optional)</label>
        <select style={{ ...inp, background: '#fff' }} value={orderId} onChange={e => setOrderId(e.target.value)}>
          <option value="">— Select an order —</option>
          {orders.map(o => (
            <option key={o.id} value={o.id}>#{o.id} — {o.item_category} — ₹{o.total_amount}</option>
          ))}
        </select>

        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>Description</label>
        <textarea
          style={{ ...inp, minHeight: 120, resize: 'vertical' }}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Describe your issue in detail..."
        />

        <button
          type="submit"
          disabled={loading}
          style={{ padding: '12px 28px', background: '#7c83fd', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
        >
          {loading ? 'Creating...' : 'Submit Ticket'}
        </button>
      </form>
    </div>
  )
}
