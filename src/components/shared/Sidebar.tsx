import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, BarChart2, TrendingUp,
  Upload, Settings, Zap, Wrench, X, ChevronRight, History
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

const navItems = [
  { to: '/',              label: 'Dashboard',    icon: LayoutDashboard, exact: true },
  { to: '/inventory',     label: 'Inventory',    icon: Package },
  { to: '/stock-history', label: 'Stock History',icon: History },
  { to: '/sales',         label: 'Sales',        icon: BarChart2 },
  { to: '/analytics',     label: 'Analytics',    icon: TrendingUp },
  { to: '/upload',        label: 'Upload Excel', icon: Upload, adminOnly: true },
  { to: '/settings',      label: 'Settings',     icon: Settings, adminOnly: true },
]

export default function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation()
  const { profile, isAdmin } = useAuth()

  const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin)

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={onClose} />
      )}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-slate-900 border-r border-slate-800 z-30
        flex flex-col transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
              <div className="relative w-5 h-5">
                <Wrench className="w-4 h-4 text-brand-400 absolute -left-0.5 -top-0.5" />
                <Zap className="w-3 h-3 text-brand-300 absolute right-0 bottom-0" />
              </div>
            </div>
            <div className="overflow-hidden">
              <p className="font-display font-bold text-white text-sm leading-tight">Selvaganapathy</p>
              <p className="text-slate-500 text-xs truncate">Hardware & Electricals</p>
            </div>
            <button onClick={onClose} className="ml-auto text-slate-500 hover:text-slate-300 lg:hidden">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <p className="label px-3 py-2 mb-1">Navigation</p>
          {visibleItems.map(({ to, label, icon: Icon, exact }) => {
            const isActive = exact ? location.pathname === to : location.pathname.startsWith(to)
            return (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{label}</span>
                {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
              </NavLink>
            )
          })}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/60">
            <div className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center shrink-0">
              <span className="text-brand-400 text-xs font-bold">
                {profile?.full_name?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="overflow-hidden">
              <p className="text-slate-200 text-xs font-medium truncate">{profile?.full_name || 'User'}</p>
              <p className="text-slate-500 text-xs capitalize">{profile?.role || 'worker'}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
