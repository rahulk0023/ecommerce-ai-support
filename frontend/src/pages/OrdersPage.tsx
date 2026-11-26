import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import type { Order } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

const statusStyles: Record<string, { color: string; bg: string }> = {
  delivered:  { color: '#15803d', bg: '#dcfce7' },
  shipped:    { color: '#1d4ed8', bg: '#dbeafe' },
  pending:    { color: '#b45309', bg: '#fef3c7' },
  processing: { color: '#6d28d9', bg: '#f3e8ff' },
  cancelled:  { color: '#b91c1c', bg: '#fee2e2' },
  returned:   { color: '#475569', bg: '#f1f5f9' },
}

function formatItemName(raw: string | null) {
  if (!raw) return '—'
  try {
    const parsed = JSON.parse(raw)
    return parsed.name || raw
  } catch {
    return raw
  }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showAddModal, setShowAddModal] = useState(false)
  const [itemName, setItemName] = useState('')
  const [category, setCategory] = useState('electronics')
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState<'delivered' | 'shipped' | 'processing' | 'pending'>('delivered')
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().split('T')[0])
  const [formErr, setFormErr] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadOrders = async () => {
    const r = await api.get('/orders/')
    setOrders(r.data)
  }

  useEffect(() => {
    loadOrders()
      .catch(() => setError('Failed to load orders.'))
      .finally(() => setLoading(false))
  }, [])

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormErr('')
    const numericAmount = parseFloat(amount)
    if (!itemName.trim()) {
      setFormErr('Please enter an item name.')
      return
    }
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setFormErr('Please enter a valid order amount greater than 0.')
      return
    }

    setSubmitting(true)
    try {
      await api.post('/orders/', {
        item_details: itemName.trim(),
        item_category: category,
        total_amount: numericAmount,
        status,
        delivery_date: status === 'delivered' && deliveryDate ? deliveryDate : null,
      })
      setShowAddModal(false)
      setItemName('')
      setAmount('')
      await loadOrders()
    } catch (err: any) {
      setFormErr(err.response?.data?.detail || 'Failed to add order.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner text="Loading your orders..." />

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Orders</h1>
          <p className="page-subtitle">View your purchases, check delivery status, or add a new order.</p>
        </div>
        <button
          onClick={() => { setFormErr(''); setShowAddModal(true) }}
          className="btn btn-primary"
        >
          + Add Order
        </button>
      </div>

      {error && <ErrorMessage message={error} />}

      {orders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '56px 24px' }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>No orders found yet</p>
          <p style={{ fontSize: 13.5, color: '#64748b', margin: '6px 0 18px' }}>
            Add an order to track deliveries, raise support tickets, or test refund workflows.
          </p>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            + Add Your First Order
          </button>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Item</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Delivery Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => {
                const st = statusStyles[o.status] || { color: '#475569', bg: '#f1f5f9' }
                return (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>#{o.id}</td>
                    <td style={{ fontWeight: 500, color: '#0f172a' }}>{formatItemName(o.item_details)}</td>
                    <td style={{ textTransform: 'capitalize' }}>{o.item_category || '—'}</td>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>₹{o.total_amount.toFixed(2)}</td>
                    <td>
                      <span style={{
                        background: st.bg, color: st.color,
                        padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, textTransform: 'capitalize'
                      }}>
                        {o.status}
                      </span>
                    </td>
                    <td>{o.delivery_date || '—'}</td>
                    <td>
                      <Link to={`/orders/${o.id}`} style={{ fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                        View Details →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h2 style={{ fontSize: 19, fontWeight: 700 }}>Add New Order</h2>
                <p style={{ fontSize: 13, color: '#64748b' }}>Create an order on your account for tracking or support.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}
              >
                ×
              </button>
            </div>

            {formErr && <ErrorMessage message={formErr} />}

            <form onSubmit={handleCreateOrder}>
              <div style={{ marginBottom: 14 }}>
                <label className="field-label">Item Name *</label>
                <input
                  className="input"
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                  placeholder="e.g. Wireless Noise-Cancelling Headphones"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label className="field-label">Category *</label>
                  <select className="select" value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="electronics">Electronics</option>
                    <option value="clothing">Clothing</option>
                    <option value="home">Home Appliances</option>
                    <option value="books">Books & Stationery</option>
                    <option value="food">Food / Perishable</option>
                  </select>
                </div>

                <div>
                  <label className="field-label">Total Amount (₹) *</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    min="1"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="e.g. 6500"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                <div>
                  <label className="field-label">Order Status</label>
                  <select
                    className="select"
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                  >
                    <option value="delivered">Delivered</option>
                    <option value="shipped">Shipped</option>
                    <option value="processing">Processing</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                {status === 'delivered' && (
                  <div>
                    <label className="field-label">Delivery Date</label>
                    <input
                      className="input"
                      type="date"
                      value={deliveryDate}
                      onChange={e => setDeliveryDate(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Adding...' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
