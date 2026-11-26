export default function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        width: 36, height: 36, border: '4px solid #e0e0e0',
        borderTop: '4px solid #7c83fd', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite', margin: '0 auto 12px'
      }} />
      <p>{text}</p>
    </div>
  )
}
