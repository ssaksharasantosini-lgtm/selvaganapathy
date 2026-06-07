import { supabase } from '../lib/supabase'
import { ExcelRow } from '../types'

interface ImportResult {
  processed: number
  failed: number
  errors: string[]
}

export async function importExcelData(rows: ExcelRow[], userId: string, uploadId: string): Promise<ImportResult> {
  let processed = 0
  let failed = 0
  const errors: string[] = []

  for (const row of rows) {
    try {
      // Upsert category
      const { data: category } = await supabase
        .from('categories')
        .upsert({ name: row.category }, { onConflict: 'name' })
        .select('id')
        .single()

      if (!category) throw new Error('Failed to upsert category')

      // Upsert brand
      const { data: brand } = await supabase
        .from('brands')
        .upsert({ name: row.brand }, { onConflict: 'name' })
        .select('id')
        .single()

      if (!brand) throw new Error('Failed to upsert brand')

      // Find or create product
      let { data: product } = await supabase
        .from('products')
        .select('id, current_stock')
        .eq('name', row.product_name)
        .eq('brand_id', brand.id)
        .single()

      if (!product) {
        const { data: newProduct, error } = await supabase
          .from('products')
          .insert({
            name: row.product_name,
            sku: generateSKU(row.brand, row.product_name),
            brand_id: brand.id,
            category_id: category.id,
            current_stock: row.stock_added,
            reorder_level: 10,
            unit_price: 0,
            unit: 'pcs',
          })
          .select('id, current_stock')
          .single()

        if (error || !newProduct) throw new Error(`Failed to create product: ${row.product_name}`)
        product = newProduct
      } else {
        // Update stock
        const newStock = product.current_stock + row.stock_added - row.quantity_sold
        await supabase
          .from('products')
          .update({ current_stock: Math.max(0, newStock), updated_at: new Date().toISOString() })
          .eq('id', product.id)
      }

      // Log stock movement if stock was added
      if (row.stock_added > 0) {
        await supabase.from('stock_movements').insert({
          product_id: product.id,
          movement_type: 'excel_import',
          quantity: row.stock_added,
          notes: `Excel import - ${row.date}`,
          created_by: userId,
        })
      }

      // Log sale if quantity was sold
      if (row.quantity_sold > 0) {
        await supabase.from('sale_records').insert({
          product_id: product.id,
          quantity_sold: row.quantity_sold,
          sale_date: row.date,
          created_by: userId,
        })

        await supabase.from('stock_movements').insert({
          product_id: product.id,
          movement_type: 'sale',
          quantity: row.quantity_sold,
          notes: `Excel import sale - ${row.date}`,
          created_by: userId,
        })
      }

      processed++
    } catch (err: any) {
      failed++
      errors.push(`${row.product_name}: ${err.message}`)
    }
  }

  // Update upload record
  await supabase.from('excel_uploads').update({
    status: failed === rows.length ? 'failed' : 'completed',
    rows_processed: processed,
    rows_failed: failed,
    error_log: errors.length > 0 ? errors.slice(0, 50).join('\n') : null,
  }).eq('id', uploadId)

  return { processed, failed, errors }
}

function generateSKU(brand: string, product: string): string {
  const b = brand.substring(0, 3).toUpperCase()
  const p = product.substring(0, 4).toUpperCase().replace(/\s/g, '')
  const num = Math.floor(Math.random() * 9000) + 1000
  return `${b}-${p}-${num}`
}
