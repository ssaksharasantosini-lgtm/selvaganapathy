import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { StockMovement } from '../types'

export function useStockHistory(productId?: string, limit = 200) {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMovements = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // ─── Query 1: stock_movements + product join ──────────────────────────
      // NOTE: The original query included `user:profiles(id, full_name, role)`.
      // stock_movements.created_by is a FK to auth.users, NOT to public.profiles.
      // PostgREST cannot resolve this join and returns:
      //   "Could not find a relationship between stock_movements and profiles"
      // This caused the entire query to fail → 0 movements shown.
      // Fix: fetch movements + products only. Then fetch user names separately.
      let query = supabase
        .from('stock_movements')
        .select(`
          *,
          product:products(
            id, name, sku, unit,
            brand:brands(id, name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (productId) {
        query = query.eq('product_id', productId)
      }

      const { data: movementData, error: movementError } = await query

      if (movementError) throw movementError

      if (!movementData || movementData.length === 0) {
        setMovements([])
        setLoading(false)
        return
      }

      // ─── Query 2: resolve user names from profiles ────────────────────────
      // profiles.id = auth.users.id, and stock_movements.created_by = auth.users.id
      // So we can look up profiles directly using the created_by UUIDs.
      const userIds = [...new Set(movementData.map(m => m.created_by).filter(Boolean))]
      const userMap: Record<string, string> = {}

      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('id', userIds)

        if (profileData) {
          for (const p of profileData) {
            userMap[p.id] = p.full_name || p.role || 'Unknown'
          }
        }
      }

      // ─── Merge user names into movements ─────────────────────────────────
      const result: StockMovement[] = movementData.map(m => ({
        ...m,
        user: {
          id: m.created_by,
          full_name: userMap[m.created_by] ?? 'Unknown',
          role: '',
        },
      })) as StockMovement[]

      setMovements(result)
    } catch (err: any) {
      console.error('[useStockHistory] fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [productId, limit])

  useEffect(() => {
    fetchMovements()
  }, [fetchMovements])

  return { movements, loading, error, refetch: fetchMovements }
}
