import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import type { Ticket, Escalation, Refund, Message, Order } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

interface ContextBundle {
  ticket?: Ticket
  order?: Order | null
  messages: Message[]
}

const badgeColors: Record<string, string> = {
  open: '#7c3aed', in_progress: '#2563eb', pending_review: '#d97706',
  resolved: '#16a34a', closed: '#6b7280',
  pending: '#d97706', escalated: '#7c3aed', approved: '#16a34a', rejected: '#dc2626',
  needs_info: '#d97706', processed: '#2563eb'
}

export default function StaffDashboardPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [escalations, setEscalations] = useState<Escalation[]>([])
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'escalations' | 'tickets' | 'refunds'>('escalations')

  // escalation notes + inline context viewer
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [contexts, setContexts] = useState<Record<number, ContextBundle>>({})
  const [openContextId, setOpenContextId] = useState<number | null>(null)

  // ticket search & filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')

  const loadAll = async () => {
    const [tRes, eRes, rRes] = await Promise.all([
      api.get('/tickets/'),
      api.get('/escalations/'),
      api.get('/refunds/')
    ])
    setTickets(tRes.data)
    setEscalations(eRes.data)
    setRefunds(rRes.data)
  }

  useEffect(() => {
    loadAll()
      .catch(() => setError('Failed to load staff dashboard data.'))
      .finally(() => setLoading(false))
  }, [])

  const handleReviewEscalation = async (escId: number, decision: string) => {
    setError('')
    try {
      await api.post(`/escalations/${escId}/review`, {
        decision,
        internal_note: notes[escId] || ''
      })
      await loadAll()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Escalation review failed.')
    }
  }

  const handleReviewRefund = async (refundId: number, decision: 'approved' | 'rejected') => {
    setError('')
    try {
      await api.post(`/refunds/${refundId}/review`, { decision })
      await loadAll()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Refund review failed.')
    }
  }

  const handleTicketUpdate = async (ticketId: number, status: string, priority: string) => {
    setError('')
    try {
      await api.patch(`/tickets/${ticketId}/status`, { status, priority })
      setTickets(prev => prev.map(t => (t.id === ticketId ? { ...t, status: status as any, priority: priority as any } : t)))
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update ticket.')
    }
  }

  const toggleInspectContext = async (esc: Escalation) => {
    if (openContextId === esc.id) {
      setOpenContextId(null)
      return
    }
    setOpenContextId(esc.id)
    if (contexts[esc.id]) return

    try {
      const [tRes, mRes] = await Promise.all([
        api.get(`/tickets/${esc.ticket_id}`),
        api.get(`/messages/ticket/${esc.ticket_id}`)
      ])
      const t: Ticket = tRes.data
      let ord: Order | null = null
      if (t.order_id) {
        ord = await api.get(`/orders/${t.order_id}`).then(r => r.data).catch(() => null)
      }
      setContexts(prev => ({
        ...prev,
        [esc.id]: { ticket: t, order: ord, messages: mRes.data }
      }))
    } catch {
      setError('Could not load ticket context.')
    }
  }

  if (loading) return <LoadingSpinner text="Loading staff dashboard..." />

  const pendingEscalations = escalations.filter(e => e.decision === 'pending')
  const pendingRefunds = refunds.filter(r => r.status === 'pending' || r.status === 'escalated')

  const filteredTickets = tickets.filter(t => {
    if (statusFilter && t.status !== statusFilter) return false
    if (priorityFilter && t.priority !== priorityFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const hit =
        t.subject.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        String(t.id) === q.replace('#', '')
      if (!hit) return false
    }
    return true
  })

  const tabStyle = (key: 'escalations' | 'tickets' | 'refunds'): React.CSSProperties => ({
    padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
    fontSize: 14, fontWeight: activeTab === key ? 700 : 500,
    color: activeTab === key ? '#7c83fd' : '#666',
    borderBottom: activeTab === key ? '2px solid #7c83fd' : '2px solid transparent',
  })

  return (
    <div className="page-wrap">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Internal Support Dashboard</h1>
          <p style={{ color: '#666', fontSize: 14 }}>Review escalations, inspect order & chat context, manage tickets, and approve refunds.</p>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* quick summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div className="card">
          <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase' }}>Pending Escalations</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#dc2626' }}>{pendingEscalations.length}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase' }}>Total Tickets</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a2e' }}>{tickets.length}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase' }}>Pending Refunds</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#d97706' }}>{pendingRefunds.length}</div>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: 22, overflowX: 'auto' }}>
        <button style={tabStyle('escalations')} onClick={() => setActiveTab('escalations')}>
          Escalations ({pendingEscalations.length} pending)
        </button>
        <button style={tabStyle('tickets')} onClick={() => setActiveTab('tickets')}>
          All Tickets ({tickets.length})
        </button>
        <button style={tabStyle('refunds')} onClick={() => setActiveTab('refunds')}>
          Refund Requests ({refunds.length})
        </button>
      </div>

      {/* TAB 1: ESCALATIONS */}
      {activeTab === 'escalations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {escalations.length === 0 && (
            <div className="card" style={{ textAlign: 'center', color: '#888', padding: 48 }}>
              No escalations yet. High-value refunds (&gt; ₹5,000) or manual escalations appear here.
            </div>
          )}

          {escalations.map(esc => {
            const ctx = contexts[esc.id]
            const decColor = badgeColors[esc.decision] || '#666'
            return (
              <div key={esc.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                  <div>
                    <span style={{ fontWeight: 700 }}>Escalation #{esc.id}</span>
                    {' — '}
                    <Link to={`/tickets/${esc.ticket_id}`} style={{ color: '#7c83fd', fontSize: 14, fontWeight: 500 }}>
                      Ticket #{esc.ticket_id}
                    </Link>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{
                      background: esc.priority === 'high' ? '#fef2f2' : '#fffbeb',
                      color: esc.priority === 'high' ? '#dc2626' : '#d97706',
                      padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600
                    }}>
                      {esc.priority} priority
                    </span>
                    <span style={{
                      background: decColor + '22', color: decColor,
                      padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600
                    }}>
                      {esc.decision.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <p style={{ color: '#333', fontSize: 14, marginBottom: 10 }}>{esc.summary}</p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 12, color: '#888' }}>
                    Created: {new Date(esc.created_at).toLocaleString()}
                    {esc.internal_note && ` · Note: "${esc.internal_note}"`}
                  </span>
                  <button
                    onClick={() => toggleInspectContext(esc)}
                    style={{
                      padding: '5px 12px', background: '#f3f4f6', border: '1px solid #d1d5db',
                      borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600
                    }}
                  >
                    {openContextId === esc.id ? 'Hide Context' : 'Inspect Order & Chat Context'}
                  </button>
                </div>

                {/* inline order & conversation context */}
                {openContextId === esc.id && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, marginBottom: 14 }}>
                    {!ctx ? (
                      <p style={{ fontSize: 13, color: '#888' }}>Loading context...</p>
                    ) : (
                      <>
                        {ctx.order ? (
                          <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #e5e7eb', fontSize: 13 }}>
                            <strong>Order #{ctx.order.id}:</strong> {ctx.order.item_category} · ₹{ctx.order.total_amount.toFixed(2)} · Status: <em>{ctx.order.status}</em> · Delivered: {ctx.order.delivery_date || 'N/A'}
                          </div>
                        ) : (
                          <div style={{ marginBottom: 10, fontSize: 13, color: '#888' }}>No order attached to Ticket #{esc.ticket_id}.</div>
                        )}
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>Recent Messages:</div>
                        {ctx.messages.length === 0 ? (
                          <p style={{ fontSize: 12, color: '#888' }}>No messages on this ticket.</p>
                        ) : (
                          <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {ctx.messages.slice(-6).map(m => (
                              <div key={m.id} style={{ fontSize: 12, background: '#fff', padding: '6px 10px', borderRadius: 6, border: '1px solid #eee' }}>
                                <strong>{m.sender_type}:</strong> {m.content}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {esc.decision === 'pending' && (
                  <div>
                    <textarea
                      value={notes[esc.id] || ''}
                      onChange={e => setNotes(prev => ({ ...prev, [esc.id]: e.target.value }))}
                      placeholder="Add internal review note..."
                      style={{
                        width: '100%', padding: 10, border: '1px solid #d1d5db',
                        borderRadius: 8, fontSize: 13, minHeight: 64,
                        marginBottom: 10, resize: 'vertical'
                      }}
                    />
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleReviewEscalation(esc.id, 'approved')}
                        style={{ padding: '8px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleReviewEscalation(esc.id, 'rejected')}
                        style={{ padding: '8px 18px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                      >
                        ✗ Reject
                      </button>
                      <button
                        onClick={() => handleReviewEscalation(esc.id, 'needs_info')}
                        style={{ padding: '8px 18px', background: '#d97706', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                      >
                        ? Request Info
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* TAB 2: ALL TICKETS */}
      {activeTab === 'tickets' && (
        <div>
          <div className="card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by ticket #, subject, or description..."
              style={{ flex: '1 1 220px', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
            />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff' }}
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="pending_review">Pending Review</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              style={{ padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff' }}
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {filteredTickets.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: '#888', padding: 40 }}>
              No tickets match your filters.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredTickets.map(t => (
                <div key={t.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ flex: '1 1 260px' }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>#{t.id} — {t.subject}</div>
                    <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                      {t.category} · Customer #{t.customer_id}
                      {t.order_id ? ` · Order #${t.order_id}` : ''} · {new Date(t.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <select
                      value={t.status}
                      onChange={e => handleTicketUpdate(t.id, e.target.value, t.priority)}
                      style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12, background: '#fff' }}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="pending_review">Pending Review</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                    <select
                      value={t.priority}
                      onChange={e => handleTicketUpdate(t.id, t.status, e.target.value)}
                      style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12, background: '#fff' }}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    <Link to={`/tickets/${t.id}`} style={{ color: '#7c83fd', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                      Inspect →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REFUND REQUESTS */}
      {activeTab === 'refunds' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {refunds.length === 0 && (
            <div className="card" style={{ textAlign: 'center', color: '#888', padding: 48 }}>
              No refund requests yet.
            </div>
          )}
          {refunds.map(r => {
            const c = badgeColors[r.status] || '#666'
            return (
              <div key={r.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>
                    Refund #{r.id} — Order #{r.order_id}
                    {r.ticket_id && (
                      <> · <Link to={`/tickets/${r.ticket_id}`} style={{ color: '#7c83fd', fontSize: 13 }}>Ticket #{r.ticket_id}</Link></>
                    )}
                  </div>
                  <div style={{ fontSize: 14, marginTop: 4 }}>
                    Amount: <strong>₹{r.amount.toFixed(2)}</strong> · Customer #{r.requested_by}
                  </div>
                  {r.reason && <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Reason: {r.reason}</div>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ background: c + '22', color: c, padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                    {r.status}
                  </span>
                  {(r.status === 'pending' || r.status === 'escalated') && (
                    <>
                      <button
                        onClick={() => handleReviewRefund(r.id, 'approved')}
                        style={{ padding: '7px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleReviewRefund(r.id, 'rejected')}
                        style={{ padding: '7px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                      >
                        ✗ Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
