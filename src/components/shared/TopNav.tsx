import React, { useState, useEffect } from 'react'
import { Menu, Bell, LogOut, User, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { Product } from '../../types'

interface TopNavProps {
  onMenuClick: () => void
  title: string
}

export default function TopNav({ onMenuClick, title }: TopNavProps) {
  const { profile, signOut } = useAuth()
  const [showProfile, setShowProfile] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])

  useEffect(() => { fetchLowStock() }, [])

  async function fetchLowStock() {
    const { data } = await supabase
      .from('products')
      .select('*, brand:brands(name), category:categories(name)')
      .eq('is_active', true)

    if (data) {
      setLowStockProducts(
        data.filter((p: any) => p.current_stock <= p.reorder_level) as Product[]
      )
    }
  }

  const alertCount = lowStockProducts.length

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center gap-4 px-4 sticky top-0 z-10">
      <button
        onClick={onMenuClick}
        className="text-slate-400 hover:text-slate-200 transition-colors lg:hidden"
      >
        <Menu className="w-5 h-5" />
      </button>

      <h1 className="font-display font-semibold text-white text-base hidden sm:block">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false) }}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
          >
            <Bell className="w-4 h-4" />
            {alertCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 card shadow-2xl animate-fade-in z-50">
              <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                <p className="font-semibold text-white text-sm">Low Stock Alerts</p>
                {alertCount > 0 && <span className="badge-red">{alertCount}</span>}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {alertCount === 0 ? (
                  <p className="text-slate-500 text-sm p-4 text-center">✓ All stock levels healthy</p>
                ) : (
                  lowStockProducts.slice(0, 10).map(product => (
                    <div key={product.id} className="flex items-start gap-3 p-3 border-b border-slate-800/60 hover:bg-slate-800/40">
                      <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${product.current_stock === 0 ? 'text-red-400' : 'text-amber-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-200 text-sm font-medium truncate">{product.name}</p>
                        <p className="text-slate-500 text-xs">
                          Stock: <span className={product.current_stock === 0 ? 'text-red-400 font-semibold' : 'text-amber-400 font-semibold'}>{product.current_stock}</span>
                          {' '}/{' '}{product.reorder_level} reorder level
                        </p>
                      </div>
                      {product.current_stock === 0 && <span className="badge-red shrink-0 text-xs">Out</span>}
                    </div>
                  ))
                )}
                {alertCount > 10 && (
                  <div className="p-2.5 border-t border-slate-800 text-center">
                    <p className="text-slate-500 text-xs">+{alertCount - 10} more alerts</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => { setShowProfile(!showProfile); setShowNotifications(false) }}
            className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-800 transition-all"
          >
            <div className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
              <span className="text-brand-400 text-xs font-bold">
                {profile?.full_name?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-slate-200 text-xs font-medium leading-tight">{profile?.full_name || 'User'}</p>
              <p className="text-slate-500 text-xs capitalize leading-tight">{profile?.role}</p>
            </div>
          </button>

          {showProfile && (
            <div className="absolute right-0 top-full mt-2 w-48 card shadow-2xl animate-fade-in z-50">
              <div className="p-3 border-b border-slate-800">
                <p className="text-white text-sm font-medium">{profile?.full_name}</p>
                <p className="text-slate-500 text-xs truncate">{profile?.email}</p>
                <span className={`badge mt-1 ${profile?.role === 'admin' ? 'badge-orange' : 'badge-blue'}`}>
                  {profile?.role}
                </span>
              </div>
              <div className="p-1">
                <button className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg text-sm transition-colors">
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg text-sm transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {(showProfile || showNotifications) && (
        <div className="fixed inset-0 z-40" onClick={() => { setShowProfile(false); setShowNotifications(false) }} />
      )}
    </header>
  )
}
