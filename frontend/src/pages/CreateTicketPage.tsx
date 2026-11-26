import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import api from '../api/client'
import type { Order } from '../types'
import ErrorMessage from '../components/ErrorMessage'

export default function CreateTicketPage() {
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('refund')
  const [orderId, setOrderId] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
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
      navigate(`/tickets/${res.data.id}/chat`)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create ticket.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-wrap" style={{ maxWidth: 640 }}>
      <Link to="/tickets" style={{ fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}>← Back to Tickets</Link>
      <div className="page-header" style={{ marginTop: 12 }}>
        <div>
          <h1 className="page-title">Create Support Ticket</h1>
          <p className="page-subtitle">Describe your issue and start chatting with ShopCare AI right away.</p>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      <form onSubmit={handleSubmit} className="card">
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Subject *</label>
          <input className="input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief summary of your issue" required />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 16 }}>
          <div>
            <label className="field-label">Category</label>
            <select className="select" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="refund">Refund</option>
              <option value="shipping">Shipping</option>
              <option value="product">Product Issue</option>
              <option value="payment">Payment</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="field-label">Related Order (optional)</label>
            <select className="select" value={orderId} onChange={e => setOrderId(e.target.value)}>
              <option value="">— Select an order —</option>
              {orders.map(o => (
                <option key={o.id} value={o.id}>#{o.id} — {o.item_category} — ₹{o.total_amount}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label className="field-label">Description</label>
          <textarea
            className="textarea"
            rows={4}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe your issue in detail..."
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Creating...' : 'Create Ticket & Open AI Chat'}
        </button>
      </form>
    </div>
  )
}
