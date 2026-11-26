import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'
import type { Message, Ticket, Order, Refund } from '../types'
import ChatBubble from '../components/ChatBubble'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

const QUICK_PROMPTS = [
  'What is your return policy?',
  'Where is my order?',
  'I want a refund',
  'Speak to a human agent',
]

const REFUND_TRIGGER_WORDS = ['refund', 'money back', 'return my order', 'want to return', 'get my money']

const refundStatusBadge: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  escalated: {
    label: 'Escalated to Human Support',
    color: '#6d28d9',
    bg: '#f3e8ff',
    desc: 'Amount exceeds ₹5,000 auto-approval limit. Assigned to support staff for review.',
  },
  pending: {
    label: 'Pending Review',
    color: '#b45309',
    bg: '#fef3c7',
    desc: 'Refund request submitted and queued for review.',
  },
  approved: {
    label: 'Approved',
    color: '#15803d',
    bg: '#dcfce7',
    desc: 'Refund approved automatically (within ₹5,000 limit) or by staff. Credited in 3–5 business days.',
  },
  rejected: {
    label: 'Rejected',
    color: '#b91c1c',
    bg: '#fee2e2',
    desc: 'Refund request was declined.',
  },
  processed: {
    label: 'Processed',
    color: '#0d9488',
    bg: '#ccfbf1',
    desc: 'Refund has been credited.',
  },
}

