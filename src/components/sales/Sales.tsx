import React, { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { useAnalytics } from '../../hooks/useAnalytics'
import LoadingSpinner from '../shared/LoadingSpinner'
import { Calendar, TrendingUp, Package, Tag } from 'lucide-react'
import { format } from 'date-fns'

type Period = 'daily' | 'weekly' | 'monthly'

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#f43f5e', '#06b6d4', '#84cc16', '#f59e0b']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
      <p className="text-slate-300 text-xs mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: {p.value.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

export default function Sales() {
  const [period, setPeriod] = useState<Period>('daily')
  const { dailySales, weeklySales, monthlySales, brandSales, categorySales, loading } = useAnalytics()

  if (loading) return <LoadingSpinner size="lg" />

  const chartData = {
    daily: dailySales.map(d => ({ name: format(new Date(d.date), 'MMM d'), total: d.total })),
    weekly: weeklySales.map(d => ({ name: d.date, total: d.total })),
    monthly: monthlySales.map(d => ({ name: d.date, total: d.total })),
  }

  const activeData = chartData[period]
  const totalForPeriod = activeData.reduce((s, d) => s + d.total, 0)
  const avgForPeriod = activeData.length > 0 ? Math.round(totalForPeriod / activeData.length) : 0
  const peakEntry = activeData.reduce((a, b) => b.total > a.total ? b : a, { name: '', total: 0 })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-white">Sales</h2>
          <p className="text-slate-500 text-sm">Sales performance overview</p>
        </div>
        <div className="flex bg-slate-800 rounded-lg p-1 gap-1">
          {(['daily', 'weekly', 'monthly'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${
                period === p ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Units', value: totalForPeriod.toLocaleString(), icon: TrendingUp, color: 'text-brand-400' },
          { label: 'Average', value: avgForPeriod.toLocaleString(), icon: Calendar, color: 'text-blue-400' },
          { label: 'Peak', value: peakEntry.total ? `${peakEntry.total} (${peakEntry.name})` : '—', icon: Package, color: 'text-emerald-400' },
        ].map(stat => (
          <div key={stat.label} className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="label text-xs">{stat.label}</span>
            </div>
            <p className="font-display font-bold text-white text-xl truncate">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Sales trend chart */}
      <div className="card p-5">
        <h3 className="font-display font-semibold text-white mb-1 capitalize">{period} Sales Trend</h3>
        <p className="text-slate-500 text-xs mb-4">Units sold over time</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activeData}>
              <defs>
                <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="total" name="Units Sold" stroke="#f97316" strokeWidth={2.5} fill="url(#grad1)" dot={false} activeDot={{ r: 4, fill: '#f97316' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Brand & Category charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Brand sales */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-4 h-4 text-brand-400" />
            <h3 className="font-display font-semibold text-white text-sm">Brand-wise Sales</h3>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={brandSales.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="brand_name" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total_sold" name="Units Sold" fill="#f97316" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category sales */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-blue-400" />
            <h3 className="font-display font-semibold text-white text-sm">Category-wise Sales</h3>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categorySales.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="category_name" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total_sold" name="Units Sold" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
