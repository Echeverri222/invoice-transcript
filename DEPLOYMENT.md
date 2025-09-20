# Deployment Guide - Invoice Transcript App

## ✅ What's Already Configured

### S3 Integration
- ✅ Excel file storage and updates now use AWS S3
- ✅ Excel file uploaded to S3 bucket: `invoice-transcript`
- ✅ AWS SDK configured with proper credentials

### Batch Processing
- ✅ Multiple file upload support (drag & drop, file selection, camera)
- ✅ Parallel processing (4 files at a time)
- ✅ Progress tracking and comprehensive results display
- ✅ Mobile camera support for multiple photo capture

## 🚨 Critical Changes Needed for Vercel Deployment

### 1. Database Migration (REQUIRED)
**Current Issue**: SQLite (`better-sqlite3`) doesn't work on Vercel serverless functions.

**Solutions** (choose one):

#### Option A: Vercel Postgres (Recommended)
```bash
# Install Vercel Postgres
npm install @vercel/postgres
```

#### Option B: PlanetScale (MySQL)
```bash
# Install PlanetScale
npm install @planetscale/database
```

#### Option C: Supabase (PostgreSQL)
```bash
# Install Supabase
npm install @supabase/supabase-js
```

### 2. Google Vision API Key
**Current Issue**: Using local JSON key file that won't work on Vercel.

**Solution**: Convert to environment variable
1. Convert your Google service account JSON to base64
2. Add as Vercel environment variable
3. Update Vision API initialization

### 3. File Upload Storage
**Current Issue**: Local file uploads won't persist on serverless.

**Solutions**:
- Store uploaded images temporarily in S3
- Or use Vercel's built-in file handling
- Or store as base64 in database

## 🔧 Required Environment Variables for Vercel

Add these to your Vercel project settings:

```env
# OpenAI
OPENAI_API_KEY=your_openai_api_key

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=sa-east-1
S3_BUCKET=invoice-transcript

# Google Vision API (converted from JSON)
GOOGLE_CLOUD_PROJECT=your_project_id
GOOGLE_CLOUD_PRIVATE_KEY=your_base64_encoded_private_key
GOOGLE_CLOUD_CLIENT_EMAIL=your_service_account_email

# Database (choose your solution)
# For Vercel Postgres:
POSTGRES_URL=your_postgres_connection_string

# For PlanetScale:
DATABASE_URL=your_planetscale_connection_string

# For Supabase:
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📁 File Structure Changes Needed

### Current Structure:
```
├── server/index.js (Express server)
├── src/ (React app)
└── vercel.json
```

### Vercel-Compatible Structure:
```
├── api/
│   ├── upload-invoice.js (Serverless function)
│   └── invoices.js (Serverless function)
├── src/ (React app)
└── vercel.json
```

## 🚀 Deployment Steps

### 1. Choose and Configure Database
- Select a cloud database solution
- Update database operations in the code
- Test locally with cloud database

### 2. Convert Google Vision API
- Convert JSON key file to environment variables
- Update Vision API initialization code

### 3. Handle File Uploads
- Implement S3-based image storage
- Remove local file dependencies

### 4. Deploy to Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables
vercel env add OPENAI_API_KEY
vercel env add AWS_ACCESS_KEY_ID
# ... add all other variables
```

### 5. Test Production
- Test single invoice processing
- Test batch processing (10 invoices)
- Verify Excel file updates in S3
- Test mobile camera functionality

## 🎯 Next Steps

1. **Choose Database Solution** - Which would you prefer?
   - Vercel Postgres (easiest integration)
   - PlanetScale (good performance)
   - Supabase (feature-rich)

2. **Convert Google Vision API** - Need to convert JSON key to env vars

3. **Implement Serverless Functions** - Convert Express routes to Vercel functions

4. **Test & Deploy** - Full end-to-end testing

## 💡 Benefits After Migration

- ✅ Infinite scalability (serverless)
- ✅ No server management required
- ✅ Global CDN for frontend
- ✅ Automatic HTTPS
- ✅ Git-based deployments
- ✅ Environment variable management
- ✅ S3-based Excel file persistence

## 📊 Current Status

| Feature | Local | Vercel Ready |
|---------|-------|-------------|
| Frontend | ✅ | ✅ |
| Batch Processing | ✅ | ✅ |
| S3 Integration | ✅ | ✅ |
| Excel Operations | ✅ | ✅ |
| Vision API | ✅ | ✅ |
| Database | ❌ SQLite | ❌ Needs Cloud DB |
| File Uploads | ❌ Local | ❌ Needs S3 |

**What do you want to tackle first?**
