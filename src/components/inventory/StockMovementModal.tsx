import React, { useState } from 'react'
import { X, Plus, Minus, SlidersHorizontal } from 'lucide-react'
import { Product } from '../../types'
import { addStockMovement } from '../../hooks/useProducts'
import { useAuth } from '../../hooks/useAuth'

interface StockModalProps {
  product: Product
  onClose: () => void
  onSuccess: () => void
}

type MovementType = 'add' | 'reduce' | 'sale' | 'adjustment'

export default function StockMovementModal({ product, onClose, onSuccess }: StockModalProps) {
  const { user } = useAuth()
  const [type, setType] = useState<MovementType>('add')
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const typeConfig = {
    add: { label: 'Add Stock', icon: Plus, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    reduce: { label: 'Reduce Stock', icon: Minus, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    sale: { label: 'Record Sale', icon: Minus, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    adjustment: { label: 'Set Stock Level', icon: SlidersHorizontal, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    const qty = parseInt(quantity)
    if (!qty || qty <= 0) { setError('Please enter a valid quantity'); return }
    if (type === 'reduce' || type === 'sale') {
      if (qty > product.current_stock) { setError(`Cannot reduce by more than current stock (${product.current_stock})`); return }
    }

    setLoading(true)
    setError('')
    try {
      await addStockMovement(product.id, type, qty, notes, user.id)
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
      <div className="card w-full max-w-md shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h3 className="font-display font-semibold text-white">Manage Stock</h3>
            <p className="text-slate-400 text-xs mt-0.5 truncate max-w-[240px]">{product.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Current stock */}
          <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-lg">
            <span className="text-slate-400 text-sm">Current Stock</span>
            <span className={`font-mono font-bold text-lg ${
              product.current_stock === 0 ? 'text-red-400' :
              product.current_stock <= product.reorder_level ? 'text-amber-400' :
              'text-emerald-400'
            }`}>
              {product.current_stock} <span className="text-slate-500 text-xs font-normal">{product.unit}</span>
            </span>
          </div>

          {/* Movement type */}
          <div>
            <label className="label block mb-2">Action</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(typeConfig) as [MovementType, any][]).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setType(key)}
                  className={`p-2.5 rounded-lg border text-sm font-medium flex items-center gap-2 transition-all ${
                    type === key ? config.bg + ' ' + config.color : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <config.icon className="w-3.5 h-3.5" />
                  {config.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="label block mb-1.5">
              {type === 'adjustment' ? 'New Stock Level' : 'Quantity'}
            </label>
            <input
              type="number"
              className="input w-full"
              placeholder={type === 'adjustment' ? 'Enter new stock level' : 'Enter quantity'}
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              min="1"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="label block mb-1.5">Notes (optional)</label>
            <input
              type="text"
              className="input w-full"
              placeholder="Reason or reference..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
