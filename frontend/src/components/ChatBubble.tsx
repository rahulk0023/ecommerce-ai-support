import type { Message } from '../types'

interface Props {
  message: Message
  currentUserId: number
}

export default function ChatBubble({ message, currentUserId }: Props) {
  const isOwn = message.sender_type === 'customer' && message.sender_id === currentUserId
  const isAgent = message.sender_type === 'agent'
  const isStaff = message.sender_type === 'staff'

  const label = isOwn
    ? 'You'
    : isAgent
      ? '🤖 AI Agent'
      : isStaff
        ? '🧑‍💼 Support Staff'
        : 'System'

  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit'
  })

  const bg = isOwn
    ? '#7c83fd'
    : isAgent
      ? '#e8f5e9'
      : isStaff
        ? '#e0f2fe'
        : '#f3f4f6'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
      <span style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>
        {label} · {time}
      </span>
      <div style={{
        maxWidth: '75%',
        padding: '10px 14px',
        borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: bg,
        color: isOwn ? '#fff' : '#222',
        fontSize: 14,
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}>
        {message.content}
      </div>
    </div>
  )
}
