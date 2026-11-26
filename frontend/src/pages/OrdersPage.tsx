import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import type { Order } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

const statusColors: Record<string, string> = {
  delivered: '#16a34a', shipped: '#2563eb', pending: '#d97706',
  processing: '#7c3aed', cancelled: '#dc2626', returned: '#6b7280'
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/orders/')
      .then(r => setOrders(r.data))
      .catch(() => setError('Failed to load orders.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>My Orders</h1>

      {error && <ErrorMessage message={error} />}

      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>
          <p style={{ fontSize: 48 }}>📦</p>
          <p>No orders found.</p>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          <thead>
            <tr>
              {['Order ID', 'Category', 'Amount', 'Status', 'Delivery Date', 'Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 16px', background: '#f8f8f8', fontSize: 12, color: '#888', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map(o => {
              const color = statusColors[o.status] || '#888'
              return (
                <tr key={o.id}>
                  <td style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', fontSize: 14 }}>#{o.id}</td>
                  <td style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', fontSize: 14 }}>{o.item_category || '—'}</td>
                  <td style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', fontSize: 14 }}>₹{o.total_amount.toFixed(2)}</td>
                  <td style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', fontSize: 14 }}>
                    <span style={{ background: color + '22', color, padding: '2px 10px', borderRadius: 20, fontSize: 12 }}>{o.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', fontSize: 14 }}>{o.delivery_date || '—'}</td>
                  <td style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', fontSize: 14 }}>
                    <Link to={`/orders/${o.id}`} style={{ color: '#7c83fd', fontSize: 13 }}>View Details</Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
