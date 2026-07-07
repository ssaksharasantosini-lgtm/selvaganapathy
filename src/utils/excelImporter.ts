import { supabase } from '../lib/supabase'
import { ExcelRow } from '../types'

interface ImportResult {
  processed: number
  failed: number
  errors: string[]
}

// Batch size per network request, and how many product-updates run in
// parallel at once. Kept conservative to avoid overwhelming Supabase /
// hitting payload size limits, while still being dramatically faster
// than one request per row.
const CHUNK_SIZE = 400
const UPDATE_CONCURRENCY = 20

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let cursor = 0
  async function run() {
    while (cursor < items.length) {
      const i = cursor++
      await worker(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run))
}

function generateSKU(brand: string, product: string): string {
  const b = (brand || 'GEN').substring(0, 3).toUpperCase()
  const p = (product || 'ITEM').substring(0, 4).toUpperCase().replace(/\s/g, '')
  const num = Math.floor(Math.random() * 90000) + 10000
  return `${b}-${p}-${num}`
}

export async function importExcelData(rows: ExcelRow[], userId: string, uploadId: string): Promise<ImportResult> {
  const errors: string[] = []
  let processed = 0
  let failed = 0

  try {
    // --- 1. Upsert every unique category & brand ONCE (not once per row) ---
    const uniqueCategoryNames = Array.from(new Set(rows.map(r => r.category).filter(Boolean)))
    const uniqueBrandNames = Array.from(new Set(rows.map(r => r.brand).filter(Boolean)))

    const categoryMap = new Map<string, string>()
    for (const batch of chunkArray(uniqueCategoryNames, CHUNK_SIZE)) {
      const { data, error } = await supabase
        .from('categories')
        .upsert(batch.map(name => ({ name })), { onConflict: 'name' })
        .select('id, name')
      if (error) throw new Error(`Category upsert failed: ${error.message}`)
      data?.forEach(c => categoryMap.set(c.name, c.id))
    }

    const brandMap = new Map<string, string>()
    for (const batch of chunkArray(uniqueBrandNames, CHUNK_SIZE)) {
      const { data, error } = await supabase
        .from('brands')
        .upsert(batch.map(name => ({ name })), { onConflict: 'name' })
        .select('id, name')
      if (error) throw new Error(`Brand upsert failed: ${error.message}`)
      data?.forEach(b => brandMap.set(b.name, b.id))
    }

    // --- 2. Fetch all existing products for the brands involved, in one go ---
    const brandIds = Array.from(brandMap.values())
    const existingByKey = new Map<string, { id: string; current_stock: number }>()

    for (const batch of chunkArray(brandIds, CHUNK_SIZE)) {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, brand_id, current_stock')
        .in('brand_id', batch)
      if (error) throw new Error(`Failed to load existing products: ${error.message}`)
      data?.forEach(p => existingByKey.set(`${p.brand_id}::${p.name}`, { id: p.id, current_stock: p.current_stock }))
    }

    // --- 3. Walk every row once: decide who's new, who needs a stock delta, and what history to log ---
    interface NewProductDraft {
      row: ExcelRow
      brandId: string
      categoryId: string
      stock: number
    }
    const newProducts = new Map<string, NewProductDraft>()
    const stockDeltas = new Map<string, number>()
    const rowsToLog: { row: ExcelRow; key: string }[] = []

    for (const row of rows) {
      const brandId = brandMap.get(row.brand)
      const categoryId = categoryMap.get(row.category)
      if (!brandId || !categoryId) {
        failed++
        errors.push(`${row.product_name}: Could not resolve brand/category`)
        continue
      }

      const key = `${brandId}::${row.product_name}`
      const delta = row.stock_added - row.quantity_sold

      if (existingByKey.has(key)) {
        stockDeltas.set(key, (stockDeltas.get(key) || 0) + delta)
      } else {
        const draft = newProducts.get(key)
        if (draft) {
          draft.stock += delta
        } else {
          newProducts.set(key, { row, brandId, categoryId, stock: delta })
        }
      }

      rowsToLog.push({ row, key })
    }

    // --- 4. Bulk-insert brand-new products (falls back to one-by-one only if a whole batch errors) ---
    const productIdByKey = new Map<string, string>()
    const draftsArray = Array.from(newProducts.entries())

    for (const batch of chunkArray(draftsArray, CHUNK_SIZE)) {
      const payload = batch.map(([, d]) => ({
        name: d.row.product_name,
        sku: generateSKU(d.row.brand, d.row.product_name),
        brand_id: d.brandId,
        category_id: d.categoryId,
        current_stock: Math.max(0, d.stock),
        reorder_level: 10,
        unit_price: 0,
        unit: 'pcs',
      }))

      const { data, error } = await supabase.from('products').insert(payload).select('id, name, brand_id')

      if (!error && data) {
        data.forEach(p => productIdByKey.set(`${p.brand_id}::${p.name}`, p.id))
      } else {
        // One bad row shouldn't sink the whole batch — retry this batch individually.
        for (const [key, d] of batch) {
          const { data: single, error: singleErr } = await supabase
            .from('products')
            .insert({
              name: d.row.product_name,
              sku: generateSKU(d.row.brand, d.row.product_name),
              brand_id: d.brandId,
              category_id: d.categoryId,
              current_stock: Math.max(0, d.stock),
              reorder_level: 10,
              unit_price: 0,
              unit: 'pcs',
            })
            .select('id')
            .single()

          if (singleErr || !single) {
            failed++
            errors.push(`${d.row.product_name}: ${singleErr?.message || 'Insert failed'}`)
          } else {
            productIdByKey.set(key, single.id)
          }
        }
      }
    }

    // --- 5. Apply stock deltas to existing products in parallel (bounded concurrency) ---
    const updateEntries = Array.from(stockDeltas.entries())
    await runWithConcurrency(updateEntries, UPDATE_CONCURRENCY, async ([key, delta]) => {
      const existing = existingByKey.get(key)!
      const newStock = Math.max(0, existing.current_stock + delta)
      const { error } = await supabase
        .from('products')
        .update({ current_stock: newStock, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (error) {
        failed++
        errors.push(`${key.split('::')[1]}: Stock update failed - ${error.message}`)
      }
    })

    // --- 6. Bulk-insert stock movement & sale history for every row ---
    const stockMovementRows: any[] = []
    const saleRecordRows: any[] = []

    for (const { row, key } of rowsToLog) {
      const productId = existingByKey.get(key)?.id || productIdByKey.get(key)
      if (!productId) continue // already recorded as failed above

      if (row.stock_added > 0) {
        stockMovementRows.push({
          product_id: productId,
          movement_type: 'excel_import',
          quantity: row.stock_added,
          notes: `Excel import - ${row.date}`,
          created_by: userId,
        })
      }
      if (row.quantity_sold > 0) {
        saleRecordRows.push({
          product_id: productId,
          quantity_sold: row.quantity_sold,
          sale_date: row.date,
          created_by: userId,
        })
        stockMovementRows.push({
          product_id: productId,
          movement_type: 'sale',
          quantity: row.quantity_sold,
          notes: `Excel import sale - ${row.date}`,
          created_by: userId,
        })
      }
      processed++
    }

    for (const batch of chunkArray(stockMovementRows, CHUNK_SIZE)) {
      const { error } = await supabase.from('stock_movements').insert(batch)
      if (error) errors.push(`Some stock movement history failed to save: ${error.message}`)
    }

    for (const batch of chunkArray(saleRecordRows, CHUNK_SIZE)) {
      const { error } = await supabase.from('sale_records').insert(batch)
      if (error) errors.push(`Some sale records failed to save: ${error.message}`)
    }
  } catch (err: any) {
    errors.push(err.message || 'Import failed')
    failed = rows.length - processed
  }

  // Update upload record
  await supabase.from('excel_uploads').update({
    status: failed >= rows.length ? 'failed' : 'completed',
    rows_processed: processed,
    rows_failed: failed,
    error_log: errors.length > 0 ? errors.slice(0, 50).join('\n') : null,
  }).eq('id', uploadId)

  return { processed, failed, errors }
}
