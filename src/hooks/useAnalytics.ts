import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns'

export interface DailySales {
  date: string
  total: number
}

export interface TopProduct {
  product_id: string
  product_name: string
  brand_name: string
  category_name: string
  total_sold: number
  current_stock: number
  rank: number
}

export interface BrandSales {
  brand_name: string
  total_sold: number
}

export interface CategorySales {
  category_name: string
  total_sold: number
}

export function useAnalytics() {
  const [dailySales, setDailySales] = useState<DailySales[]>([])
  const [weeklySales, setWeeklySales] = useState<DailySales[]>([])
  const [monthlySales, setMonthlySales] = useState<DailySales[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [slowProducts, setSlowProducts] = useState<TopProduct[]>([])
  const [brandSales, setBrandSales] = useState<BrandSales[]>([])
  const [categorySales, setCategorySales] = useState<CategorySales[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    await Promise.all([
      fetchDailySales(),
      fetchWeeklySales(),
      fetchMonthlySales(),
      fetchTopProducts(),
      fetchBrandSales(),
      fetchCategorySales(),
    ])
    setLoading(false)
  }

  async function fetchDailySales() {
    const start = format(subDays(new Date(), 30), 'yyyy-MM-dd')
    const { data } = await supabase
      .from('sale_records')
      .select('sale_date, quantity_sold')
      .gte('sale_date', start)
      .order('sale_date')

    const grouped: Record<string, number> = {}
    for (let i = 29; i >= 0; i--) {
      grouped[format(subDays(new Date(), i), 'yyyy-MM-dd')] = 0
    }
    data?.forEach(r => { grouped[r.sale_date] = (grouped[r.sale_date] || 0) + r.quantity_sold })
    setDailySales(Object.entries(grouped).map(([date, total]) => ({ date, total })))
  }

  async function fetchWeeklySales() {
    const start = format(subDays(new Date(), 84), 'yyyy-MM-dd')
    const { data } = await supabase
      .from('sale_records')
      .select('sale_date, quantity_sold')
      .gte('sale_date', start)
      .order('sale_date')

    const grouped: Record<string, number> = {}
    data?.forEach(r => {
      const weekStart = format(startOfWeek(new Date(r.sale_date)), 'MMM dd')
      grouped[weekStart] = (grouped[weekStart] || 0) + r.quantity_sold
    })
    setWeeklySales(Object.entries(grouped).map(([date, total]) => ({ date, total })))
  }

  async function fetchMonthlySales() {
    const start = format(subDays(new Date(), 365), 'yyyy-MM-dd')
    const { data } = await supabase
      .from('sale_records')
      .select('sale_date, quantity_sold')
      .gte('sale_date', start)

    const grouped: Record<string, number> = {}
    data?.forEach(r => {
      const month = format(new Date(r.sale_date), 'MMM yyyy')
      grouped[month] = (grouped[month] || 0) + r.quantity_sold
    })
    setMonthlySales(Object.entries(grouped).map(([date, total]) => ({ date, total })))
  }

  async function fetchTopProducts() {
    const { data } = await supabase
      .from('sale_records')
      .select(`
        product_id,
        quantity_sold,
        products:product_id (
          name, current_stock,
          brand:brands(name),
          category:categories(name)
        )
      `)

    const map: Record<string, any> = {}
    data?.forEach((r: any) => {
      if (!map[r.product_id]) {
        map[r.product_id] = {
          product_id: r.product_id,
          product_name: r.products?.name || 'Unknown',
          brand_name: r.products?.brand?.name || 'Unknown',
          category_name: r.products?.category?.name || 'Unknown',
          current_stock: r.products?.current_stock || 0,
          total_sold: 0,
        }
      }
      map[r.product_id].total_sold += r.quantity_sold
    })

    const sorted = Object.values(map).sort((a: any, b: any) => b.total_sold - a.total_sold)
    setTopProducts(sorted.slice(0, 10).map((p: any, i) => ({ ...p, rank: i + 1 })))
    setSlowProducts(sorted.slice(-10).reverse().map((p: any, i) => ({ ...p, rank: i + 1 })))
  }

  async function fetchBrandSales() {
    const { data } = await supabase
      .from('sale_records')
      .select(`quantity_sold, products:product_id(brand:brands(name))`)

    const map: Record<string, number> = {}
    data?.forEach((r: any) => {
      const brand = r.products?.brand?.name || 'Unknown'
      map[brand] = (map[brand] || 0) + r.quantity_sold
    })
    setBrandSales(
      Object.entries(map)
        .sort(([, a], [, b]) => b - a)
        .map(([brand_name, total_sold]) => ({ brand_name, total_sold }))
    )
  }

  async function fetchCategorySales() {
    const { data } = await supabase
      .from('sale_records')
      .select(`quantity_sold, products:product_id(category:categories(name))`)

    const map: Record<string, number> = {}
    data?.forEach((r: any) => {
      const cat = r.products?.category?.name || 'Unknown'
      map[cat] = (map[cat] || 0) + r.quantity_sold
    })
    setCategorySales(
      Object.entries(map)
        .sort(([, a], [, b]) => b - a)
        .map(([category_name, total_sold]) => ({ category_name, total_sold }))
    )
  }

  return { dailySales, weeklySales, monthlySales, topProducts, slowProducts, brandSales, categorySales, loading, refetch: fetchAll }
}

export function useDashboardStats() {
  const [stats, setStats] = useState({
    total_products: 0,
    total_categories: 0,
    total_brands: 0,
    low_stock_count: 0,
    out_of_stock_count: 0,
    total_sold_today: 0,
    total_sold_week: 0,
    total_sold_month: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    setLoading(true)
    const today = format(new Date(), 'yyyy-MM-dd')
    const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd')
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')

    const [
      { count: total_products },
      { count: total_categories },
      { count: total_brands },
      { data: products },
      { data: todaySales },
      { data: weekSales },
      { data: monthSales },
    ] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('categories').select('*', { count: 'exact', head: true }),
      supabase.from('brands').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('current_stock, reorder_level').eq('is_active', true),
      supabase.from('sale_records').select('quantity_sold').eq('sale_date', today),
      supabase.from('sale_records').select('quantity_sold').gte('sale_date', weekStart),
      supabase.from('sale_records').select('quantity_sold').gte('sale_date', monthStart),
    ])

    const low_stock_count = products?.filter(p => p.current_stock > 0 && p.current_stock <= p.reorder_level).length || 0
    const out_of_stock_count = products?.filter(p => p.current_stock === 0).length || 0
    const total_sold_today = todaySales?.reduce((s, r) => s + r.quantity_sold, 0) || 0
    const total_sold_week = weekSales?.reduce((s, r) => s + r.quantity_sold, 0) || 0
    const total_sold_month = monthSales?.reduce((s, r) => s + r.quantity_sold, 0) || 0

    setStats({
      total_products: total_products || 0,
      total_categories: total_categories || 0,
      total_brands: total_brands || 0,
      low_stock_count,
      out_of_stock_count,
      total_sold_today,
      total_sold_week,
      total_sold_month,
    })
    setLoading(false)
  }

  return { stats, loading, refetch: fetchStats }
}
