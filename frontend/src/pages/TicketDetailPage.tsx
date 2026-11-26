import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'
import type { Ticket, Message, Order, Refund } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import ChatBubble from '../components/ChatBubble'
import { useAuth } from '../contexts/AuthContext'

const statusStyles: Record<string, { color: string; bg: string }> = {
  open:           { color: '#6d28d9', bg: '#f3e8ff' },
  in_progress:    { color: '#1d4ed8', bg: '#dbeafe' },
  pending_review: { color: '#b45309', bg: '#fef3c7' },
  resolved:       { color: '#15803d', bg: '#dcfce7' },
  closed:         { color: '#475569', bg: '#f1f5f9' },
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

  if (loading) return <LoadingSpinner text="Loading ticket details..." />
  if (!ticket) {
    return (
      <div className="page-wrap">
        <ErrorMessage message={error || 'Ticket not found.'} />
        <Link to={isStaff ? '/staff' : '/tickets'} style={{ fontSize: 14, fontWeight: 600 }}>← Back</Link>
      </div>
    )
  }

  const st = statusStyles[ticket.status] || { color: '#475569', bg: '#f1f5f9' }

  return (
    <div className="page-wrap" style={{ maxWidth: 900 }}>
      <Link to={isStaff ? '/staff' : '/tickets'} style={{ fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}>
        ← Back to {isStaff ? 'Staff Panel' : 'Tickets'}
      </Link>

      <div style={{ margin: '14px 0 20px' }}>
        <h1 className="page-title" style={{ marginBottom: 8 }}>#{ticket.id} — {ticket.subject}</h1>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 13, color: '#64748b', alignItems: 'center' }}>
          <span>Category: <strong style={{ color: '#0f172a', textTransform: 'capitalize' }}>{ticket.category}</strong></span>
          <span>·</span>
          <span style={{ background: st.bg, color: st.color, padding: '2px 11px', borderRadius: 20, fontWeight: 600, textTransform: 'capitalize' }}>
            {ticket.status.replace(/_/g, ' ')}
          </span>
          <span>·</span>
          <span>Priority: <strong style={{ color: '#0f172a', textTransform: 'capitalize' }}>{ticket.priority}</strong></span>
          <span>·</span>
          <span>Customer #{ticket.customer_id}</span>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {isStaff && (
        <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', background: '#f8fafc' }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Staff Controls:</div>
          <label style={{ fontSize: 13, fontWeight: 500 }}>
            Status:{' '}
            <select
              className="select"
              style={{ width: 'auto', display: 'inline-block', padding: '6px 10px', fontSize: 13 }}
              disabled={updating}
              value={ticket.status}
              onChange={e => updateTicket(e.target.value, ticket.priority)}
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="pending_review">Pending Review</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <label style={{ fontSize: 13, fontWeight: 500 }}>
            Priority:{' '}
            <select
              className="select"
              style={{ width: 'auto', display: 'inline-block', padding: '6px 10px', fontSize: 13 }}
              disabled={updating}
              value={ticket.priority}
              onChange={e => updateTicket(ticket.status, e.target.value)}
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
          <p className="stat-label" style={{ marginBottom: 6 }}>Issue Description</p>
          <p style={{ fontSize: 14, color: '#334155' }}>{ticket.description}</p>
        </div>
      )}

      {(order || refunds.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }}>
          {order && (
            <div className="card">
              <p className="stat-label" style={{ marginBottom: 8 }}>Linked Order #{order.id}</p>
              <p style={{ fontSize: 14 }}><strong>Status:</strong> {order.status}</p>
              <p style={{ fontSize: 14 }}><strong>Category:</strong> {order.item_category || '—'}</p>
              <p style={{ fontSize: 14 }}><strong>Amount:</strong> ₹{order.total_amount.toFixed(2)}</p>
              <p style={{ fontSize: 14 }}><strong>Delivery Date:</strong> {order.delivery_date || 'Pending'}</p>
            </div>
          )}

          {refunds.map(r => (
            <div key={r.id} className="card">
              <p className="stat-label" style={{ marginBottom: 8 }}>Refund #{r.id}</p>
              <p style={{ fontSize: 14 }}><strong>Amount:</strong> ₹{r.amount.toFixed(2)}</p>
              <p style={{ fontSize: 14 }}><strong>Status:</strong> <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{r.status}</span></p>
              {r.reason && <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{r.reason}</p>}
              {isStaff && (r.status === 'pending' || r.status === 'escalated') && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={() => handleRefundDecision(r.id, 'approved')} className="btn btn-success btn-sm">
                    Approve Refund
                  </button>
                  <button onClick={() => handleRefundDecision(r.id, 'rejected')} className="btn btn-danger btn-sm">
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <p style={{ fontWeight: 700, fontSize: 15 }}>Conversation History</p>
          {!isStaff && (
            <Link to={`/tickets/${id}/chat`} className="btn btn-primary btn-sm">
              Open Full Support Chat →
            </Link>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 380, overflowY: 'auto', marginBottom: 16, padding: 4 }}>
          {messages.length === 0 && (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: 24 }}>
              No messages yet. Start by typing below.
            </p>
          )}
          {messages.map(m => (
            <ChatBubble key={m.id} message={m} currentUserId={user!.id} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <input
            className="input"
            value={msg}
            onChange={e => setMsg(e.target.value)}
            placeholder={isStaff ? 'Write a support staff reply...' : 'Message the support assistant...'}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          />
          <button onClick={sendMessage} disabled={sending || !msg.trim()} className="btn btn-primary">
            {sending ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
