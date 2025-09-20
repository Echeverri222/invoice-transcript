require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const OpenAI = require('openai');
const vision = require('@google-cloud/vision');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
// Use Supabase with @vercel/postgres (works with any PostgreSQL)
const { sql } = require('@vercel/postgres');

const app = express();
const PORT = 3001;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Google Vision API
const visionClient = new vision.ImageAnnotatorClient({
  credentials: {
    project_id: process.env.GOOGLE_CLOUD_PROJECT,
    private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY,
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
  },
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
});

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'sa-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// S3 Configuration
const S3_BUCKET = process.env.S3_BUCKET || 'invoice-transcript';
const EXCEL_FILE_KEY = 'ESTUDIOS DOPPLER JULIO - AGOSTO 2025.xlsx';

// Middleware
app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// S3 Helper Functions
const downloadExcelFromS3 = async () => {
  try {
    console.log(`Downloading Excel file from S3: ${S3_BUCKET}/${EXCEL_FILE_KEY}`);
    
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: EXCEL_FILE_KEY,
    });
    
    const response = await s3Client.send(command);
    
    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    
    // Parse Excel workbook from buffer
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    return workbook;
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      console.log('Excel file not found in S3, creating new workbook');
      return XLSX.utils.book_new();
    } else {
      console.error('Error downloading Excel file from S3:', error);
      throw error;
    }
  }
};

const uploadExcelToS3 = async (workbook) => {
  try {
    console.log(`Uploading Excel file to S3: ${S3_BUCKET}/${EXCEL_FILE_KEY}`);
    
    // Convert workbook to buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: S3_BUCKET,
        Key: EXCEL_FILE_KEY,
        Body: buffer,
        ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
    
    const result = await upload.done();
    console.log('Excel file uploaded successfully to S3:', result.Location);
    return result;
  } catch (error) {
    console.error('Error uploading Excel file to S3:', error);
    throw error;
  }
};

