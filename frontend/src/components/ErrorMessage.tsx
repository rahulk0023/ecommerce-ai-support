export default function ErrorMessage({ message }: { message: string }) {
  return (
    <div style={{
      background: '#fef2f2',
      border: '1px solid #fecaca',
      borderLeft: '4px solid #dc2626',
      borderRadius: 10,
      padding: '12px 16px',
      color: '#b91c1c',
      fontSize: 13.5,
      fontWeight: 500,
      marginBottom: 16,
      boxShadow: '0 2px 6px rgba(220, 38, 38, 0.08)',
    }}>
      {message}
    </div>
  )
}
