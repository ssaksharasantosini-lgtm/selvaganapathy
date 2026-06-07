-- =====================================================
-- Selvaganapathy Hardware & Electricals
-- Complete Supabase Database Schema
-- Run this SQL in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. USER PROFILES
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('admin', 'worker')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'worker')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 2. BRANDS
-- =====================================================
CREATE TABLE IF NOT EXISTS brands (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 3. CATEGORIES
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 4. PRODUCTS
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE RESTRICT,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  reorder_level INTEGER NOT NULL DEFAULT 10 CHECK (reorder_level >= 0),
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'pcs',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 5. STOCK MOVEMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('add', 'reduce', 'sale', 'adjustment', 'excel_import')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 6. SALE RECORDS
-- =====================================================
CREATE TABLE IF NOT EXISTS sale_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_sold INTEGER NOT NULL CHECK (quantity_sold > 0),
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 7. EXCEL UPLOADS
-- =====================================================
CREATE TABLE IF NOT EXISTS excel_uploads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  file_name TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  rows_processed INTEGER NOT NULL DEFAULT 0,
  rows_failed INTEGER NOT NULL DEFAULT 0,
  error_log TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_name ON products USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_records_product_id ON sale_records(product_id);
CREATE INDEX IF NOT EXISTS idx_sale_records_sale_date ON sale_records(sale_date);
CREATE INDEX IF NOT EXISTS idx_sale_records_created_at ON sale_records(created_at);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE excel_uploads ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE POLICY "Profiles: read all authenticated" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Profiles: update own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Brands: all authenticated can read; admins can write
CREATE POLICY "Brands: read all" ON brands FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Brands: admin write" ON brands FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Categories: all authenticated can read; admins can write
CREATE POLICY "Categories: read all" ON categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Categories: admin write" ON categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Products: all authenticated can read; all can update stock; admins can create/delete
CREATE POLICY "Products: read all" ON products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Products: update all authenticated" ON products FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Products: insert admin" ON products FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Products: delete admin" ON products FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Stock movements: all authenticated can read/write
CREATE POLICY "Stock movements: all authenticated" ON stock_movements FOR ALL USING (auth.role() = 'authenticated');

-- Sale records: all authenticated can read/write
CREATE POLICY "Sale records: all authenticated" ON sale_records FOR ALL USING (auth.role() = 'authenticated');

-- Excel uploads: admins only
CREATE POLICY "Excel uploads: admin only" ON excel_uploads FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =====================================================
-- SAMPLE DATA (run after setup to test)
-- =====================================================

-- Sample brands
INSERT INTO brands (name) VALUES
  ('Havells'), ('Finolex'), ('Legrand'), ('Polycab'), ('Anchor'),
  ('Schneider'), ('ABB'), ('Siemens'), ('GM Modular'), ('RR Kabel')
ON CONFLICT (name) DO NOTHING;

-- Sample categories
INSERT INTO categories (name) VALUES
  ('Wires & Cables'), ('Switches'), ('MCB & Distribution'), ('Lights & Fixtures'),
  ('Conduits & Pipes'), ('Sockets & Plugs'), ('Fans'), ('Tools'), ('Hardware'),
  ('Plumbing'), ('Paints'), ('Adhesives & Sealants')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- HOW TO CREATE YOUR FIRST ADMIN USER
-- =====================================================
-- 1. Go to Supabase Dashboard → Authentication → Users → "Invite user"
-- 2. Enter admin email and password
-- 3. After user is created, run this SQL (replace with actual user ID):
--
-- UPDATE profiles
-- SET role = 'admin', full_name = 'Store Admin'
-- WHERE email = 'admin@yourstore.com';
--
-- Or to make all users admin temporarily:
-- UPDATE profiles SET role = 'admin';