// Initialize PostgreSQL database
const initDB = async () => {
  try {
    // Create processed_invoices table
    await sql`
      CREATE TABLE IF NOT EXISTS processed_invoices (
        id SERIAL PRIMARY KEY,
        orden_servicio VARCHAR(255) UNIQUE NOT NULL,
        patient_name VARCHAR(255),
        patient_id VARCHAR(50),
        processed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        excel_row_count INTEGER DEFAULT 0,
        image_path VARCHAR(500)
      )
    `;

    // Create invoice_services table
    await sql`
      CREATE TABLE IF NOT EXISTS invoice_services (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES processed_invoices(id),
        service_code VARCHAR(100),
        service_description VARCHAR(500),
        service_value DECIMAL(10,2)
      )
    `;

    console.log('PostgreSQL database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

// Initialize database
initDB();

// Helper function to encode image as base64
const encodeImage = (imagePath) => {
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString('base64');
};

// OCR processing using Google Vision API
const performOCR = async (imagePath) => {
  try {
    const [result] = await visionClient.documentTextDetection(imagePath);
    const fullTextAnnotation = result.fullTextAnnotation;
    return fullTextAnnotation ? fullTextAnnotation.text : '';
  } catch (error) {
    console.error('Vision API OCR failed:', error);
    return null; // Will fall back to direct GPT-4o Vision
  }
};

// Regex-based cedula extraction
const extractCedulaFromText = (text) => {
  // Look for "Paciente: 21906101 Fabio ..." pattern
  const patterns = [
    /paciente\s*:?\s*([0-9]{6,10})/i,
    /identificaci[oó]n\s*:?\s*([0-9]{6,10})/i,
    /c[eé]dula\s*:?\s*([0-9]{6,10})/i,
    /id\s*:?\s*([0-9]{6,10})/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const cedula = match[1];
      // Validate cedula length (6-10 digits for Colombian IDs)
      if (cedula.length >= 6 && cedula.length <= 10) {
        return cedula;
      }
    }
  }
  return null;
};

// Post-process extracted invoice data
const postProcessInvoiceData = async (parsedData) => {
  // Post-process EPS field - ensure it's properly mapped
  if (!parsedData.eps || parsedData.eps === '' || parsedData.eps === 'Unknown') {
    parsedData.eps = parsedData.plan || 'EPS no identificada';
  }
  
  // Post-process patient_id - ensure it's only numbers (Colombian cedula format)
  if (parsedData.patient_id) {
    // Remove all non-numeric characters
    parsedData.patient_id = parsedData.patient_id.toString().replace(/[^0-9]/g, '');
    // Ensure maximum 10 digits
    if (parsedData.patient_id.length > 10) {
      parsedData.patient_id = parsedData.patient_id.substring(0, 10);
    }
  }
  
  // Filter only DOPPLER services and process values
  if (parsedData.services && Array.isArray(parsedData.services)) {
    // Filter only DOPPLER services
    parsedData.services = parsedData.services.filter(service => {
      return service.description && 
             service.description.toLowerCase().includes('doppler');
    });
    
    // Process values for remaining DOPPLER services
    parsedData.services.forEach(service => {
      if (service.value) {
        let valueStr = service.value.toString().replace(/[^0-9]/g, '');
        
        // If OpenAI extracted the number before comma correctly, no processing needed
        // But if it included centavos (ends with 00), remove them
        let numericValue = parseInt(valueStr);
        
        // Only remove last 2 digits if they are actually "00" (centavos)
        if (valueStr.length > 2 && valueStr.endsWith('00')) {
          numericValue = Math.floor(numericValue / 100);
          console.log(`Removed centavos: ${valueStr} -> ${numericValue}`);
        } else {
          console.log(`No centavos to remove: ${valueStr} -> ${numericValue}`);
        }
        
        service.value = numericValue;
      }
    });
  }
  
  return parsedData;
};

// Enhanced extraction using OCR + GPT-4o text processing
const extractInvoiceDataEnhanced = async (imagePath) => {
  try {
    // Step 1: Try OCR with Vision API first
    console.log('Attempting OCR with Google Vision API...');
    const ocrText = await performOCR(imagePath);
    
    if (ocrText) {
      // Step 2: Pre-extract cedula with regex
      const extractedCedula = extractCedulaFromText(ocrText);
      console.log('OCR Text length:', ocrText.length);
      console.log('Pre-extracted cedula:', extractedCedula);
      
      // Step 3: Use GPT-4o for structured extraction with OCR text
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: `Extract information from this Colombian medical invoice OCR text following these EXACT rules:

            EXTRACTION RULES:
            1. PATIENT DATA: Look for the row that shows patient information in this EXACT format:
               "Paciente: [ID NUMBER] [PATIENT FULL NAME] Edad: [AGE]"
               - The ID is the NUMBER immediately after "Paciente:" 
               - Extract ONLY the digits from this position
               - The patient ID contains ONLY numbers, no letters
               - Patient ID should be 6-10 digits long
               ${extractedCedula ? `- OCR pre-extracted cedula: ${extractedCedula} (use this if it matches the pattern)` : ''}
            2. DATE: From top right corner, format as DD/MM/YYYY
            3. EPS: From "Entidad" or "Plan" field, look for these patterns and return EXACT match:
               - If contains "NUEVA EPS" → return "Nueva EPS"
               - If contains "ALIANZA" → return "Alianza"  
               - If contains "MUTUAL" → return "MUTUAL SER"
               - If contains "SANITAS" → return "SANITAS"
               - If contains "DISPENSARIO" → return "Dispensario Medico/Medellín"
               - If contains "SALUD TOTAL" → return "Salud Total"
               - Search the entire document for these keywords if not found in Entidad field
            4. SERVICES: From "NOMBRE" column, extract ALL services but identify which are DOPPLER
               - Include ALL services (DOPPLER, HOLTER, ECOCARDIOGRAMA, etc.)
               - REMOVE the word "ECOGRAFIA" from descriptions
               - System will filter for DOPPLER services later
            5. VALUES: From last column, take ONLY the number BEFORE the comma (Colombian pesos)
               - Extract the COMPLETE number as shown (e.g., 18360000, 25100000)
               - Do NOT remove any zeros, system will process values later
            6. DO NOT APPLY DISCOUNT: Extract original values, discount will be calculated later

            Return JSON format:
            {
              "orden_servicio": "service order number from ORDEN DE SERVICIO",
              "fecha": "date in DD/MM/YYYY format from top right",
              "hospital": "hospital name from header",
              "patient_name": "full patient name",
              "patient_id": "patient cedula (numbers only, max 10 digits)", 
              "age": "patient age with 'Años' or 'Meses' or 'Días'",
              "sex": "patient sex (Masculino/Femenino)",
              "eps": "matched EPS name from keywords list",
              "services": [
                {
                  "code": "service code (like 882222)",
                  "description": "service description WITHOUT 'ECOGRAFIA' word", 
                  "value": "complete original number from invoice (e.g., 18360000)"
                }
              ]
            }

            IMPORTANT: Extract ORIGINAL values (no discount). Remove "ECOGRAFIA" from ALL service descriptions.

            OCR TEXT TO PROCESS:
            ${ocrText}`
          }
        ],
        max_tokens: 1500
      });

      const extractedText = response.choices[0].message.content;
      const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[0]);
        
        // Post-process with extracted cedula if available
        if (extractedCedula && (!parsedData.patient_id || parsedData.patient_id.length < 6)) {
          parsedData.patient_id = extractedCedula;
        }
        
        return await postProcessInvoiceData(parsedData);
      } else {
        throw new Error('Could not parse JSON from OpenAI response');
      }
    } else {
      // Fallback to original Vision API method
      console.log('OCR failed, falling back to GPT-4o Vision...');
      return await extractInvoiceDataOriginal(imagePath);
    }
  } catch (error) {
    console.error('Enhanced extraction failed:', error);
    // Fallback to original method
    return await extractInvoiceDataOriginal(imagePath);
  }
};

