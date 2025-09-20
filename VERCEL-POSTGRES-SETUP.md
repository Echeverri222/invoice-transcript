# PostgreSQL Database Setup Guide (Neon - Free Alternative)

## 🗄️ Create Database via Vercel Marketplace

### Setup with Neon (Recommended - Free Tier)
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard) 
2. Go to your project → **"Storage"** tab
3. Under **"Marketplace Database Providers"**, click **"Neon"** → **"Create"**
4. Follow the integration flow to connect your Vercel account
5. Create new Neon project: `invoice-transcript-db`
6. Select region: **US East** or closest to your users
7. Complete the integration

### Alternative: Prisma Postgres
1. Click **"Prisma Postgres"** → **"Create"**  
2. Follow similar integration flow
3. Free tier with instant serverless PostgreSQL

### Option 2: Via Vercel CLI (Alternative)
```bash
# Install Vercel CLI if you don't have it
npm install -g vercel

# Login to Vercel
vercel login

# Create storage
vercel env add POSTGRES_URL
```

## 🔐 Automatic Environment Variables

After completing the Supabase integration, Vercel automatically adds these environment variables to your project:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Public API key
- `DATABASE_URL` or `POSTGRES_URL` - Direct PostgreSQL connection string

## 📝 Add to Local Environment Variables

For local development, add this to your `.env` file:
```bash
# Get these from your Vercel project settings → Environment Variables
POSTGRES_URL=your_supabase_postgres_connection_string_here
```

## 🔍 Find Your Connection String

1. Go to your Vercel project dashboard
2. Click **"Settings"** → **"Environment Variables"**  
3. Copy the `POSTGRES_URL` or `DATABASE_URL` value
4. It should look like: `postgres://postgres:[password]@[host]:5432/postgres`

## ⚡ Benefits of Neon Integration

- ✅ **Automatic environment variables** in Vercel
- ✅ **Neon Console** for database management  
- ✅ **Built-in connection pooling**
- ✅ **Generous free tier**: 3GB storage + 100 compute hours/month
- ✅ **Serverless scaling**: Pay only for what you use
- ✅ **Branching**: Database branches for testing (like Git!)
- ✅ **No credit card required** for free tier

## 🧪 Test Connection

After setup, you can test the connection locally by running:
```bash
npm run server
```

The server will automatically create the required tables on first run.

## 🚀 Deploy to Vercel

Once everything works locally:
```bash
vercel --prod
```

The database connection will work automatically in production!

## 📊 Database Schema

The migrated schema will include:

### `processed_invoices` table
- `id` (SERIAL PRIMARY KEY)
- `orden_servicio` (VARCHAR UNIQUE NOT NULL)
- `patient_name` (VARCHAR)
- `patient_id` (VARCHAR) 
- `processed_date` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- `excel_row_count` (INTEGER DEFAULT 0)
- `image_path` (VARCHAR)

### `invoice_services` table  
- `id` (SERIAL PRIMARY KEY)
- `invoice_id` (INTEGER REFERENCES processed_invoices(id))
- `service_code` (VARCHAR)
- `service_description` (VARCHAR)
- `service_value` (DECIMAL)

## 🎯 Benefits

- ✅ **Serverless-compatible**: Works perfectly with Vercel functions
- ✅ **Auto-scaling**: Handles traffic spikes automatically  
- ✅ **Connection pooling**: Built-in connection management
- ✅ **Backup & recovery**: Automatic daily backups
- ✅ **Monitoring**: Built-in performance metrics
- ✅ **Zero maintenance**: Fully managed by Vercel
