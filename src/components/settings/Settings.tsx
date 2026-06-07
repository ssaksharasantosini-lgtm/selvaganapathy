import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Tag, Layers, Users, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Brand, Category } from '../../types'
import LoadingSpinner from '../shared/LoadingSpinner'

type Tab = 'brands' | 'categories' | 'users'

export default function Settings() {
  const [tab, setTab] = useState<Tab>('brands')
  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [newBrand, setNewBrand] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const [{ data: b }, { data: c }] = await Promise.all([
      supabase.from('brands').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
    ])
    setBrands(b || [])
    setCategories(c || [])
    setLoading(false)
  }

  function showMsg(type: 'success' | 'error', text: string) {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3000)
  }

  async function addBrand() {
    if (!newBrand.trim()) return
    const { error } = await supabase.from('brands').insert({ name: newBrand.trim() })
    if (error) showMsg('error', error.message)
    else { showMsg('success', 'Brand added'); setNewBrand(''); fetchData() }
  }

  async function deleteBrand(id: string) {
    const { error } = await supabase.from('brands').delete().eq('id', id)
    if (error) showMsg('error', 'Cannot delete brand with products')
    else { showMsg('success', 'Brand deleted'); fetchData() }
  }

  async function addCategory() {
    if (!newCategory.trim()) return
    const { error } = await supabase.from('categories').insert({ name: newCategory.trim() })
    if (error) showMsg('error', error.message)
    else { showMsg('success', 'Category added'); setNewCategory(''); fetchData() }
  }

  async function deleteCategory(id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) showMsg('error', 'Cannot delete category with products')
    else { showMsg('success', 'Category deleted'); fetchData() }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h2 className="font-display text-xl font-bold text-white">Settings</h2>
        <p className="text-slate-500 text-sm">Manage brands, categories, and store settings</p>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm animate-slide-up ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-slate-800 rounded-lg p-1 w-fit gap-1">
        {([['brands', 'Brands', Tag], ['categories', 'Categories', Layers]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === key ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card p-5 space-y-4">
          {/* Add new */}
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder={`Add new ${tab === 'brands' ? 'brand' : 'category'}...`}
              value={tab === 'brands' ? newBrand : newCategory}
              onChange={e => tab === 'brands' ? setNewBrand(e.target.value) : setNewCategory(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (tab === 'brands' ? addBrand() : addCategory())}
            />
            <button onClick={tab === 'brands' ? addBrand : addCategory} className="btn-primary px-3">
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {/* List */}
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {(tab === 'brands' ? brands : categories).map(item => (
              <div key={item.id} className="flex items-center justify-between px-3 py-2.5 bg-slate-800/60 rounded-lg group">
                <div className="flex items-center gap-2">
                  {tab === 'brands' ? <Tag className="w-3.5 h-3.5 text-slate-500" /> : <Layers className="w-3.5 h-3.5 text-slate-500" />}
                  <span className="text-slate-200 text-sm">{item.name}</span>
                </div>
                <button
                  onClick={() => tab === 'brands' ? deleteBrand(item.id) : deleteCategory(item.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {(tab === 'brands' ? brands : categories).length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">No {tab} yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
