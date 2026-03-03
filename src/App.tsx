import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { RequireAuth, getRoleHomePath } from '@/features/auth/components/RequireAuth'
import { useAuthStore } from '@/stores/authStore'

// Layouts
import { JanitorLayout } from '@/components/layout/JanitorLayout'
import { ManagerLayout } from '@/components/layout/ManagerLayout'
import { CustomerLayout } from '@/components/layout/CustomerLayout'

// Auth pages
import { LoginPage } from '@/features/auth/pages/LoginPage'

// Janitor pages
import { JanitorHomePage } from '@/features/janitor/pages/HomePage'
import { JanitorHistoryPage } from '@/features/janitor/pages/HistoryPage'
import { VisitPage } from '@/features/janitor/pages/VisitPage'
import { ChecklistPage } from '@/features/janitor/pages/ChecklistPage'
import { CheckoutPage } from '@/features/janitor/pages/CheckoutPage'
import { VisitSummaryPage } from '@/features/janitor/pages/VisitSummaryPage'
import { AvvikPage } from '@/features/janitor/pages/AvvikPage'
import { TimePage } from '@/features/janitor/pages/TimePage'
import { ProfilePage } from '@/features/janitor/pages/ProfilePage'
import { JanitorRosterPage } from '@/features/janitor/pages/RosterPage'

// Manager pages
import { ManagerDashboardPage } from '@/features/manager/pages/DashboardPage'
import { PropertiesListPage } from '@/features/manager/pages/PropertiesListPage'
import { PropertyDetailPage } from '@/features/manager/pages/PropertyDetailPage'
import { AvvikInboxPage } from '@/features/manager/pages/AvvikInboxPage'
import { InstructionsPage } from '@/features/manager/pages/InstructionsPage'
import { RosterPage } from '@/features/manager/pages/RosterPage'
import { TimesheetsPage } from '@/features/manager/pages/TimesheetsPage'

// Customer pages
import { CustomerDashboardPage } from '@/features/customer/pages/DashboardPage'

function AppRoutes() {
  useAuth()
  const profile = useAuthStore((s) => s.profile)
  const isLoading = useAuthStore((s) => s.isLoading)

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Root redirect based on role */}
      <Route
        path="/"
        element={
          isLoading ? (
            <div className="flex h-screen items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : profile ? (
            <Navigate to={getRoleHomePath(profile.role)} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Janitor routes */}
      <Route element={<RequireAuth allowedRoles={['janitor']} />}>
        <Route element={<JanitorLayout />}>
          <Route path="/janitor" element={<JanitorHomePage />} />
          <Route path="/janitor/visit/:id" element={<VisitPage />} />
          <Route path="/janitor/visit/:id/checklist" element={<ChecklistPage />} />
          <Route path="/janitor/visit/:id/checkout" element={<CheckoutPage />} />
          <Route path="/janitor/visit/:id/summary" element={<VisitSummaryPage />} />
          <Route path="/janitor/history" element={<JanitorHistoryPage />} />
          <Route path="/janitor/avvik" element={<AvvikPage />} />
          <Route path="/janitor/time" element={<TimePage />} />
          <Route path="/janitor/roster" element={<JanitorRosterPage />} />
          <Route path="/janitor/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* Manager/Admin routes */}
      <Route element={<RequireAuth allowedRoles={['manager', 'admin']} />}>
        <Route element={<ManagerLayout />}>
          <Route path="/manager" element={<ManagerDashboardPage />} />
          <Route path="/manager/properties" element={<PropertiesListPage />} />
          <Route path="/manager/properties/:id" element={<PropertyDetailPage />} />
          <Route path="/manager/avvik" element={<AvvikInboxPage />} />
          <Route path="/manager/roster" element={<RosterPage />} />
          <Route path="/manager/instructions" element={<InstructionsPage />} />
          <Route path="/manager/reports" element={<PlaceholderPage title="Rapporter" />} />
          <Route path="/manager/timesheets" element={<TimesheetsPage />} />
          <Route path="/manager/settings" element={<PlaceholderPage title="Innstillinger" />} />
        </Route>
      </Route>

      {/* Customer routes */}
      <Route element={<RequireAuth allowedRoles={['customer']} />}>
        <Route element={<CustomerLayout />}>
          <Route path="/customer" element={<CustomerDashboardPage />} />
          <Route path="/customer/avvik" element={<PlaceholderPage title="Avvik" />} />
          <Route path="/customer/reports" element={<PlaceholderPage title="Rapporter" />} />
          <Route path="/customer/profile" element={<PlaceholderPage title="Profil" />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{title}</h1>
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
        Kommer snart
      </div>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
