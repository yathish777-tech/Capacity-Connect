import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Loader from './Loader'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, refreshUser } = useAuth()

  useEffect(() => {
    if (user && user.role !== 'admin' && user.status === 'pending') {
      const interval = setInterval(() => {
        refreshUser()
      }, 10000)
      return () => clearInterval(interval)
    }
  }, [user, refreshUser])

  if (loading) return <Loader full />
  if (!user) return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />
  }

  if (user.role !== 'admin' && user.status !== 'approved') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper px-6">
        <div className="card max-w-md p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">
            {user.status === 'rejected' ? 'Account not approved' : 'Pending Admin approval'}
          </h2>
          <p className="text-sm text-ink/70">
            {user.status === 'rejected'
              ? user.rejection_reason || 'An Admin has reviewed and did not approve this account. Contact your IMD coordinator for details.'
              : "Your account is pending review. You'll be able to access your dashboard once an Admin approves it."}
          </p>
        </div>
      </div>
    )
  }

  return children
}
