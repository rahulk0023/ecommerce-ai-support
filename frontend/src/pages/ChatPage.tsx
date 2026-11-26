import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'
import type { Message, Ticket } from '../types'
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

export default function ChatPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadChat = async () => {
    const [tRes, mRes] = await Promise.all([
      api.get(`/tickets/${id}`),
      api.get(`/messages/ticket/${id}`)
    ])
    setTicket(tRes.data)
    setMessages(mRes.data)
  }

  useEffect(() => {
    loadChat()
      .catch(() => setError('Failed to load chat conversation.'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendText = async (text: string) => {
    if (!text.trim() || sending) return
    setInput('')
    setError('')
    setSending(true)
    try {
      await api.post('/agent/chat', { ticket_id: parseInt(id!), message: text.trim() })
      await loadChat()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <LoadingSpinner text="Loading chat..." />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', maxWidth: 800, margin: '0 auto', padding: '18px 20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #e5e7eb' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>
            🤖 AI Support Chat — Ticket #{id}
          </h2>
          {ticket && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, fontSize: 12, color: '#666', flexWrap: 'wrap' }}>
              <span>{ticket.subject}</span>
              <span>·</span>
              <span style={{ background: '#ede9fe', color: '#5b21b6', padding: '2px 8px', borderRadius: 12, fontWeight: 500 }}>
                {ticket.status.replace('_', ' ')}
              </span>
              {ticket.order_id && (
                <Link to={`/orders/${ticket.order_id}`} style={{ color: '#7c83fd', textDecoration: 'none' }}>
                  Order #{ticket.order_id}
                </Link>
              )}
            </div>
          )}
        </div>
        <Link to={`/tickets/${id}`} style={{ color: '#7c83fd', fontSize: 13, textDecoration: 'none' }}>
          ← Ticket details
        </Link>
      </div>

      {error && <ErrorMessage message={error} />}

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '8px 4px 16px' }}>
        {messages.length === 0 && !sending && (
          <div style={{ textAlign: 'center', color: '#888', padding: '48px 16px' }}>
            <p style={{ fontSize: 32, marginBottom: 10 }}>🤖</p>
            <p style={{ fontWeight: 500, color: '#444' }}>Start chatting with our AI support agent</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>Ask about your orders, refunds, or return policy.</p>
          </div>
        )}
        {messages.map(m => (
          <ChatBubble key={m.id} message={m} currentUserId={user!.id} />
        ))}
        {sending && (
          <div style={{ alignSelf: 'flex-start', color: '#7c83fd', fontSize: 13, padding: '8px 12px' }}>
            🤖 Agent is thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* quick prompts */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '8px 0' }}>
        {QUICK_PROMPTS.map(prompt => (
          <button
            key={prompt}
            type="button"
            disabled={sending}
            onClick={() => sendText(prompt)}
            style={{
              background: '#fff', border: '1px solid #d1d5db', borderRadius: 16,
              padding: '5px 12px', fontSize: 12, color: '#444', cursor: 'pointer'
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, padding: '12px 0 18px', borderTop: '1px solid #e5e7eb' }}>
        <input
          style={{
            flex: 1, padding: '12px 16px', border: '1px solid #d1d5db',
            borderRadius: 24, fontSize: 14, outline: 'none', background: '#fff'
          }}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about your order, refund, or return policy..."
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendText(input)}
        />
        <button
          onClick={() => sendText(input)}
          disabled={sending || !input.trim()}
          style={{
            padding: '12px 24px', background: '#7c83fd', color: '#fff', border: 'none',
            borderRadius: 24, cursor: 'pointer', fontWeight: 600,
            opacity: !input.trim() ? 0.6 : 1
          }}
        >
          Send
        </button>
      </div>
    </div>
  )
}
