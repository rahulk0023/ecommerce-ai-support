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

  const linkStyle = (path: string): React.CSSProperties => ({
    color: location.pathname.startsWith(path) ? '#fff' : '#bbb',
    fontWeight: location.pathname.startsWith(path) ? 600 : 400,
    textDecoration: 'none',
    fontSize: 14,
  })

  return (
    <nav className="nav-bar">
      <Link to={isStaff ? '/staff' : '/dashboard'} style={{ color: '#7c83fd', fontWeight: 700, fontSize: 18, textDecoration: 'none' }}>
        🛍️ AI Support
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
        <li style={{ fontSize: 12, color: '#9ca3af' }}>
          {user.name.split(' ')[0]} ({user.role})
        </li>
        <li>
          <button
            onClick={handleLogout}
            style={{
              background: '#7c83fd', color: '#fff', border: 'none',
              padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500
            }}
          >
            Logout
          </button>
        </li>
      </ul>
    </nav>
  )
}
