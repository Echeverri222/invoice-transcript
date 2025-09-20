# 🩺 Medical Invoice Processing App

A production-ready React/TypeScript application that processes medical invoice images using AI and automatically manages Excel files with extracted DOPPLER service data.

## 🌐 Live Application

**Production URL:** [invoice-transcript-app.vercel.app](https://invoice-transcript-2y78xmgur-simon-echeverri-zapatas-projects.vercel.app)

## ✨ Features

- 📱 **Mobile Camera Support**: Take photos directly from your phone
- 🔄 **Batch Processing**: Upload and process up to 19 invoices simultaneously
- 🤖 **Dual AI Processing**: OpenAI GPT-4o + Google Vision API for enhanced accuracy
- ☁️ **Cloud Storage**: AWS S3 for Excel file storage and management
- 📥 **Excel Downloads**: Download current Excel file anytime
- 🗄️ **PostgreSQL Database**: Cloud database with duplicate prevention
- 🎯 **DOPPLER Filtering**: Only processes DOPPLER services, ignoring other types
- 🛡️ **Race Condition Protection**: Handles concurrent processing safely
- 💰 **Value Processing**: Automatically removes centavos and applies 50% discount
- 🎨 **Modern UI**: Responsive interface with real-time progress tracking

## 🏗️ Tech Stack

### Frontend

- React 18 + TypeScript
- Ant Design + Styled Components
- React Dropzone for file uploads
- Axios for API communication

### Backend

- Node.js + Express (Serverless on Vercel)
- OpenAI GPT-4o Vision API
- Google Cloud Vision API
- Multer with memory storage

### Cloud Services

- **Deployment**: Vercel (Serverless)
- **Database**: PostgreSQL (Neon)
- **Storage**: AWS S3 (sa-east-1)
- **Version Control**: GitHub with auto-deployment

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- OpenAI API key with GPT-4o access
- Google Cloud Vision API credentials
- AWS S3 bucket and credentials
- PostgreSQL database (Neon recommended)

### Local Development

```bash
# Clone repository
git clone https://github.com/Echeverri222/invoice-transcript.git
cd invoice-transcript

# Install dependencies
npm install

# Set up environment variables (see below)
cp .env.example .env
# Edit .env with your credentials

# Start development servers
npm run server    # Backend on port 3001
npm start         # Frontend on port 3000
```

### Environment Variables

Create `.env` file in root:

```env
# AI Services
OPENAI_API_KEY=sk-your-openai-key-here
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourPrivateKeyHere\n-----END PRIVATE KEY-----"
GOOGLE_CLOUD_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=sa-east-1
S3_BUCKET=your-bucket-name

# Database
POSTGRES_URL=postgresql://user:password@host:port/database
```

## 📊 How It Works

### 1. Image Processing Pipeline

```
Upload Image → Google Vision OCR → GPT-4o Processing → Data Extraction
```

### 2. Data Filtering

- Extracts ALL services from invoice
- **Filters only DOPPLER services** (ignores HOLTER, ECOCARDIOGRAMA, etc.)
- Validates Colombian cedula format (max 10 digits, numbers only)
- Processes currency values (removes centavos, validates < 1M pesos)

### 3. EPS Recognition

Automatically maps insurance providers:

- NUEVA EPS → Nueva EPS
- ALIANZA → Alianza
- SURAMERICANA → Sura
- MUTUAL SER → MUTUAL SER
- SANITAS → SANITAS
- DISPENSARIO → Dispensario Medico/Medellín
- SALUD TOTAL → Salud Total

### 4. Excel File Management

- **Single Processing**: Updates Excel immediately
- **Batch Processing**: Updates Excel once after all processing completes
- **Race Condition Safe**: Prevents data loss during concurrent uploads
- **Cloud Storage**: Stored in AWS S3 for global access

## 📋 Excel Output Format

| Column              | Description               | Example                     |
| ------------------- | ------------------------- | --------------------------- |
| FECHA               | Processing date           | 2025-09-20                  |
| NOMBRE              | Patient name              | MARIA GARCIA                |
| ID                  | Colombian cedula          | 12345678                    |
| EPS                 | Insurance provider        | Nueva EPS                   |
| ESTUDIOS REALIZADOS | Service description       | DOPPLER DE VASOS DEL CUELLO |
| COSTO               | Original cost             | 183600                      |
| COSTO FINAL         | Final cost (50% discount) | 91800                       |
| OBSERVACIONES       | Notes (empty)             |                             |

## 🔧 API Endpoints

### Upload & Processing

- `POST /api/upload-invoice` - Process single invoice image
- `POST /api/batch-update-excel` - Rebuild Excel from database (prevents race conditions)

### Data Management

- `GET /api/processed-invoices` - List all processed invoices
- `GET /api/check-invoice/:ordenServicio` - Check if invoice exists
- `GET /api/download-excel` - Download current Excel file
- `DELETE /api/invoice/:id` - Delete processed invoice

## 🗄️ Database Schema

### `processed_invoices`

```sql
id SERIAL PRIMARY KEY,
orden_servicio VARCHAR(255) UNIQUE NOT NULL,
patient_name VARCHAR(255),
patient_id VARCHAR(50), 
processed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
excel_row_count INTEGER DEFAULT 0,
image_path VARCHAR(500)
```

### `invoice_services`

```sql
id SERIAL PRIMARY KEY,
invoice_id INTEGER REFERENCES processed_invoices(id),
service_code VARCHAR(100),
service_description VARCHAR(500),
service_value DECIMAL(10,2)
```

## 📱 Usage

### Single Invoice

1. **Upload**: Drag & drop or click to select image
2. **Camera**: Use "Take Photo" for mobile capture
3. **Process**: AI extracts and validates data
4. **Review**: Verify extracted information
5. **Save**: Data saved to database and Excel updated

### Batch Processing

1. **Multiple Upload**: Select/drag up to 19 images
2. **Parallel Processing**: 4 concurrent AI processing threads
3. **Progress Tracking**: Real-time progress bar and current file display
4. **Batch Excel Update**: Single Excel update after all processing
5. **Results Summary**: Shows successful/failed processing counts

### Excel Management

- **Auto-Update**: Excel file updated automatically after processing
- **Download**: Click "Download Excel File" button anytime
- **Cloud Sync**: File stored in S3, accessible globally
- **Version Control**: Each update replaces previous version

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. **Fork Repository**

   ```bash
   # Fork https://github.com/Echeverri222/invoice-transcript
   ```
2. **Connect to Vercel**

   - Import project from GitHub
   - Set environment variables in Vercel dashboard
   - Enable automatic deployments
3. **Configure Environment Variables**

   - Add all required environment variables in Vercel project settings
   - Use Vercel secrets for sensitive data
4. **Deploy**

   - Push to main branch triggers automatic deployment
   - Production URL provided after successful build

### Database Setup (Neon)

1. Create account at [neon.tech](https://neon.tech)
2. Create new project: `invoice-transcript-db`
3. Copy connection string to `POSTGRES_URL`
4. Tables created automatically on first run

### AWS S3 Setup

1. Create S3 bucket in `sa-east-1` region
2. Set bucket policy for application access
3. Create IAM user with S3 permissions
4. Add credentials to environment variables

## 🔍 Monitoring & Logs

### Production Logs

```bash
# View real-time logs
npx vercel logs your-deployment-url

# Check API status
curl https://your-app.vercel.app/api/processed-invoices
```

### Health Checks

- Database connectivity: Automatic table creation on startup
- S3 connectivity: Excel download/upload tests
- AI services: Error handling with fallbacks

## 🛠️ Development

### Project Structure

```
├── src/
│   ├── components/          # React components
│   ├── services/           # API communication
│   ├── types/             # TypeScript definitions
│   └── App.tsx           # Main application
├── server/
│   └── index.js          # Express server (serverless)
├── scripts/
│   └── upload-excel-to-s3.js  # S3 utilities
├── vercel.json           # Vercel configuration
└── package.json         # Dependencies and scripts
```

### Available Scripts

- `npm start` - React development server
- `npm run build` - Production build
- `npm run server` - Backend server (development)
- `npm run vercel-build` - Vercel production build
- `npm run upload-excel` - Upload Excel to S3

### Testing

```bash
# Test single invoice processing
curl -X POST -F "invoice=@test-image.jpg" \
  https://your-app.vercel.app/api/upload-invoice

# Test Excel batch update  
curl -X POST https://your-app.vercel.app/api/batch-update-excel

# Download Excel file
curl -O https://your-app.vercel.app/api/download-excel
```

## ⚡ Performance

- **Batch Processing**: Up to 19 invoices processed concurrently (4 at a time)
- **AI Processing**: ~10-15 seconds per invoice (dual AI pipeline)
- **Excel Updates**: Single operation prevents race conditions
- **Serverless Scaling**: Auto-scales based on demand
- **Global CDN**: Vercel edge network for fast loading

## 🛡️ Security

- **Environment Variables**: All secrets stored securely
- **CORS Protection**: Configured for production domains
- **Input Validation**: File type and size restrictions
- **Database Security**: PostgreSQL with SSL connections
- **S3 Security**: IAM roles with minimal permissions

## 🚨 Troubleshooting

### Common Issues

**"Failed to load processed invoices"**

- Check POSTGRES_URL environment variable
- Verify database connectivity

**"Server error during processing"**

- Check OpenAI API key and quota
- Verify Google Vision API credentials

**"Excel download failed"**

- Check AWS S3 credentials and bucket permissions
- Verify S3_BUCKET environment variable

**"Race condition data loss"**

- Use batch Excel update endpoint: `POST /api/batch-update-excel`
- Check database for all processed invoices
