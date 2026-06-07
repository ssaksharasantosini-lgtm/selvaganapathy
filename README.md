# Selvaganapathy Hardware & Electricals
## Inventory Management & Sales Analytics System

A production-ready web application for managing inventory, tracking stock movements, and analysing sales performance for hardware and electrical stores.

---

## Features

| Feature | Details |
|---|---|
| **Authentication** | Login with Admin / Worker roles |
| **Dashboard** | Live KPIs, sales trend chart, top products |
| **Inventory** | Search, filter, sort — add/edit products |
| **Stock Management** | Add, reduce, record sales, set adjustment, full history |
| **Sales Analytics** | Daily / Weekly / Monthly charts, brand-wise & category-wise breakdown |
| **Analytics** | Top 10 fast movers, slow movers, brand rankings, low stock alerts, insights |
| **Excel Upload** | Drag-and-drop .xlsx / .xls / .csv import with preview & validation |
| **Settings** | Manage brands and categories |
| **Notifications** | Bell icon shows real-time low stock / out-of-stock alerts |

---

## Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Vite
- **Charts:** Recharts
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **Excel Parsing:** SheetJS (xlsx)
- **Deployment:** Vercel

---

## Quick Start

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)
- A [Vercel](https://vercel.com) account (free tier works)

---

## Step 1 — Supabase Setup

### 1.1 Create a new Supabase project
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New project**
3. Choose your organisation, name it `selvaganapathy-hardware`, set a strong DB password
4. Select the region closest to Tamil Nadu (Singapore `ap-southeast-1` recommended)
5. Click **Create new project** and wait ~2 minutes

### 1.2 Run the database schema
1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New query**
3. Open `supabase_schema.sql` from this project
4. Paste the entire contents and click **Run**
5. You should see: *"Success. No rows returned"*

This creates:
- `profiles` table (linked to auth.users)
- `brands` table
- `categories` table
- `products` table
- `stock_movements` table
- `sale_records` table
- `excel_uploads` table
- All indexes for performance
- Row Level Security (RLS) policies
- Sample brands and categories

### 1.3 Create the first Admin user
1. Go to **Authentication → Users** in Supabase dashboard
2. Click **Add user → Create new user**
3. Enter email and a strong password, click **Create user**
4. Go back to **SQL Editor** and run:

```sql
UPDATE profiles
SET role = 'admin', full_name = 'Store Manager'
WHERE email = 'your-admin-email@example.com';
```

5. To create a worker account, repeat step 2–3 but leave their role as `'worker'` (default).

### 1.4 Get your API credentials
1. Go to **Project Settings → API**
2. Copy:
   - **Project URL** (e.g. `https://abcdefgh.supabase.co`)
   - **anon / public key** (the long `eyJ...` string under "Project API keys")

---

## Step 2 — Local Development

```bash
# Clone / download the project
cd selvaganapathy-hardware

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Edit `.env` and fill in your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

```bash
# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and sign in with your admin account.

---

## Step 3 — Deploy to Vercel

### Option A: Via Vercel CLI (recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? (your account)
# - Link to existing project? No
# - Project name: selvaganapathy-hardware
# - Directory: ./
# - Override settings? No

# Add environment variables
vercel env add VITE_SUPABASE_URL
# paste your URL when prompted

vercel env add VITE_SUPABASE_ANON_KEY
# paste your anon key when prompted

# Deploy to production
vercel --prod
```

### Option B: Via Vercel Dashboard
1. Push this project to a GitHub repository
2. Go to [https://vercel.com/new](https://vercel.com/new)
3. Import your GitHub repository
4. In **Configure Project**:
   - Framework: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
6. Click **Deploy**

Your app will be live at `https://selvaganapathy-hardware.vercel.app` (or similar).

---

## Excel Upload Format

The Excel/CSV file must have these columns (column names are case-insensitive):

| Column | Required | Description |
|---|---|---|
| `Date` | Yes | Date of record (DD/MM/YYYY or MM/DD/YYYY) |
| `Product Name` | Yes | Full product name |
| `Brand` | Yes | Brand name (created automatically if new) |
| `Category` | Yes | Category name (created automatically if new) |
| `Stock Added` | No | Units added to stock (0 if none) |
| `Quantity Sold` | No | Units sold on that date (0 if none) |

**Download the template** from the Upload Excel page in the app.

### Sample data:
```
Date,Product Name,Brand,Category,Stock Added,Quantity Sold
01/01/2025,6mm PVC Wire (90m),Finolex,Wires & Cables,50,5
01/01/2025,MCB 32A Single Pole,Havells,MCB & Distribution,100,12
01/01/2025,Modular Switch 6A,Anchor,Switches,200,30
```

---

## Project Structure

```
selvaganapathy-hardware/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   └── LoginPage.tsx
│   │   ├── dashboard/
│   │   │   └── Dashboard.tsx
│   │   ├── inventory/
│   │   │   ├── Inventory.tsx
│   │   │   ├── StockHistory.tsx
│   │   │   ├── StockMovementModal.tsx
│   │   │   └── ProductModal.tsx
│   │   ├── sales/
│   │   │   └── Sales.tsx
│   │   ├── analytics/
│   │   │   └── Analytics.tsx
│   │   ├── upload/
│   │   │   └── UploadExcel.tsx
│   │   ├── settings/
│   │   │   └── Settings.tsx
│   │   └── shared/
│   │       ├── Layout.tsx
│   │       ├── Sidebar.tsx
│   │       ├── TopNav.tsx
│   │       ├── StatCard.tsx
│   │       └── LoadingSpinner.tsx
│   ├── hooks/
│   │   ├── useAuth.tsx
│   │   ├── useProducts.ts
│   │   ├── useAnalytics.ts
│   │   └── useStockHistory.ts
│   ├── lib/
│   │   └── supabase.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   ├── excelParser.ts
│   │   └── excelImporter.ts
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   └── vite-env.d.ts
├── supabase_schema.sql    ← Run this in Supabase SQL Editor
├── .env.example           ← Copy to .env and fill in credentials
├── vercel.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Role Permissions

| Feature | Admin | Worker |
|---|---|---|
| View Dashboard | ✅ | ✅ |
| View Inventory | ✅ | ✅ |
| Add / Edit Products | ✅ | ❌ |
| Manage Stock (add/reduce/sale) | ✅ | ✅ |
| View Stock History | ✅ | ✅ |
| View Sales Charts | ✅ | ✅ |
| View Analytics | ✅ | ✅ |
| Upload Excel | ✅ | ❌ |
| Manage Brands & Categories | ✅ | ❌ |

---

## Troubleshooting

**Login fails / "Invalid credentials"**
→ Make sure you created the user in Supabase Auth, not just in the profiles table.

**"Missing Supabase environment variables"**
→ Check your `.env` file has both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

**Products not showing after Excel upload**
→ Check the SQL Editor → Table Editor → `products` to confirm rows exist. Verify RLS policies ran correctly.

**Charts show no data**
→ Add some stock movements or sales records via the Stock button in Inventory, or upload an Excel file with Quantity Sold values.

**White screen on Vercel**
→ Ensure environment variables are set in Vercel dashboard under Project → Settings → Environment Variables.

---

## License
© 2025 Selvaganapathy Hardware & Electricals. All rights reserved.
