export default function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        width: 38, height: 38, border: '3px solid #e2e8f0',
        borderTop: '3px solid #4f46e5', borderRadius: '50%',
        animation: 'spin 0.75s linear infinite', margin: '0 auto 12px'
      }} />
      <p style={{ fontSize: 14, fontWeight: 500 }}>{text}</p>
    </div>
  )
}
