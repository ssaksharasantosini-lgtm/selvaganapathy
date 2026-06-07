import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Product, Brand, Category } from '../../types'
import { supabase } from '../../lib/supabase'

interface ProductModalProps {
  product?: Product | null
  onClose: () => void
  onSuccess: () => void
}

export default function ProductModal({ product, onClose, onSuccess }: ProductModalProps) {
  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    brand_id: product?.brand_id || '',
    category_id: product?.category_id || '',
    current_stock: product?.current_stock || 0,
    reorder_level: product?.reorder_level || 10,
    unit_price: product?.unit_price || 0,
    unit: product?.unit || 'pcs',
    description: product?.description || '',
  })

  useEffect(() => {
    Promise.all([
      supabase.from('brands').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
    ]).then(([{ data: b }, { data: c }]) => {
      setBrands(b || [])
      setCategories(c || [])
    })
  }, [])

  function update(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (product) {
        const { error } = await supabase
          .from('products')
          .update({ ...form, updated_at: new Date().toISOString() })
          .eq('id', product.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('products')
          .insert({ ...form, is_active: true })
        if (error) throw error
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card w-full max-w-lg shadow-2xl animate-slide-up max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h3 className="font-display font-semibold text-white">
            {product ? 'Edit Product' : 'Add New Product'}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label block mb-1.5">Product Name *</label>
              <input className="input w-full" value={form.name} onChange={e => update('name', e.target.value)} required placeholder="e.g. 6mm PVC Wire" />
            </div>
            <div>
              <label className="label block mb-1.5">SKU</label>
              <input className="input w-full" value={form.sku} onChange={e => update('sku', e.target.value)} placeholder="Auto-generated if blank" />
            </div>
            <div>
              <label className="label block mb-1.5">Unit</label>
              <select className="input w-full" value={form.unit} onChange={e => update('unit', e.target.value)}>
                {['pcs', 'box', 'roll', 'kg', 'ltr', 'mtr', 'set', 'pair'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label block mb-1.5">Brand *</label>
              <select className="input w-full" value={form.brand_id} onChange={e => update('brand_id', e.target.value)} required>
                <option value="">Select brand...</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label block mb-1.5">Category *</label>
              <select className="input w-full" value={form.category_id} onChange={e => update('category_id', e.target.value)} required>
                <option value="">Select category...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label block mb-1.5">Current Stock</label>
              <input type="number" className="input w-full" value={form.current_stock} onChange={e => update('current_stock', Number(e.target.value))} min="0" />
            </div>
            <div>
              <label className="label block mb-1.5">Reorder Level</label>
              <input type="number" className="input w-full" value={form.reorder_level} onChange={e => update('reorder_level', Number(e.target.value))} min="0" />
            </div>
            <div>
              <label className="label block mb-1.5">Unit Price (₹)</label>
              <input type="number" className="input w-full" value={form.unit_price} onChange={e => update('unit_price', Number(e.target.value))} min="0" step="0.01" />
            </div>
            <div className="col-span-2">
              <label className="label block mb-1.5">Description</label>
              <textarea className="input w-full resize-none" rows={2} value={form.description} onChange={e => update('description', e.target.value)} placeholder="Optional description..." />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : product ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
