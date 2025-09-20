# Invoice Transcript App

A React/TypeScript application that processes medical invoice images using OpenAI Vision API and automatically updates Excel files with extracted data.

## Features

- 🖼️ **Image Processing**: Upload medical invoice images for automatic data extraction
- 🤖 **AI-Powered**: Uses OpenAI Vision API to read and extract invoice information
- 📊 **Excel Integration**: Automatically updates Excel files with processed data
- 🗄️ **Database Tracking**: SQLite database to track processed invoices and prevent duplicates
- 📋 **Multiple Services**: Handles invoices with multiple service entries (creates separate rows)
- 🎨 **Modern UI**: Beautiful and responsive interface built with Ant Design

## Tech Stack

- **Frontend**: React 18, TypeScript, Ant Design, Styled Components
- **Backend**: Node.js, Express, SQLite (better-sqlite3)
- **AI**: OpenAI Vision API (GPT-4-Vision)
- **File Processing**: XLSX library for Excel file handling
- **Database**: SQLite for invoice tracking

## Prerequisites

- Node.js (version 14 or higher)
- OpenAI API key
- Git

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd invoice-transcript
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Environment Variables

Create a `.env` file in the root directory and add your OpenAI API key:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

### 4. Start the Backend Server

```bash
npm run server
```

The server will start on port 3001.

### 5. Start the React Frontend

In a new terminal:

```bash
npm start
```

The application will open in your browser at `http://localhost:3000`.

## Usage

### Processing Invoices

1. **Upload Image**: Drag and drop or click to upload a medical invoice image
2. **Process**: Click "Process Invoice" to extract data using AI
3. **Review**: View the extracted information and verify accuracy
4. **Excel Update**: The system automatically updates the Excel file with new rows

### Features

- **Duplicate Detection**: The app prevents processing the same invoice twice
- **Multiple Services**: Each service in an invoice creates a separate Excel row
- **History Tracking**: View all previously processed invoices
- **Error Handling**: Clear error messages for troubleshooting

### Supported Image Formats

- PNG, JPG, JPEG, GIF, BMP, WEBP

## Database Schema

The application uses SQLite with two main tables:

### `processed_invoices`
- `id`: Primary key
- `orden_servicio`: Service order number (unique)
- `patient_name`: Patient's full name
- `patient_id`: Patient's ID number
- `processed_date`: When the invoice was processed
- `excel_row_count`: Number of rows added to Excel
- `image_path`: Path to the uploaded image

### `invoice_services`
- `id`: Primary key
- `invoice_id`: Foreign key to processed_invoices
- `service_code`: Service code
- `service_description`: Service description
- `service_value`: Service value/cost

## API Endpoints

- `POST /api/upload-invoice`: Upload and process invoice image
- `GET /api/processed-invoices`: Get list of all processed invoices
- `GET /api/check-invoice/:ordenServicio`: Check if invoice already exists
- `DELETE /api/invoice/:id`: Delete processed invoice

## Excel File Structure

The system expects/creates an Excel file with these columns:

1. Orden de Servicio (Service Order)
2. Fecha (Date)
3. Hospital
4. Paciente (Patient)
5. Identificación (ID)
6. Edad (Age)
7. Sexo (Sex)
8. Plan
9. Código Servicio (Service Code)
10. Descripción Servicio (Service Description)
11. Valor (Value)

## Configuration

### OpenAI Configuration
The system uses the GPT-4-Vision model for image processing. Make sure your OpenAI account has access to vision models.

### Excel File Location
By default, the system looks for/updates the Excel file at:
```
ESTUDIOS DOPPLER JULIO - AGOSTO 2025.xlsx
```

You can modify this in `server/index.js` on line 203.

## Error Handling

- **Duplicate Invoice**: Returns 409 status with invoice details
- **Invalid Image**: Returns 400 status with error message
- **OpenAI API Error**: Returns 500 status with API error details
- **Database Error**: Returns 500 status with database error details

## Development

### Project Structure

```
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── ImageUpload.tsx
│   │   ├── ProcessingResults.tsx
│   │   └── ProcessedInvoices.tsx
│   ├── services/
│   │   └── api.ts
│   ├── types/
│   │   └── Invoice.ts
│   ├── App.tsx
│   └── index.tsx
├── server/
│   ├── index.js
│   └── uploads/ (created automatically)
├── package.json
├── tsconfig.json
└── README.md
```

### Available Scripts

- `npm start`: Start the React development server
- `npm run build`: Build the React app for production
- `npm run server`: Start the backend server
- `npm test`: Run tests

## Troubleshooting

### Common Issues

1. **"OpenAI API key not found"**
   - Make sure you've set the `OPENAI_API_KEY` environment variable

2. **"Server not responding"**
   - Ensure the backend server is running on port 3001
   - Check for port conflicts

3. **"Database error"**
   - The SQLite database is created automatically
   - Check file permissions in the project directory

4. **"Excel file not found"**
   - The system creates a new Excel file if none exists
   - Ensure you have write permissions in the project directory

### Logs

- Backend logs are displayed in the server terminal
- Frontend errors appear in the browser console

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the console logs for error details
3. Ensure all dependencies are properly installed
4. Verify your OpenAI API key is valid and has vision access
