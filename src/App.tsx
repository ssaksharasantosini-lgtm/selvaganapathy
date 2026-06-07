import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Layout from './components/shared/Layout'
import LoginPage from './components/auth/LoginPage'
import Dashboard from './components/dashboard/Dashboard'
import Inventory from './components/inventory/Inventory'
import StockHistory from './components/inventory/StockHistory'
import Sales from './components/sales/Sales'
import Analytics from './components/analytics/Analytics'
import UploadExcel from './components/upload/UploadExcel'
import Settings from './components/settings/Settings'

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, profile, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-slate-700 border-t-brand-500 rounded-full animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && profile?.role !== 'admin') return <Navigate to="/" replace />
  return <Layout>{children}</Layout>
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-slate-700 border-t-brand-500 rounded-full animate-spin" />
    </div>
  )
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/"              element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/inventory"     element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
      <Route path="/stock-history" element={<ProtectedRoute><StockHistory /></ProtectedRoute>} />
      <Route path="/sales"         element={<ProtectedRoute><Sales /></ProtectedRoute>} />
      <Route path="/analytics"     element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/upload"        element={<ProtectedRoute adminOnly><UploadExcel /></ProtectedRoute>} />
      <Route path="/settings"      element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />
      <Route path="*"              element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