// Original extraction method (kept as fallback)
const extractInvoiceDataOriginal = async (imagePath) => {
  try {
    const base64Image = encodeImage(imagePath);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract information from this Colombian medical invoice following these EXACT rules:

              EXTRACTION RULES:
              1. PATIENT DATA: Look for the row that shows patient information in this EXACT format:
                "Paciente: [ID NUMBER] [PATIENT FULL NAME] Edad: [AGE]"
                - The ID is the NUMBER immediately after "Paciente:" 
                - Extract ONLY the digits from this position
                - The patient ID contains ONLY numbers, no letters
                - Patient ID should be 6-10 digits long
              2. DATE: From top right corner, format as DD/MM/YYYY
              3. EPS: From "Entidad" or "Plan" field, look for these patterns and return EXACT match:
                 - If contains "NUEVA EPS" → return "Nueva EPS"
                 - If contains "ALIANZA" → return "Alianza"  
                 - If contains "MUTUAL" → return "MUTUAL SER"
                 - If contains "SANITAS" → return "SANITAS"
                 - If contains "DISPENSARIO" → return "Dispensario Medico/Medellín"
                 - If contains "SALUD TOTAL" → return "Salud Total"
                 - Search the entire document for these keywords if not found in Entidad field
              4. SERVICES: From "NOMBRE" column, extract ALL services but identify which are DOPPLER
                 - Include ALL services (DOPPLER, HOLTER, ECOCARDIOGRAMA, etc.)
                 - REMOVE the word "ECOGRAFIA" from descriptions
                 - System will filter for DOPPLER services later
              5. VALUES: From last column, take ONLY the number BEFORE the comma (Colombian pesos)
                 - Extract the COMPLETE number as shown (e.g., 18360000, 25100000)
                 - Do NOT remove any zeros, system will process values later
              6. DO NOT APPLY DISCOUNT: Extract original values, discount will be calculated later

              Return JSON format:
              {
                "orden_servicio": "service order number from ORDEN DE SERVICIO",
                "fecha": "date in DD/MM/YYYY format from top right",
                "hospital": "hospital name from header",
                "patient_name": "full patient name",
                "patient_id": "patient cedula (numbers only, max 10 digits)", 
                "age": "patient age with 'Años' or 'Meses' or 'Días'",
                "sex": "patient sex (Masculino/Femenino)",
                "eps": "matched EPS name from keywords list",
                "services": [
                  {
                    "code": "service code (like 882222)",
                    "description": "service description WITHOUT 'ECOGRAFIA' word", 
                    "value": "complete original number from invoice (e.g., 18360000)"
                  }
                ]
              }

              IMPORTANT: Extract ORIGINAL values (no discount). Remove "ECOGRAFIA" from ALL service descriptions.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    const extractedText = response.choices[0].message.content;
    // Parse the JSON response
    const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsedData = JSON.parse(jsonMatch[0]);
      return await postProcessInvoiceData(parsedData);
    } else {
      throw new Error('Could not parse JSON from OpenAI response');
    }
  } catch (error) {
    console.error('Error extracting invoice data:', error);
    throw error;
  }
};

// Main extraction function (uses enhanced method with fallback)
const extractInvoiceData = extractInvoiceDataEnhanced;

// Check if invoice already exists
const checkInvoiceExists = async (ordenServicio) => {
  try {
    const result = await sql`
      SELECT * FROM processed_invoices 
      WHERE orden_servicio = ${ordenServicio}
    `;
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking invoice exists:', error);
    return false;
  }
};

// Save invoice to database
const saveInvoiceToDatabase = async (invoiceData, imagePath) => {
  try {
    // Insert invoice and get the ID
    const invoiceResult = await sql`
      INSERT INTO processed_invoices (orden_servicio, patient_name, patient_id, excel_row_count, image_path)
      VALUES (${invoiceData.orden_servicio}, ${invoiceData.patient_name}, ${invoiceData.patient_id}, 
              ${invoiceData.services.length}, ${imagePath})
      RETURNING id
    `;

    const invoiceId = invoiceResult.rows[0].id;

    // Insert each service
    for (const service of invoiceData.services) {
      // service.value already processed (last 2 zeros removed)
      const numericValue = typeof service.value === 'number' ? service.value : parseFloat(service.value);
      
      await sql`
        INSERT INTO invoice_services (invoice_id, service_code, service_description, service_value)
        VALUES (${invoiceId}, ${service.code}, ${service.description}, ${numericValue})
      `;
    }

    return invoiceId;
  } catch (error) {
    console.error('Error saving invoice to database:', error);
    throw error;
  }
};

