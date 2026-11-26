import type { Message } from '../types'

interface Props {
  message: Message
  currentUserId: number
}

export default function ChatBubble({ message, currentUserId }: Props) {
  const isOwn = message.sender_type === 'customer' && message.sender_id === currentUserId
  const isAgent = message.sender_type === 'agent'
  const isStaff = message.sender_type === 'staff'
  const isSystem = message.sender_type === 'system'

  const label = isOwn
    ? 'You'
    : isAgent
      ? 'Support Assistant'
      : isStaff
        ? 'Support Staff'
        : 'System'

  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit'
  })

  if (isSystem) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
        <div style={{
          background: '#fef3c7',
          border: '1px solid #fde68a',
          color: '#92400e',
          borderRadius: 10,
          padding: '9px 16px',
          fontSize: 12.5,
          fontWeight: 500,
          maxWidth: '88%',
          textAlign: 'center',
          boxShadow: '0 2px 6px rgba(180, 83, 9, 0.08)',
        }}>
          {label} · {time} — {message.content}
        </div>
      </div>
    )
  }

  const bg = isOwn
    ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)'
    : isAgent
      ? '#f0fdfa'
      : isStaff
        ? '#eff6ff'
        : '#f1f5f9'

  const border = isOwn
    ? 'none'
    : isAgent
      ? '1px solid #99f6e4'
      : isStaff
        ? '1px solid #bfdbfe'
        : '1px solid #e2e8f0'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
      <span style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>
        {label} · {time}
      </span>
      <div style={{
        maxWidth: '78%',
        padding: '11px 16px',
        borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: bg,
        border,
        color: isOwn ? '#fff' : '#0f172a',
        fontSize: 14,
        lineHeight: 1.55,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.07)'
      }}>
        {message.content}
      </div>
    </div>
  )
}
