import React from 'react'
import {
  Package, Tag, Layers, AlertTriangle, TrendingUp,
  ShoppingCart, BarChart2, AlertOctagon, Zap
} from 'lucide-react'
import StatCard from '../shared/StatCard'
import LoadingSpinner from '../shared/LoadingSpinner'
import { useDashboardStats, useAnalytics } from '../../hooks/useAnalytics'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'

export default function Dashboard() {
  const { stats, loading: statsLoading } = useDashboardStats()
  const { dailySales, topProducts, loading: analyticsLoading } = useAnalytics()

  if (statsLoading || analyticsLoading) return <LoadingSpinner size="lg" />

  const chartData = dailySales.slice(-14).map(d => ({
    name: format(new Date(d.date), 'MMM d'),
    sales: d.total,
  }))

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-white">Overview</h2>
          <p className="text-slate-500 text-sm mt-0.5">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex items-center gap-2 badge-orange px-3 py-1.5">
          <Zap className="w-3 h-3" />
          <span className="text-xs font-semibold">Live</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Products"
          value={stats.total_products.toLocaleString()}
          icon={Package}
          iconColor="text-blue-400"
          iconBg="bg-blue-500/10"
        />
        <StatCard
          label="Sold Today"
          value={stats.total_sold_today.toLocaleString()}
          icon={ShoppingCart}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10"
          subtitle={`${stats.total_sold_week} this week`}
        />
        <StatCard
          label="Low Stock"
          value={stats.low_stock_count}
          icon={AlertTriangle}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/10"
          badge={stats.low_stock_count > 0 ? { text: 'Action needed', type: 'yellow' } : undefined}
        />
        <StatCard
          label="Out of Stock"
          value={stats.out_of_stock_count}
          icon={AlertOctagon}
          iconColor="text-red-400"
          iconBg="bg-red-500/10"
          badge={stats.out_of_stock_count > 0 ? { text: 'Critical', type: 'red' } : { text: 'All good', type: 'green' }}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Categories"
          value={stats.total_categories}
          icon={Layers}
          iconColor="text-purple-400"
          iconBg="bg-purple-500/10"
        />
        <StatCard
          label="Brands"
          value={stats.total_brands}
          icon={Tag}
          iconColor="text-pink-400"
          iconBg="bg-pink-500/10"
        />
        <StatCard
          label="This Week"
          value={stats.total_sold_week.toLocaleString()}
          icon={TrendingUp}
          iconColor="text-brand-400"
          iconBg="bg-brand-500/10"
          subtitle="units sold"
        />
        <StatCard
          label="This Month"
          value={stats.total_sold_month.toLocaleString()}
          icon={BarChart2}
          iconColor="text-cyan-400"
          iconBg="bg-cyan-500/10"
          subtitle="units sold"
        />
      </div>

      {/* Chart + Top products */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Sales chart */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-white text-sm">Sales Trend</h3>
              <p className="text-slate-500 text-xs">Last 14 days</p>
            </div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#f97316" strokeWidth={2} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 products */}
        <div className="card p-5">
          <h3 className="font-display font-semibold text-white text-sm mb-4">Top 5 Products</h3>
          <div className="space-y-3">
            {topProducts.slice(0, 5).map((product, i) => (
              <div key={product.product_id} className="flex items-center gap-3">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  i === 0 ? 'bg-amber-500/20 text-amber-400' :
                  i === 1 ? 'bg-slate-400/20 text-slate-400' :
                  i === 2 ? 'bg-orange-700/20 text-orange-600' :
                  'bg-slate-800 text-slate-500'
                }`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-xs font-medium truncate">{product.product_name}</p>
                  <p className="text-slate-500 text-xs">{product.brand_name}</p>
                </div>
                <span className="text-brand-400 text-xs font-mono font-semibold shrink-0">{product.total_sold}</span>
              </div>
            ))}
            {topProducts.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">No sales data yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
