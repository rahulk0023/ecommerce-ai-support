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

const badgeStyles: Record<string, { color: string; bg: string }> = {
  open:           { color: '#6d28d9', bg: '#f3e8ff' },
  in_progress:    { color: '#1d4ed8', bg: '#dbeafe' },
  pending_review: { color: '#b45309', bg: '#fef3c7' },
  resolved:       { color: '#15803d', bg: '#dcfce7' },
  closed:         { color: '#475569', bg: '#f1f5f9' },
  pending:        { color: '#b45309', bg: '#fef3c7' },
  escalated:      { color: '#6d28d9', bg: '#f3e8ff' },
  approved:       { color: '#15803d', bg: '#dcfce7' },
  rejected:       { color: '#b91c1c', bg: '#fee2e2' },
  needs_info:     { color: '#b45309', bg: '#fef3c7' },
  processed:      { color: '#0d9488', bg: '#ccfbf1' },
}

export default function StaffDashboardPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [escalations, setEscalations] = useState<Escalation[]>([])
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'escalations' | 'tickets' | 'refunds'>('escalations')

  const [notes, setNotes] = useState<Record<number, string>>({})
  const [contexts, setContexts] = useState<Record<number, ContextBundle>>({})
  const [openContextId, setOpenContextId] = useState<number | null>(null)

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
    padding: '11px 18px', border: 'none', background: 'none', cursor: 'pointer',
    fontSize: 14, fontWeight: activeTab === key ? 700 : 500,
    color: activeTab === key ? '#4f46e5' : '#64748b',
    borderBottom: activeTab === key ? '2px solid #4f46e5' : '2px solid transparent',
  })

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Internal Support Dashboard</h1>
          <p className="page-subtitle">Review escalations, inspect order &amp; chat context, manage tickets, and approve refunds.</p>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="stat-grid">
        <div className="stat-card" style={{ borderTopColor: '#dc2626' }}>
          <div className="stat-label">Pending Escalations</div>
          <div className="stat-value" style={{ color: '#b91c1c' }}>{pendingEscalations.length}</div>
        </div>
        <div className="stat-card" style={{ borderTopColor: '#4f46e5' }}>
          <div className="stat-label">Total Tickets</div>
          <div className="stat-value">{tickets.length}</div>
        </div>
        <div className="stat-card" style={{ borderTopColor: '#d97706' }}>
          <div className="stat-label">Pending / Escalated Refunds</div>
          <div className="stat-value" style={{ color: '#b45309' }}>{pendingRefunds.length}</div>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: 22, overflowX: 'auto' }}>
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

      {activeTab === 'escalations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {escalations.length === 0 && (
            <div className="card" style={{ textAlign: 'center', color: '#64748b', padding: 48 }}>
              No escalations yet. High-value refunds (&gt; ₹5,000) or manual escalations appear here.
            </div>
          )}

          {escalations.map(esc => {
            const ctx = contexts[esc.id]
            const st = badgeStyles[esc.decision] || { color: '#475569', bg: '#f1f5f9' }
            return (
              <div key={esc.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>Escalation #{esc.id}</span>
                    {' — '}
                    <Link to={`/tickets/${esc.ticket_id}`} style={{ fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                      Ticket #{esc.ticket_id}
                    </Link>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{
                      background: esc.priority === 'high' ? '#fee2e2' : '#fef3c7',
                      color: esc.priority === 'high' ? '#b91c1c' : '#b45309',
                      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, textTransform: 'capitalize'
                    }}>
                      {esc.priority} priority
                    </span>
                    <span style={{
                      background: st.bg, color: st.color,
                      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, textTransform: 'capitalize'
                    }}>
                      {esc.decision.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <p style={{ color: '#334155', fontSize: 14, marginBottom: 10 }}>{esc.summary}</p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 12.5, color: '#64748b' }}>
                    Created: {new Date(esc.created_at).toLocaleString()}
                    {esc.internal_note && ` · Note: "${esc.internal_note}"`}
                  </span>
                  <button
                    onClick={() => toggleInspectContext(esc)}
                    className="btn btn-secondary btn-sm"
                  >
                    {openContextId === esc.id ? 'Hide Context' : 'Inspect Order & Chat Context'}
                  </button>
                </div>

                {openContextId === esc.id && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                    {!ctx ? (
                      <p style={{ fontSize: 13, color: '#64748b' }}>Loading context...</p>
                    ) : (
                      <>
                        {ctx.order ? (
                          <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #e2e8f0', fontSize: 13 }}>
                            <strong>Order #{ctx.order.id}:</strong> {ctx.order.item_category} · ₹{ctx.order.total_amount.toFixed(2)} · Status: <em>{ctx.order.status}</em> · Delivered: {ctx.order.delivery_date || 'N/A'}
                          </div>
                        ) : (
                          <div style={{ marginBottom: 10, fontSize: 13, color: '#64748b' }}>No order attached to Ticket #{esc.ticket_id}.</div>
                        )}
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Recent Messages:</div>
                        {ctx.messages.length === 0 ? (
                          <p style={{ fontSize: 12, color: '#64748b' }}>No messages on this ticket.</p>
                        ) : (
                          <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {ctx.messages.slice(-6).map(m => (
                              <div key={m.id} style={{ fontSize: 12.5, background: '#fff', padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                <strong style={{ textTransform: 'capitalize' }}>{m.sender_type}:</strong> {m.content}
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
                      className="textarea"
                      value={notes[esc.id] || ''}
                      onChange={e => setNotes(prev => ({ ...prev, [esc.id]: e.target.value }))}
                      placeholder="Add internal review note..."
                      rows={2}
                      style={{ marginBottom: 10 }}
                    />
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button onClick={() => handleReviewEscalation(esc.id, 'approved')} className="btn btn-success btn-sm">
                        Approve
                      </button>
                      <button onClick={() => handleReviewEscalation(esc.id, 'rejected')} className="btn btn-danger btn-sm">
                        Reject
                      </button>
                      <button onClick={() => handleReviewEscalation(esc.id, 'needs_info')} className="btn btn-warning btn-sm">
                        Request Info
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'tickets' && (
        <div>
          <div className="card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
            <input
              className="input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by ticket #, subject, or description..."
              style={{ flex: '1 1 220px' }}
            />
            <select
              className="select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ width: 'auto', minWidth: 150 }}
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="pending_review">Pending Review</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select
              className="select"
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              style={{ width: 'auto', minWidth: 140 }}
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {filteredTickets.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>
              No tickets match your filters.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredTickets.map(t => (
                <div key={t.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ flex: '1 1 260px' }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>#{t.id} — {t.subject}</div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, textTransform: 'capitalize' }}>
                      {t.category} · Customer #{t.customer_id}
                      {t.order_id ? ` · Order #${t.order_id}` : ''} · {new Date(t.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <select
                      className="select"
                      value={t.status}
                      onChange={e => handleTicketUpdate(t.id, e.target.value, t.priority)}
                      style={{ width: 'auto', padding: '6px 10px', fontSize: 12.5 }}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="pending_review">Pending Review</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                    <select
                      className="select"
                      value={t.priority}
                      onChange={e => handleTicketUpdate(t.id, t.status, e.target.value)}
                      style={{ width: 'auto', padding: '6px 10px', fontSize: 12.5 }}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    <Link to={`/tickets/${t.id}`} style={{ fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                      Inspect →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'refunds' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {refunds.length === 0 && (
            <div className="card" style={{ textAlign: 'center', color: '#64748b', padding: 48 }}>
              No refund requests yet.
            </div>
          )}
          {refunds.map(r => {
            const st = badgeStyles[r.status] || { color: '#475569', bg: '#f1f5f9' }
            return (
              <div key={r.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    Refund #{r.id} — Order #{r.order_id}
                    {r.ticket_id && (
                      <> · <Link to={`/tickets/${r.ticket_id}`} style={{ fontSize: 13, textDecoration: 'none' }}>Ticket #{r.ticket_id}</Link></>
                    )}
                  </div>
                  <div style={{ fontSize: 14, marginTop: 4 }}>
                    Amount: <strong>₹{r.amount.toFixed(2)}</strong> · Customer #{r.requested_by}
                  </div>
                  {r.reason && <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Reason: {r.reason}</div>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ background: st.bg, color: st.color, padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, textTransform: 'capitalize' }}>
                    {r.status}
                  </span>
                  {(r.status === 'pending' || r.status === 'escalated') && (
                    <>
                      <button onClick={() => handleReviewRefund(r.id, 'approved')} className="btn btn-success btn-sm">
                        Approve
                      </button>
                      <button onClick={() => handleReviewRefund(r.id, 'rejected')} className="btn btn-danger btn-sm">
                        Reject
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
