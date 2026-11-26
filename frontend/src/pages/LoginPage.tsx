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

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #312e81 100%)',
      padding: 16
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: '36px 34px', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
          <span style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg, #4f46e5 0%, #0d9488 100%)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: '#fff',
            boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)'
          }}>
            SC
          </span>
          <span style={{ fontWeight: 800, fontSize: 19, color: '#0f172a' }}>
            ShopCare <span style={{ color: '#4f46e5' }}>Support</span>
          </span>
        </div>

        <h1 style={{ fontSize: 23, fontWeight: 800, marginBottom: 6, color: '#0f172a' }}>Welcome back</h1>
        <p style={{ color: '#64748b', marginBottom: 22, fontSize: 14 }}>Sign in to manage orders, support tickets, and refunds.</p>

        {error && <ErrorMessage message={error} />}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label className="field-label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label className="field-label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', padding: '12px' }} type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13.5, color: '#64748b' }}>
          Don&apos;t have an account? <Link to="/register" style={{ fontWeight: 600, textDecoration: 'none' }}>Create account</Link>
        </p>
      </div>
    </div>
  )
}
