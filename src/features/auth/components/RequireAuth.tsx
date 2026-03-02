import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types/database'

interface RequireAuthProps {
  allowedRoles?: UserRole[]
}

export function RequireAuth({ allowedRoles }: RequireAuthProps) {
  const profile = useAuthStore((s) => s.profile)
  const isLoading = useAuthStore((s) => s.isLoading)
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!profile) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to={getRoleHomePath(profile.role)} replace />
  }

  return <Outlet />
}

export function getRoleHomePath(role: string): string {
  switch (role) {
    case 'janitor':
      return '/janitor'
    case 'manager':
    case 'admin':
      return '/manager'
    case 'customer':
      return '/customer'
    default:
      return '/login'
  }
}
