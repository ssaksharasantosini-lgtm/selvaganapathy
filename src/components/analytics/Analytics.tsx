import React from 'react'
import { useAnalytics } from '../../hooks/useAnalytics'
import LoadingSpinner from '../shared/LoadingSpinner'
import {
  Trophy, TrendingDown, AlertTriangle, Lightbulb,
  ArrowUp, ArrowDown, Tag, Layers, Package
} from 'lucide-react'
import { useProducts } from '../../hooks/useProducts'

function RankRow({ rank, name, sub, value, label = 'sold', up = true }: {
  rank: number; name: string; sub?: string; value: number; label?: string; up?: boolean
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-800/60 last:border-0">
      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
        rank === 1 ? 'bg-amber-500/20 text-amber-400' :
        rank === 2 ? 'bg-slate-400/20 text-slate-400' :
        rank === 3 ? 'bg-orange-700/20 text-orange-700' :
        'bg-slate-800 text-slate-500'
      }`}>{rank}</span>
      <div className="flex-1 min-w-0">
        <p className="text-slate-200 text-sm font-medium truncate">{name}</p>
        {sub && <p className="text-slate-500 text-xs truncate">{sub}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {up ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-red-400" />}
        <span className={`text-sm font-mono font-semibold ${up ? 'text-emerald-400' : 'text-red-400'}`}>{value}</span>
        <span className="text-slate-600 text-xs">{label}</span>
      </div>
    </div>
  )
}

export default function Analytics() {
  const { topProducts, slowProducts, brandSales, categorySales, loading } = useAnalytics()
  const { products: allProducts } = useProducts()

  if (loading) return <LoadingSpinner size="lg" />

  const lowStockProducts = allProducts.filter(p => p.current_stock <= p.reorder_level && p.current_stock > 0)
  const outOfStock = allProducts.filter(p => p.current_stock === 0)
  const bestBrand = brandSales[0]
  const bestCategory = categorySales[0]
  const fastestProduct = topProducts[0]
  const slowestProduct = slowProducts[0]

  const insights = [
    fastestProduct && {
      icon: Trophy,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      title: 'Fastest Moving Product',
      body: `"${fastestProduct.product_name}" (${fastestProduct.brand_name}) leads with ${fastestProduct.total_sold} units sold.`,
    },
    bestBrand && {
      icon: Tag,
      color: 'text-brand-400',
      bg: 'bg-brand-500/10 border-brand-500/20',
      title: 'Best Selling Brand',
      body: `${bestBrand.brand_name} is your top brand with ${bestBrand.total_sold} units sold across all products.`,
    },
    bestCategory && {
      icon: Layers,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
      title: 'Top Category',
      body: `${bestCategory.category_name} is your highest selling category with ${bestCategory.total_sold} units.`,
    },
    outOfStock.length > 0 && {
      icon: AlertTriangle,
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/20',
      title: `${outOfStock.length} Products Out of Stock`,
      body: `Critical: ${outOfStock.slice(0, 3).map(p => p.name).join(', ')}${outOfStock.length > 3 ? ` and ${outOfStock.length - 3} more` : ''} need immediate restocking.`,
    },
    lowStockProducts.length > 0 && {
      icon: Package,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      title: `${lowStockProducts.length} Products Below Reorder Level`,
      body: `Consider restocking: ${lowStockProducts.slice(0, 3).map(p => p.name).join(', ')}${lowStockProducts.length > 3 ? ` and ${lowStockProducts.length - 3} more` : ''}.`,
    },
    slowestProduct && slowestProduct.total_sold === 0 && {
      icon: TrendingDown,
      color: 'text-slate-400',
      bg: 'bg-slate-500/10 border-slate-500/20',
      title: 'Zero-Sales Products Detected',
      body: `Some products have never recorded a sale. Consider promotions or stock reduction.`,
    },
  ].filter(Boolean) as any[]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-display text-xl font-bold text-white">Analytics</h2>
        <p className="text-slate-500 text-sm">Product performance and inventory insights</p>
      </div>

      {/* Insights */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <h3 className="font-display font-semibold text-white text-sm">Inventory Insights</h3>
        </div>
        {insights.length === 0 ? (
          <p className="text-slate-500 text-sm">Add sales data to generate insights</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {insights.map((insight, i) => (
              <div key={i} className={`flex gap-3 p-3 rounded-lg border ${insight.bg}`}>
                <insight.icon className={`w-4 h-4 shrink-0 mt-0.5 ${insight.color}`} />
                <div>
                  <p className={`text-sm font-semibold ${insight.color}`}>{insight.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{insight.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top & Slow movers */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3 className="font-display font-semibold text-white text-sm">Top 10 Fast Movers</h3>
          </div>
          <div>
            {topProducts.length === 0 ? (
              <p className="text-slate-500 text-sm py-4 text-center">No sales data yet</p>
            ) : topProducts.map(p => (
              <RankRow
                key={p.product_id}
                rank={p.rank}
                name={p.product_name}
                sub={`${p.brand_name} • Stock: ${p.current_stock}`}
                value={p.total_sold}
                up={true}
              />
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-slate-400" />
            <h3 className="font-display font-semibold text-white text-sm">Slow Moving Products</h3>
          </div>
          <div>
            {slowProducts.length === 0 ? (
              <p className="text-slate-500 text-sm py-4 text-center">No data available</p>
            ) : slowProducts.map(p => (
              <RankRow
                key={p.product_id}
                rank={p.rank}
                name={p.product_name}
                sub={`${p.brand_name} • Stock: ${p.current_stock}`}
                value={p.total_sold}
                up={false}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Brand & Category rankings */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-brand-400" />
            <h3 className="font-display font-semibold text-white text-sm">Brand Rankings</h3>
          </div>
          {brandSales.length === 0 ? (
            <p className="text-slate-500 text-sm py-4 text-center">No data</p>
          ) : brandSales.slice(0, 10).map((b, i) => (
            <RankRow key={b.brand_name} rank={i + 1} name={b.brand_name} value={b.total_sold} />
          ))}
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-blue-400" />
            <h3 className="font-display font-semibold text-white text-sm">Category Rankings</h3>
          </div>
          {categorySales.length === 0 ? (
            <p className="text-slate-500 text-sm py-4 text-center">No data</p>
          ) : categorySales.slice(0, 10).map((c, i) => (
            <RankRow key={c.category_name} rank={i + 1} name={c.category_name} value={c.total_sold} />
          ))}
        </div>
      </div>

      {/* Low stock alerts */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h3 className="font-display font-semibold text-white text-sm">Low Stock Alerts</h3>
          {(lowStockProducts.length + outOfStock.length) > 0 && (
            <span className="badge-red">{lowStockProducts.length + outOfStock.length} alerts</span>
          )}
        </div>
        {outOfStock.length === 0 && lowStockProducts.length === 0 ? (
          <p className="text-emerald-400 text-sm">✓ All products are well stocked</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left p-2 pl-0 table-header">Product</th>
                  <th className="text-left p-2 table-header hidden sm:table-cell">Brand</th>
                  <th className="text-right p-2 table-header">Current</th>
                  <th className="text-right p-2 table-header">Reorder</th>
                  <th className="text-center p-2 table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {[...outOfStock, ...lowStockProducts].map(p => (
                  <tr key={p.id} className="table-row">
                    <td className="p-2 pl-0 text-slate-200 text-sm">{p.name}</td>
                    <td className="p-2 text-slate-400 text-sm hidden sm:table-cell">{p.brand?.name}</td>
                    <td className="p-2 text-right font-mono text-sm font-semibold">
                      <span className={p.current_stock === 0 ? 'text-red-400' : 'text-amber-400'}>{p.current_stock}</span>
                    </td>
                    <td className="p-2 text-right font-mono text-sm text-slate-500">{p.reorder_level}</td>
                    <td className="p-2 text-center">
                      {p.current_stock === 0
                        ? <span className="badge-red">Out of Stock</span>
                        : <span className="badge-yellow">Low Stock</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
