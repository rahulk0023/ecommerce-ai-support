import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  children: React.ReactNode
  staffOnly?: boolean
}

export default function ProtectedRoute({ children, staffOnly = false }: Props) {
  const { user, isStaff } = useAuth()

  if (!user) return <Navigate to="/login" replace />
  if (staffOnly && !isStaff) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}
