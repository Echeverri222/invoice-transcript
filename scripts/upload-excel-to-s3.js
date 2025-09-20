require('dotenv').config();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'sa-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const uploadExcelToS3 = async () => {
  try {
    const excelPath = path.join(__dirname, '..', 'ESTUDIOS DOPPLER JULIO - AGOSTO 2025.xlsx');
    
    if (!fs.existsSync(excelPath)) {
      console.error('Excel file not found at:', excelPath);
      return;
    }

    const fileContent = fs.readFileSync(excelPath);
    
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET || 'invoice-transcript',
      Key: 'ESTUDIOS DOPPLER JULIO - AGOSTO 2025.xlsx',
      Body: fileContent,
      ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const result = await s3Client.send(command);
    console.log('Excel file uploaded successfully to S3!');
    console.log('Location:', `https://${process.env.S3_BUCKET || 'invoice-transcript'}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/ESTUDIOS DOPPLER JULIO - AGOSTO 2025.xlsx`);
  } catch (error) {
    console.error('Error uploading Excel file to S3:', error);
  }
};

uploadExcelToS3();
