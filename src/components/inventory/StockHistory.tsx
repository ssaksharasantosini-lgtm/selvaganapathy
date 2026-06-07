import React, { useState } from 'react'
import { History, Plus, Minus, SlidersHorizontal, RefreshCw, Search, ArrowUpDown } from 'lucide-react'
import { useStockHistory } from '../../hooks/useStockHistory'
import LoadingSpinner from '../shared/LoadingSpinner'
import { format } from 'date-fns'
import { StockMovement } from '../../types'

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  add: {
    label: 'Added',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    icon: <Plus className="w-3 h-3" />,
  },
  reduce: {
    label: 'Reduced',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    icon: <Minus className="w-3 h-3" />,
  },
  sale: {
    label: 'Sale',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    icon: <Minus className="w-3 h-3" />,
  },
  adjustment: {
    label: 'Adjusted',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
    icon: <SlidersHorizontal className="w-3 h-3" />,
  },
  excel_import: {
    label: 'Excel Import',
    color: 'text-brand-400',
    bg: 'bg-brand-500/10 border-brand-500/20',
    icon: <ArrowUpDown className="w-3 h-3" />,
  },
}

export default function StockHistory() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const { movements, loading, refetch } = useStockHistory(undefined, 200)

  const filtered = movements.filter(m => {
    const matchesSearch = !search ||
      m.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.product?.sku?.toLowerCase().includes(search.toLowerCase()) ||
      m.user?.full_name?.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'all' || m.movement_type === typeFilter
    return matchesSearch && matchesType
  })

  function MovementBadge({ type }: { type: string }) {
    const config = TYPE_CONFIG[type] || { label: type, color: 'text-slate-400', bg: 'bg-slate-800', icon: null }
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.color}`}>
        {config.icon}
        {config.label}
      </span>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-white">Stock History</h2>
          <p className="text-slate-500 text-sm">{filtered.length} movements</p>
        </div>
        <button onClick={refetch} className="btn-secondary">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            className="input w-full pl-9"
            placeholder="Search product, SKU, user..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex bg-slate-800 rounded-lg p-1 gap-1 flex-wrap">
          {['all', 'add', 'reduce', 'sale', 'adjustment', 'excel_import'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all whitespace-nowrap ${
                typeFilter === t ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t === 'excel_import' ? 'Excel' : t === 'all' ? 'All' : TYPE_CONFIG[t]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left p-3 pl-4 table-header">Product</th>
                <th className="text-left p-3 table-header hidden md:table-cell">Brand</th>
                <th className="text-center p-3 table-header">Type</th>
                <th className="text-right p-3 table-header">Qty</th>
                <th className="text-left p-3 table-header hidden lg:table-cell">Notes</th>
                <th className="text-left p-3 table-header hidden sm:table-cell">By</th>
                <th className="text-right p-3 pr-4 table-header">Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}><LoadingSpinner /></td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <History className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                    <p className="text-slate-500">No movements found</p>
                  </td>
                </tr>
              ) : filtered.map((m: StockMovement) => {
                const config = TYPE_CONFIG[m.movement_type]
                return (
                  <tr key={m.id} className="table-row">
                    <td className="p-3 pl-4">
                      <p className="text-slate-200 text-sm font-medium">{m.product?.name || '—'}</p>
                      <p className="text-slate-600 text-xs font-mono">{m.product?.sku}</p>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <span className="text-slate-400 text-sm">{(m.product as any)?.brand?.name || '—'}</span>
                    </td>
                    <td className="p-3 text-center">
                      <MovementBadge type={m.movement_type} />
                    </td>
                    <td className="p-3 text-right">
                      <span className={`font-mono font-bold text-sm ${config?.color || 'text-slate-400'}`}>
                        {['add', 'excel_import'].includes(m.movement_type) ? '+' : '-'}{m.quantity}
                      </span>
                      <span className="text-slate-600 text-xs ml-1">{m.product?.unit}</span>
                    </td>
                    <td className="p-3 hidden lg:table-cell max-w-[180px]">
                      <span className="text-slate-500 text-xs truncate block">{m.notes || '—'}</span>
                    </td>
                    <td className="p-3 hidden sm:table-cell">
                      <span className="text-slate-400 text-xs">{m.user?.full_name || '—'}</span>
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <p className="text-slate-400 text-xs">{format(new Date(m.created_at), 'dd MMM yyyy')}</p>
                      <p className="text-slate-600 text-xs">{format(new Date(m.created_at), 'hh:mm a')}</p>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
