export type UserRole = 'admin' | 'worker'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
  created_at: string
}

export interface Category {
  id: string
  name: string
  description?: string
  created_at: string
}

export interface Brand {
  id: string
  name: string
  description?: string
  created_at: string
}

export interface Product {
  id: string
  name: string
  sku: string
  brand_id: string
  category_id: string
  current_stock: number
  reorder_level: number
  unit_price: number
  unit: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined fields
  brand?: Brand
  category?: Category
  total_sold?: number
}

export interface StockMovement {
  id: string
  product_id: string
  movement_type: 'add' | 'reduce' | 'sale' | 'adjustment' | 'excel_import'
  quantity: number
  notes?: string
  created_by: string
  created_at: string
  product?: Product
  user?: UserProfile
}

export interface SaleRecord {
  id: string
  product_id: string
  quantity_sold: number
  sale_date: string
  created_by: string
  created_at: string
  product?: Product
}

export interface ExcelUpload {
  id: string
  file_name: string
  uploaded_by: string
  status: 'processing' | 'completed' | 'failed'
  rows_processed: number
  rows_failed: number
  error_log?: string
  created_at: string
}

export interface DashboardStats {
  total_products: number
  total_categories: number
  total_brands: number
  low_stock_count: number
  out_of_stock_count: number
  total_stock_value: number
  total_sold_today: number
  total_sold_week: number
  total_sold_month: number
}

export interface SalesSummary {
  date: string
  total_quantity: number
  product_count: number
}

export interface ProductSalesSummary {
  product_id: string
  product_name: string
  brand_name: string
  category_name: string
  total_sold: number
  current_stock: number
}

export interface BrandSalesSummary {
  brand_id: string
  brand_name: string
  total_sold: number
  product_count: number
}

export interface CategorySalesSummary {
  category_id: string
  category_name: string
  total_sold: number
  product_count: number
}

export interface ExcelRow {
  date: string
  product_name: string
  brand: string
  category: string
  stock_added: number
  quantity_sold: number
}

export interface Notification {
  id: string
  type: 'low_stock' | 'out_of_stock' | 'upload_complete' | 'upload_failed'
  message: string
  product_id?: string
  read: boolean
  created_at: string
}

export interface FilterState {
  search: string
  category: string
  brand: string
  sortBy: 'name' | 'stock' | 'sold' | 'brand' | 'category'
  sortOrder: 'asc' | 'desc'
}
