import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Product, FilterState } from '../types'

export function useProducts(filters?: Partial<FilterState>) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // ─── Query 1: fetch products with brand + category joins ──────────────
      // NOTE: The original query used `total_sold:sale_records(quantity_sold.sum())`
      // which is a PostgREST aggregate on a reverse-FK relation. This syntax is NOT
      // supported on all Supabase projects and causes the entire query to fail with
      // "Could not embed" — resulting in 0 products shown. Removed entirely.
      let query = supabase
        .from('products')
        .select(`
          *,
          brand:brands(id, name),
          category:categories(id, name)
        `)
        .eq('is_active', true)

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`)
      }
      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category_id', filters.category)
      }
      if (filters?.brand && filters.brand !== 'all') {
        query = query.eq('brand_id', filters.brand)
      }

      const { data: productData, error: productError } = await query

      if (productError) throw productError
      if (!productData || productData.length === 0) {
        setProducts([])
        setLoading(false)
        return
      }

      // ─── Query 2: fetch total sold per product from sale_records ──────────
      // Using a simple flat select and grouping in JS — fully compatible with
      // all Supabase/PostgREST versions. No aggregate syntax required.
      const productIds = productData.map(p => p.id)
      const { data: salesData } = await supabase
        .from('sale_records')
        .select('product_id, quantity_sold')
        .in('product_id', productIds)

      // Build a map: product_id -> total sold
      const soldMap: Record<string, number> = {}
      if (salesData) {
        for (const row of salesData) {
          soldMap[row.product_id] = (soldMap[row.product_id] || 0) + row.quantity_sold
        }
      }

      // ─── Merge ────────────────────────────────────────────────────────────
      let result: Product[] = productData.map(p => ({
        ...p,
        total_sold: soldMap[p.id] ?? 0,
      })) as Product[]

      // ─── Sort ─────────────────────────────────────────────────────────────
      if (filters?.sortBy) {
        result = result.sort((a, b) => {
          let valA: any, valB: any
          switch (filters.sortBy) {
            case 'name':     valA = a.name;           valB = b.name;           break
            case 'stock':    valA = a.current_stock;  valB = b.current_stock;  break
            case 'sold':     valA = a.total_sold ?? 0; valB = b.total_sold ?? 0; break
            case 'brand':    valA = a.brand?.name;    valB = b.brand?.name;    break
            case 'category': valA = a.category?.name; valB = b.category?.name; break
            default:         valA = a.name;           valB = b.name
          }
          if (typeof valA === 'string') {
            return filters.sortOrder === 'desc'
              ? (valB ?? '').localeCompare(valA ?? '')
              : (valA ?? '').localeCompare(valB ?? '')
          }
          return filters.sortOrder === 'desc' ? (valB ?? 0) - (valA ?? 0) : (valA ?? 0) - (valB ?? 0)
        })
      }

      setProducts(result)
    } catch (err: any) {
      console.error('[useProducts] fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filters?.search, filters?.category, filters?.brand, filters?.sortBy, filters?.sortOrder])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  return { products, loading, error, refetch: fetchProducts }
}

export async function addStockMovement(
  productId: string,
  type: 'add' | 'reduce' | 'sale' | 'adjustment',
  quantity: number,
  notes: string,
  userId: string
) {
  const { error: movementError } = await supabase
    .from('stock_movements')
    .insert({ product_id: productId, movement_type: type, quantity, notes, created_by: userId })

  if (movementError) throw movementError

  const { data: product } = await supabase
    .from('products')
    .select('current_stock')
    .eq('id', productId)
    .single()

  if (!product) throw new Error('Product not found')

  let newStock = product.current_stock
  if (type === 'add') newStock += quantity
  else if (type === 'reduce' || type === 'sale') newStock -= quantity
  else newStock = quantity // adjustment = set to absolute value

  if (newStock < 0) throw new Error('Insufficient stock')

  const { error: updateError } = await supabase
    .from('products')
    .update({ current_stock: newStock, updated_at: new Date().toISOString() })
    .eq('id', productId)

  if (updateError) throw updateError

  if (type === 'sale') {
    const { error: saleError } = await supabase
      .from('sale_records')
      .insert({
        product_id: productId,
        quantity_sold: quantity,
        sale_date: new Date().toISOString().split('T')[0],
        created_by: userId,
      })
    if (saleError) throw saleError
  }
}
