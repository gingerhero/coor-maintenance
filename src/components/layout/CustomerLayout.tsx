import { Outlet, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Building2, AlertTriangle, FileText, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export function CustomerLayout() {
  const { t } = useTranslation('customer')
  const { t: tc } = useTranslation('common')

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <img src="/coor_logo.svg" alt="Coor" className="h-6" />
          <span className="text-sm font-medium text-muted-foreground">Kundeportal</span>
        </div>
        <NavLink to="/customer/profile" className="text-foreground">
          <User className="h-5 w-5" />
        </NavLink>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-4 py-4 lg:px-8 lg:py-6">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="sticky bottom-0 z-10 border-t border-border bg-card">
        <div className="flex items-center justify-around">
          <BottomNavItem
            to="/customer"
            icon={<Building2 />}
            label={t('dashboard.title')}
            end
          />
          <BottomNavItem to="/customer/avvik" icon={<AlertTriangle />} label={t('avvik.title')} />
          <BottomNavItem
            to="/customer/reports"
            icon={<FileText />}
            label={tc('export')}
          />
        </div>
      </nav>
    </div>
  )
}

function BottomNavItem({
  to,
  icon,
  label,
  end,
}: {
  to: string
  icon: React.ReactNode
  label: string
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-colors',
          isActive ? 'text-primary' : 'text-muted-foreground',
        )
      }
    >
      <span className="h-5 w-5 [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      <span>{label}</span>
    </NavLink>
  )
}