// Update Excel file with new data (using S3)
const updateExcelFile = async (invoiceData) => {
  let workbook;
  
  try {
    // Download existing Excel file from S3
    workbook = await downloadExcelFromS3();
  } catch (error) {
    console.error('Error downloading Excel file from S3, creating new one:', error);
    workbook = XLSX.utils.book_new();
  }

  // Get or create the main worksheet
  let worksheet;
  const sheetName = 'Estudios Doppler';
  
  if (workbook.Sheets[sheetName]) {
    worksheet = workbook.Sheets[sheetName];
  } else {
    // Create new worksheet with headers
    const headers = [
      'FECHA',
      'NOMBRE', 
      'ID',
      'EPS',
      'ESTUDIOS REALIZADOS',
      'COSTO',
      'COSTO FINAL',
      'OBSERVACIONES'
    ];
    worksheet = XLSX.utils.aoa_to_sheet([headers]);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }

  // Get current data to find next row
  const currentData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  let nextRow = currentData.length + 1;

  // Add each service as a separate row
  invoiceData.services.forEach(service => {
    // service.value already processed (last 2 zeros removed)
    const originalValue = typeof service.value === 'number' ? service.value : parseFloat(service.value);
    const finalValue = originalValue * 0.5; // Apply 50% discount
    
    const newRow = [
      invoiceData.fecha,                    // FECHA
      invoiceData.patient_name,             // NOMBRE
      invoiceData.patient_id,               // ID
      invoiceData.eps || invoiceData.plan,  // EPS
      service.description,                  // ESTUDIOS REALIZADOS
      originalValue,                        // COSTO (original, already processed)
      finalValue,                          // COSTO FINAL (50% discount)
      ''                                   // OBSERVACIONES (empty)
    ];

    // Add the row to the worksheet
    XLSX.utils.sheet_add_aoa(worksheet, [newRow], { origin: `A${nextRow}` });
    nextRow++;
  });

  // Upload the updated workbook to S3
  await uploadExcelToS3(workbook);
  
  return invoiceData.services.length; // Return number of rows added
};

// API Routes

// Upload and process invoice
app.post('/api/upload-invoice', upload.single('invoice'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const imagePath = req.file.path;
    
    // Extract data from image
    const invoiceData = await extractInvoiceData(imagePath);
    
    // Check if invoice already exists
    if (await checkInvoiceExists(invoiceData.orden_servicio)) {
      return res.status(409).json({ 
        error: 'Invoice already processed',
        orden_servicio: invoiceData.orden_servicio
      });
    }

    // Save to database
    const invoiceId = await saveInvoiceToDatabase(invoiceData, imagePath);
    
    // Update Excel file in S3
    const rowsAdded = await updateExcelFile(invoiceData);
    
    res.json({
      success: true,
      message: 'Invoice processed successfully',
      data: invoiceData,
      rowsAdded: rowsAdded,
      invoiceId: invoiceId
    });

  } catch (error) {
    console.error('Error processing invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get processed invoices
app.get('/api/processed-invoices', async (req, res) => {
  try {
    const result = await sql`
      SELECT pi.*, STRING_AGG(inv_svc.service_code || ': ' || inv_svc.service_description, '; ') as services
      FROM processed_invoices pi
      LEFT JOIN invoice_services inv_svc ON pi.id = inv_svc.invoice_id
      GROUP BY pi.id, pi.orden_servicio, pi.patient_name, pi.patient_id, pi.processed_date, pi.excel_row_count, pi.image_path
      ORDER BY pi.processed_date DESC
    `;
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check if invoice exists
app.get('/api/check-invoice/:ordenServicio', async (req, res) => {
  try {
    const exists = await checkInvoiceExists(req.params.ordenServicio);
    res.json({ exists });
  } catch (error) {
    console.error('Error checking invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete processed invoice
app.delete('/api/invoice/:id', async (req, res) => {
  try {
    // Delete services first (foreign key constraint)
    await sql`DELETE FROM invoice_services WHERE invoice_id = ${req.params.id}`;
    
    // Then delete the invoice
    await sql`DELETE FROM processed_invoices WHERE id = ${req.params.id}`;
    
    res.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Make sure to set your OPENAI_API_KEY environment variable');
});
