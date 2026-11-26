import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ErrorMessage from '../components/ErrorMessage'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      const saved = localStorage.getItem('user')
      const u = saved ? JSON.parse(saved) : null
      navigate(u?.role === 'staff' || u?.role === 'admin' ? '/staff' : '/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const s: Record<string, React.CSSProperties> = {
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f5f7', padding: 16 },
    card: { background: '#fff', borderRadius: 12, padding: '36px 36px', width: '100%', maxWidth: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.09)' },
    title: { fontSize: 24, fontWeight: 700, marginBottom: 8, color: '#1a1a2e' },
    sub: { color: '#888', marginBottom: 24, fontSize: 14 },
    label: { display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, marginBottom: 16 },
    btn: { width: '100%', padding: '12px', background: '#7c83fd', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer' },
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>Welcome back</h1>
        <p style={s.sub}>Sign in to your support account</p>

        {error && <ErrorMessage message={error} />}

        <form onSubmit={handleSubmit}>
          <label style={s.label}>Email</label>
          <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          <label style={s.label}>Password</label>
          <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#888' }}>
          Don't have an account? <Link to="/register" style={{ color: '#7c83fd' }}>Register</Link>
        </p>
      </div>
    </div>
  )
}
