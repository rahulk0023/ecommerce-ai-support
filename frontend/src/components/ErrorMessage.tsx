export default function ErrorMessage({ message }: { message: string }) {
  return (
    <div style={{
      background: '#fef2f2', border: '1px solid #fca5a5',
      borderRadius: 8, padding: '12px 16px', color: '#dc2626', marginBottom: 16
    }}>
      ⚠️ {message}
    </div>
  )
}
