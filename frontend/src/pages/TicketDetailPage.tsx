import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'
import type { Ticket, Message, Order, Refund } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import ChatBubble from '../components/ChatBubble'
import { useAuth } from '../contexts/AuthContext'

const statusColors: Record<string, string> = {
  open: '#7c3aed', in_progress: '#2563eb', pending_review: '#d97706',
  resolved: '#16a34a', closed: '#6b7280'
}

export default function TicketDetailPage() {
  const { id } = useParams()
  const { user, isStaff } = useAuth()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [updating, setUpdating] = useState(false)

  const loadDetails = async () => {
    const [tRes, mRes, rRes] = await Promise.all([
      api.get(`/tickets/${id}`),
      api.get(`/messages/ticket/${id}`),
      api.get(`/refunds/?ticket_id=${id}`)
    ])
    const t: Ticket = tRes.data
    setTicket(t)
    setMessages(mRes.data)
    setRefunds(rRes.data)

    if (t.order_id) {
      api.get(`/orders/${t.order_id}`).then(o => setOrder(o.data)).catch(() => {})
    }
  }

  useEffect(() => {
    loadDetails()
      .catch(err => setError(err.response?.data?.detail || 'Failed to load ticket.'))
      .finally(() => setLoading(false))
  }, [id])

  const sendMessage = async () => {
    if (!msg.trim() || sending) return
    setSending(true)
    setError('')
    try {
      const res = await api.post('/messages/', { ticket_id: parseInt(id!), content: msg })
      setMessages(prev => [...prev, ...res.data])
      setMsg('')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send message.')
    } finally {
      setSending(false)
    }
  }

  const updateTicket = async (newStatus: string, newPriority: string) => {
    setUpdating(true)
    try {
      const res = await api.patch(`/tickets/${id}/status`, { status: newStatus, priority: newPriority })
      setTicket(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update ticket.')
    } finally {
      setUpdating(false)
    }
  }

  const handleRefundDecision = async (refundId: number, decision: 'approved' | 'rejected') => {
    try {
      await api.post(`/refunds/${refundId}/review`, { decision })
      await loadDetails()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update refund.')
    }
  }

  if (loading) return <LoadingSpinner />
  if (!ticket) {
    return (
      <div className="page-wrap">
        <ErrorMessage message={error || 'Ticket not found.'} />
        <Link to={isStaff ? '/staff' : '/tickets'} style={{ color: '#7c83fd', fontSize: 14 }}>← Back</Link>
      </div>
    )
  }

  const color = statusColors[ticket.status] || '#888'

  return (
    <div className="page-wrap" style={{ maxWidth: 860 }}>
      <Link to={isStaff ? '/staff' : '/tickets'} style={{ color: '#7c83fd', fontSize: 14, textDecoration: 'none' }}>
        ← Back to {isStaff ? 'Staff Panel' : 'Tickets'}
      </Link>

      <div style={{ margin: '14px 0 20px' }}>
        <h1 style={{ fontSize: 21, fontWeight: 700, marginBottom: 8 }}>#{ticket.id} — {ticket.subject}</h1>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 13, color: '#666', alignItems: 'center' }}>
          <span>Category: <strong>{ticket.category}</strong></span>
          <span>·</span>
          <span style={{ background: color + '22', color, padding: '2px 10px', borderRadius: 20, fontWeight: 600 }}>
            {ticket.status.replace('_', ' ')}
          </span>
          <span>·</span>
          <span>Priority: <strong>{ticket.priority}</strong></span>
          <span>·</span>
          <span>Customer #{ticket.customer_id}</span>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* Staff controls for status & priority */}
      {isStaff && (
        <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', background: '#f8fafc' }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>Staff Controls:</div>
          <label style={{ fontSize: 13 }}>
            Status:{' '}
            <select
              disabled={updating}
              value={ticket.status}
              onChange={e => updateTicket(e.target.value, ticket.priority)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', fontSize: 13 }}
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="pending_review">Pending Review</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <label style={{ fontSize: 13 }}>
            Priority:{' '}
            <select
              disabled={updating}
              value={ticket.priority}
              onChange={e => updateTicket(ticket.status, e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', fontSize: 13 }}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
        </div>
      )}

      {ticket.description && (
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', marginBottom: 6 }}>Issue Description</p>
          <p style={{ fontSize: 14 }}>{ticket.description}</p>
        </div>
      )}

      {/* Order & Refund Context */}
      {(order || refunds.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }}>
          {order && (
            <div className="card">
              <p style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', marginBottom: 8 }}>Linked Order #{order.id}</p>
              <p style={{ fontSize: 14 }}><strong>Status:</strong> {order.status}</p>
              <p style={{ fontSize: 14 }}><strong>Category:</strong> {order.item_category || '—'}</p>
              <p style={{ fontSize: 14 }}><strong>Amount:</strong> ₹{order.total_amount.toFixed(2)}</p>
              <p style={{ fontSize: 14 }}><strong>Delivery Date:</strong> {order.delivery_date || 'Pending'}</p>
            </div>
          )}

          {refunds.map(r => (
            <div key={r.id} className="card">
              <p style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', marginBottom: 8 }}>Refund #{r.id}</p>
              <p style={{ fontSize: 14 }}><strong>Amount:</strong> ₹{r.amount.toFixed(2)}</p>
              <p style={{ fontSize: 14 }}><strong>Status:</strong> {r.status}</p>
              {r.reason && <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{r.reason}</p>}
              {isStaff && (r.status === 'pending' || r.status === 'escalated') && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    onClick={() => handleRefundDecision(r.id, 'approved')}
                    style={{ padding: '6px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                  >
                    Approve Refund
                  </button>
                  <button
                    onClick={() => handleRefundDecision(r.id, 'rejected')}
                    style={{ padding: '6px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Conversation thread */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <p style={{ fontWeight: 600, fontSize: 15 }}>💬 Conversation History</p>
          {!isStaff && (
            <Link to={`/tickets/${id}/chat`} style={{ color: '#7c83fd', fontSize: 13, textDecoration: 'none' }}>
              Open full AI chat →
            </Link>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 380, overflowY: 'auto', marginBottom: 16, padding: 4 }}>
          {messages.length === 0 && (
            <p style={{ color: '#aaa', textAlign: 'center', padding: 24 }}>
              No messages yet. Start by typing below.
            </p>
          )}
          {messages.map(m => (
            <ChatBubble key={m.id} message={m} currentUserId={user!.id} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <input
            style={{ flex: 1, padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
            value={msg}
            onChange={e => setMsg(e.target.value)}
            placeholder={isStaff ? 'Write a support staff reply...' : 'Message the AI support agent...'}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !msg.trim()}
            style={{ padding: '10px 20px', background: '#7c83fd', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
          >
            {sending ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
