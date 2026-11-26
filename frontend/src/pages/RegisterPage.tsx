import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ErrorMessage from '../components/ErrorMessage'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      await register(name, email, password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  const s: Record<string, React.CSSProperties> = {
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' },
    card: { background: '#fff', borderRadius: 12, padding: '40px 48px', width: '100%', maxWidth: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.1)' },
    title: { fontSize: 24, fontWeight: 700, marginBottom: 8, color: '#1a1a2e' },
    sub: { color: '#888', marginBottom: 28, fontSize: 14 },
    label: { display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, marginBottom: 16, boxSizing: 'border-box' as const },
    btn: { width: '100%', padding: '12px', background: '#7c83fd', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer' },
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>Create account</h1>
        <p style={s.sub}>Join our customer support platform</p>

        {error && <ErrorMessage message={error} />}

        <form onSubmit={handleSubmit}>
          <label style={s.label}>Full Name</label>
          <input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required />
          <label style={s.label}>Email</label>
          <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          <label style={s.label}>Password</label>
          <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" required />
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#888' }}>
          Already have an account? <Link to="/login" style={{ color: '#7c83fd' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