export default function ChatPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [ticketRefunds, setTicketRefunds] = useState<Refund[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const [showRefundForm, setShowRefundForm] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string>('')
  const [refundAmount, setRefundAmount] = useState<string>('')
  const [refundReason, setRefundReason] = useState<string>('')
  const [refundSubmitting, setRefundSubmitting] = useState(false)
  const [refundFormErr, setRefundFormErr] = useState('')

  const loadChat = async () => {
    const [tRes, mRes, oRes, rRes] = await Promise.all([
      api.get(`/tickets/${id}`),
      api.get(`/messages/ticket/${id}`),
      api.get('/orders/'),
      api.get(`/refunds/?ticket_id=${id}`)
    ])
    const t: Ticket = tRes.data
    const ordList: Order[] = oRes.data
    setTicket(t)
    setMessages(mRes.data)
    setOrders(ordList)
    setTicketRefunds(rRes.data)

    if (!selectedOrderId && ordList.length > 0) {
      const preferred = (t.order_id && ordList.find(o => o.id === t.order_id)) || ordList[0]
      setSelectedOrderId(String(preferred.id))
      setRefundAmount(String(preferred.total_amount))
    }
  }

  useEffect(() => {
    loadChat()
      .catch(() => setError('Failed to load chat conversation.'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, showRefundForm, ticketRefunds])

  const openRefundForm = () => {
    setRefundFormErr('')
    if (!selectedOrderId && orders.length > 0) {
      const preferred = (ticket?.order_id && orders.find(o => o.id === ticket.order_id)) || orders[0]
      setSelectedOrderId(String(preferred.id))
      setRefundAmount(String(preferred.total_amount))
    }
    setShowRefundForm(true)
  }

  const handleOrderChange = (newId: string) => {
    setSelectedOrderId(newId)
    const ord = orders.find(o => o.id === parseInt(newId))
    if (ord) {
      setRefundAmount(String(ord.total_amount))
    }
  }

  const sendText = async (text: string) => {
    if (!text.trim() || sending) return
    const trimmed = text.trim()
    setInput('')
    setError('')
    setSending(true)

    const lower = trimmed.toLowerCase()
    const asksForRefund = REFUND_TRIGGER_WORDS.some(w => lower.includes(w))

    try {
      await api.post('/agent/chat', { ticket_id: parseInt(id!), message: trimmed })
      await loadChat()
      if (asksForRefund) {
        openRefundForm()
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleInChatRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setRefundFormErr('')

    if (!selectedOrderId) {
      setRefundFormErr('Please select an order.')
      return
    }
    const amt = parseFloat(refundAmount)
    if (isNaN(amt) || amt <= 0) {
      setRefundFormErr('Please enter a valid refund amount.')
      return
    }
    if (!refundReason.trim()) {
      setRefundFormErr('Please provide a reason for the refund.')
      return
    }

    setRefundSubmitting(true)
    try {
      await api.post('/refunds/', {
        order_id: parseInt(selectedOrderId),
        ticket_id: parseInt(id!),
        amount: amt,
        reason: refundReason.trim(),
        idempotency_key: `chat-ticket-${id}-order-${selectedOrderId}-u-${user?.id}`,
      })
      setShowRefundForm(false)
      setRefundReason('')
      await loadChat()
    } catch (err: any) {
      setRefundFormErr(err.response?.data?.detail || 'Could not submit refund request.')
    } finally {
      setRefundSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner text="Loading chat..." />

  const numericRefundAmt = parseFloat(refundAmount || '0')
  const willEscalate = !isNaN(numericRefundAmt) && numericRefundAmt > 5000

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', maxWidth: 860, margin: '0 auto', padding: '16px 20px 0' }}>
      <div className="card" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap',
        gap: 10, marginBottom: 12, padding: '14px 18px'
      }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
            Support Chat — Ticket #{id}
          </h2>
          {ticket && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, fontSize: 12.5, color: '#64748b', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 500, color: '#334155' }}>{ticket.subject}</span>
              <span>·</span>
              <span style={{
                background: ticket.status === 'pending_review' ? '#fef3c7' : '#eef2ff',
                color: ticket.status === 'pending_review' ? '#b45309' : '#4f46e5',
                padding: '2px 10px', borderRadius: 12, fontWeight: 600, textTransform: 'capitalize'
              }}>
                {ticket.status.replace(/_/g, ' ')}
              </span>
              {ticket.order_id && (
                <Link to={`/orders/${ticket.order_id}`} style={{ fontWeight: 600, textDecoration: 'none' }}>
                  Order #{ticket.order_id}
                </Link>
              )}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => (showRefundForm ? setShowRefundForm(false) : openRefundForm())}
            className="btn btn-secondary btn-sm"
          >
            {showRefundForm ? 'Hide Refund Form' : 'Refund Form'}
          </button>
          <Link to={`/tickets/${id}`} style={{ fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            ← Ticket details
          </Link>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '6px 4px 16px' }}>
        {messages.length === 0 && !sending && (
          <div className="card" style={{ textAlign: 'center', color: '#64748b', padding: '44px 20px', margin: '12px 0' }}>
            <p style={{ fontWeight: 700, color: '#0f172a', fontSize: 16 }}>Start chatting with ShopCare Support</p>
            <p style={{ fontSize: 13.5, marginTop: 6 }}>
              Ask about your orders, return policy, or type &ldquo;I want a refund&rdquo; to open the refund form.
            </p>
          </div>
        )}

        {messages.map(m => (
          <ChatBubble key={m.id} message={m} currentUserId={user!.id} />
        ))}

        {ticketRefunds.map(rf => {
          const st = refundStatusBadge[rf.status] || {
            label: rf.status, color: '#475569', bg: '#f1f5f9', desc: ''
          }
          return (
            <div
              key={rf.id}
              className="card"
              style={{
                margin: '10px 0',
                padding: '14px 18px',
                borderLeft: `4px solid ${st.color}`,
                background: '#fff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                  Refund #{rf.id} · Order #{rf.order_id} · ₹{rf.amount.toFixed(2)}
                </div>
                <span style={{
                  background: st.bg, color: st.color,
                  padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700
                }}>
                  {st.label}
                </span>
              </div>
              {st.desc && (
                <p style={{ fontSize: 12.5, color: '#475569', marginTop: 6 }}>{st.desc}</p>
              )}
              <div style={{ marginTop: 8, fontSize: 12 }}>
                <Link to="/refunds" style={{ fontWeight: 600, textDecoration: 'none' }}>
                  Track in Refund Center →
                </Link>
              </div>
            </div>
          )
        })}

        {showRefundForm && (
          <div
            className="card"
            style={{
              margin: '10px 0',
              border: '1.5px solid #c7d2fe',
              background: '#fafbff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Submit Refund Request</h3>
                <p style={{ fontSize: 12.5, color: '#64748b' }}>
                  Refunds up to ₹5,000 are approved automatically. Requests above ₹5,000 are escalated to support staff.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRefundForm(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
              >
                ×
              </button>
            </div>

            {refundFormErr && <ErrorMessage message={refundFormErr} />}

            {orders.length === 0 ? (
              <div style={{ fontSize: 13, color: '#64748b', padding: '10px 0' }}>
                You don&apos;t have any orders yet.{' '}
                <Link to="/orders" style={{ fontWeight: 600 }}>Add an order first →</Link>
              </div>
            ) : (
              <form onSubmit={handleInChatRefundSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label className="field-label">Order *</label>
                    <select
                      className="select"
                      value={selectedOrderId}
                      onChange={e => handleOrderChange(e.target.value)}
                      required
                    >
                      {orders.map(o => (
                        <option key={o.id} value={o.id}>
                          Order #{o.id} — {o.item_category || 'Item'} — ₹{o.total_amount.toFixed(2)} ({o.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="field-label">Refund Amount (₹) *</label>
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      min="1"
                      value={refundAmount}
                      onChange={e => setRefundAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {refundAmount && (
                  <div style={{
                    padding: '9px 12px',
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 600,
                    marginBottom: 12,
                    background: willEscalate ? '#f3e8ff' : '#dcfce7',
                    color: willEscalate ? '#6d28d9' : '#15803d',
                    border: `1px solid ${willEscalate ? '#ddd6fe' : '#bbf7d0'}`,
                  }}>
                    {willEscalate
                      ? 'Amount > ₹5,000: This refund will be escalated to human support for review.'
                      : 'Amount ≤ ₹5,000: Eligible for automatic approval (subject to 7-day return window).'}
                  </div>
                )}

                <div style={{ marginBottom: 12 }}>
                  <label className="field-label">Reason for Refund *</label>
                  <textarea
                    className="textarea"
                    rows={2}
                    value={refundReason}
                    onChange={e => setRefundReason(e.target.value)}
                    placeholder="Describe the issue (e.g., damaged on arrival, wrong item, defective)..."
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowRefundForm(false)}
                    className="btn btn-secondary btn-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={refundSubmitting}
                    className="btn btn-primary btn-sm"
                  >
                    {refundSubmitting ? 'Submitting...' : willEscalate ? 'Submit & Escalate Refund' : 'Submit Refund Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {sending && (
          <div style={{ alignSelf: 'flex-start', color: '#4f46e5', fontSize: 13, fontWeight: 500, padding: '8px 12px' }}>
            Support Assistant is typing...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '8px 0' }}>
        {QUICK_PROMPTS.map(prompt => (
          <button
            key={prompt}
            type="button"
            disabled={sending}
            onClick={() => sendText(prompt)}
            style={{
              background: '#fff', border: '1px solid #cbd5e1', borderRadius: 20,
              padding: '6px 13px', fontSize: 12.5, fontWeight: 500, color: '#334155', cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, padding: '12px 0 18px', borderTop: '1px solid #e2e8f0' }}>
        <input
          className="input"
          style={{ borderRadius: 24, padding: '12px 18px' }}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about your order, refund, or return policy..."
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendText(input)}
        />
        <button
          onClick={() => sendText(input)}
          disabled={sending || !input.trim()}
          className="btn btn-primary"
          style={{ borderRadius: 24, padding: '12px 24px' }}
        >
          Send
        </button>
      </div>
    </div>
  )
}
