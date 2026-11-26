import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { user, logout, isStaff } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (!user) return null

  const linkStyle = (path: string): React.CSSProperties => {
    const active = location.pathname.startsWith(path)
    return {
      color: active ? '#fff' : '#cbd5e1',
      background: active ? 'rgba(99, 102, 241, 0.32)' : 'transparent',
      border: active ? '1px solid rgba(165, 180, 252, 0.4)' : '1px solid transparent',
      fontWeight: active ? 600 : 500,
      textDecoration: 'none',
      fontSize: 13.5,
      padding: '6px 13px',
      borderRadius: 8,
      transition: 'all 0.15s ease',
    }
  }

  return (
    <nav className="nav-bar">
      <Link
        to={isStaff ? '/staff' : '/dashboard'}
        style={{
          color: '#fff',
          fontWeight: 800,
          fontSize: 18,
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          letterSpacing: '-0.025em',
        }}
      >
        <span style={{
          width: 30, height: 30, borderRadius: 8,
          background: 'linear-gradient(135deg, #6366f1 0%, #0d9488 100%)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, color: '#fff',
          boxShadow: '0 2px 6px rgba(99, 102, 241, 0.4)'
        }}>
          SC
        </span>
        <span>ShopCare <span style={{ color: '#a5b4fc' }}>Support</span></span>
      </Link>

      <ul className="nav-links">
        {!isStaff && (
          <>
            <li><Link to="/dashboard" style={linkStyle('/dashboard')}>Dashboard</Link></li>
            <li><Link to="/orders" style={linkStyle('/orders')}>Orders</Link></li>
          </>
        )}
        <li><Link to="/tickets" style={linkStyle('/tickets')}>Tickets</Link></li>
        {!isStaff && <li><Link to="/refunds" style={linkStyle('/refunds')}>Refunds</Link></li>}
        {isStaff && (
          <li><Link to="/staff" style={linkStyle('/staff')}>Staff Panel</Link></li>
        )}
        <li style={{
          fontSize: 12,
          color: '#e2e8f0',
          background: 'rgba(255,255,255,0.09)',
          padding: '5px 12px',
          borderRadius: 20,
          marginLeft: 4
        }}>
          {user.name.split(' ')[0]} · <span style={{ color: '#a5b4fc', textTransform: 'capitalize' }}>{user.role}</span>
        </li>
        <li>
          <button
            onClick={handleLogout}
            className="btn btn-primary btn-sm"
            style={{ marginLeft: 4 }}
          >
            Logout
          </button>
        </li>
      </ul>
    </nav>
  )
}
