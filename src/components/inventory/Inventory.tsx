import React, { useState, useEffect } from 'react'
import {
  Search, SlidersHorizontal, Plus, Package,
  ChevronUp, ChevronDown, Edit2, Layers,
  AlertTriangle, AlertOctagon, ArrowUpDown, TrendingUp
} from 'lucide-react'
import { useProducts } from '../../hooks/useProducts'
import { FilterState, Product, Brand, Category } from '../../types'
import StockMovementModal from './StockMovementModal'
import ProductModal from './ProductModal'
import LoadingSpinner from '../shared/LoadingSpinner'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const defaultFilters: FilterState = {
  search: '', category: 'all', brand: 'all',
  sortBy: 'name', sortOrder: 'asc',
}

export default function Inventory() {
  const { isAdmin } = useAuth()
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [editProduct, setEditProduct] = useState<Product | null | undefined>(undefined)
  const [showAdd, setShowAdd] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const activeFilters = { ...filters, search: debouncedSearch }
  const { products, loading, refetch } = useProducts(activeFilters)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search), 300)
    return () => clearTimeout(t)
  }, [filters.search])

  useEffect(() => {
    Promise.all([
      supabase.from('brands').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
    ]).then(([{ data: b }, { data: c }]) => {
      setBrands(b || [])
      setCategories(c || [])
    })
  }, [])

  function toggleSort(field: FilterState['sortBy']) {
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }))
  }

  function SortIcon({ field }: { field: FilterState['sortBy'] }) {
    if (filters.sortBy !== field) return <ArrowUpDown className="w-3 h-3 text-slate-600" />
    return filters.sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-brand-400" /> : <ChevronDown className="w-3 h-3 text-brand-400" />
  }

  function getStockBadge(product: Product) {
    if (product.current_stock === 0)
      return <span className="badge-red"><AlertOctagon className="w-3 h-3" />Out of Stock</span>
    if (product.current_stock <= product.reorder_level)
      return <span className="badge-yellow"><AlertTriangle className="w-3 h-3" />Low</span>
    return <span className="badge-green">In Stock</span>
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-xl font-bold text-white">Inventory</h2>
          <p className="text-slate-500 text-sm">{products.length} products</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary ${showFilters ? 'border-brand-500/50 text-brand-400' : ''}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>
          {isAdmin && (
            <button onClick={() => setShowAdd(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          className="input w-full pl-9"
          placeholder="Search products, SKU..."
          value={filters.search}
          onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
        />
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 animate-slide-up">
          <div>
            <label className="label block mb-1">Category</label>
            <select className="input w-full" value={filters.category} onChange={e => setFilters(p => ({ ...p, category: e.target.value }))}>
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label block mb-1">Brand</label>
            <select className="input w-full" value={filters.brand} onChange={e => setFilters(p => ({ ...p, brand: e.target.value }))}>
              <option value="all">All Brands</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label block mb-1">Sort By</label>
            <select className="input w-full" value={filters.sortBy} onChange={e => setFilters(p => ({ ...p, sortBy: e.target.value as any }))}>
              <option value="name">Name</option>
              <option value="stock">Stock</option>
              <option value="sold">Total Sold</option>
              <option value="brand">Brand</option>
              <option value="category">Category</option>
            </select>
          </div>
          <div>
            <label className="label block mb-1">Order</label>
            <select className="input w-full" value={filters.sortOrder} onChange={e => setFilters(p => ({ ...p, sortOrder: e.target.value as any }))}>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => setFilters(defaultFilters)} className="btn-secondary w-full justify-center text-xs">
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left p-3 pl-4">
                  <button onClick={() => toggleSort('name')} className="table-header flex items-center gap-1 hover:text-slate-200 transition-colors">
                    Product <SortIcon field="name" />
                  </button>
                </th>
                <th className="text-left p-3 hidden md:table-cell">
                  <button onClick={() => toggleSort('brand')} className="table-header flex items-center gap-1 hover:text-slate-200 transition-colors">
                    Brand <SortIcon field="brand" />
                  </button>
                </th>
                <th className="text-left p-3 hidden lg:table-cell">
                  <button onClick={() => toggleSort('category')} className="table-header flex items-center gap-1 hover:text-slate-200 transition-colors">
                    Category <SortIcon field="category" />
                  </button>
                </th>
                <th className="text-right p-3">
                  <button onClick={() => toggleSort('stock')} className="table-header flex items-center gap-1 ml-auto hover:text-slate-200 transition-colors">
                    Stock <SortIcon field="stock" />
                  </button>
                </th>
                <th className="text-right p-3 hidden sm:table-cell">
                  <button onClick={() => toggleSort('sold')} className="table-header flex items-center gap-1 ml-auto hover:text-slate-200 transition-colors">
                    Sold <SortIcon field="sold" />
                  </button>
                </th>
                <th className="text-center p-3 hidden sm:table-cell">
                  <span className="table-header">Status</span>
                </th>
                <th className="text-right p-3 pr-4">
                  <span className="table-header">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}><LoadingSpinner /></td></tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Package className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                    <p className="text-slate-500">No products found</p>
                    <p className="text-slate-600 text-xs mt-1">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : products.map(product => (
                <tr key={product.id} className="table-row">
                  <td className="p-3 pl-4">
                    <div>
                      <p className="text-slate-200 text-sm font-medium">{product.name}</p>
                      <p className="text-slate-600 text-xs font-mono">{product.sku}</p>
                    </div>
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    <span className="text-slate-400 text-sm">{product.brand?.name || '—'}</span>
                  </td>
                  <td className="p-3 hidden lg:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3 h-3 text-slate-600" />
                      <span className="text-slate-400 text-sm">{product.category?.name || '—'}</span>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <span className={`font-mono font-semibold text-sm ${
                      product.current_stock === 0 ? 'text-red-400' :
                      product.current_stock <= product.reorder_level ? 'text-amber-400' :
                      'text-emerald-400'
                    }`}>
                      {product.current_stock}
                    </span>
                    <span className="text-slate-600 text-xs ml-1">{product.unit}</span>
                  </td>
                  <td className="p-3 text-right hidden sm:table-cell">
                    <div className="flex items-center justify-end gap-1">
                      <TrendingUp className="w-3 h-3 text-slate-600" />
                      <span className="text-slate-400 text-sm font-mono">{product.total_sold ?? 0}</span>
                    </div>
                  </td>
                  <td className="p-3 text-center hidden sm:table-cell">
                    {getStockBadge(product)}
                  </td>
                  <td className="p-3 pr-4">
                    <div className="flex items-center justify-end gap-1">
                      {isAdmin && (
                        <button
                          onClick={() => setEditProduct(product)}
                          className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all"
                          title="Edit product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedProduct(product)}
                        className="btn-primary py-1 px-3 text-xs"
                      >
                        Stock
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {selectedProduct && (
        <StockMovementModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onSuccess={refetch}
        />
      )}
      {(showAdd || editProduct !== undefined) && (
        <ProductModal
          product={editProduct}
          onClose={() => { setShowAdd(false); setEditProduct(undefined) }}
          onSuccess={refetch}
        />
      )}
    </div>
  )
}
