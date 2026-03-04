import { Outlet, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Building2,
  AlertTriangle,
  Users,
  FileText,
  BarChart3,
  Clock,
  Settings,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'

export function ManagerLayout() {
  const { t } = useTranslation('manager')
  const { t: tc } = useTranslation('common')
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore()

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <img src="/coor_logo.svg" alt="Coor" className="h-6" />
            <span className="text-sm font-medium text-muted-foreground">
              {tc('roles.manager')}
            </span>
          </div>
          <button onClick={toggleSidebar} className="lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          <SidebarLink to="/manager" icon={<LayoutDashboard />} label={t('dashboard.title')} end />
          <SidebarLink to="/manager/properties" icon={<Building2 />} label={t('dashboard.properties')} />
          <SidebarLink to="/manager/avvik" icon={<AlertTriangle />} label={t('avvikInbox.title')} />
          <SidebarLink to="/manager/roster" icon={<Users />} label={t('roster.title')} />
          <SidebarLink to="/manager/timesheets" icon={<Clock />} label={t('timesheets.title')} />
          <SidebarLink to="/manager/instructions" icon={<FileText />} label={t('instructions.title')} />
          <SidebarLink to="/manager/reports" icon={<BarChart3 />} label={t('reports.title')} />
        </nav>

        <div className="border-t border-border p-3">
          <SidebarLink to="/manager/settings" icon={<Settings />} label={tc('settings')} />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center border-b border-border bg-card px-4 py-3 lg:hidden">
          <button onClick={toggleSidebar}>
            <Menu className="h-5 w-5" />
          </button>
          <img src="/coor_logo.svg" alt="Coor" className="ml-3 h-6" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function SidebarLink({
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
          'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-foreground hover:bg-muted',
        )
      }
    >
      <span className="h-5 w-5 [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      {label}
    </NavLink>
  )
}
