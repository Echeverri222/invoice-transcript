import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadOutlined, InboxOutlined, LoadingOutlined, CameraOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { message, Card, Button, Typography, Space, Alert, Progress, List, Tag } from 'antd';
import styled from 'styled-components';
import { apiService } from '../services/api';
import { ProcessingResponse } from '../types/Invoice';

const { Title, Text } = Typography;

const DropzoneContainer = styled.div<{ isDragActive: boolean }>`
  border: 2px dashed ${props => props.isDragActive ? '#1890ff' : '#d9d9d9'};
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.3s;
  background-color: ${props => props.isDragActive ? '#f0f8ff' : '#fafafa'};
  
  &:hover {
    border-color: #40a9ff;
  }
`;

export interface BatchProcessingResults {
  successful: ProcessingResponse[];
  failed: { fileName: string; error: string }[];
}

interface ImageUploadProps {
  onUploadSuccess: (response: ProcessingResponse) => void;
  onBatchUploadSuccess: (results: BatchProcessingResults) => void;
  onUploadError: (error: string) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onUploadSuccess, onBatchUploadSuccess, onUploadError }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<{ file: File; url: string }[]>([]);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  const [currentProcessing, setCurrentProcessing] = useState<string>('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.filter(file => 
      !uploadedFiles.some(existing => existing.name === file.name && existing.size === file.size)
    );
    
    if (newFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...newFiles]);
      
      const newPreviews = newFiles.map(file => ({
        file,
        url: URL.createObjectURL(file)
      }));
      setPreviewUrls(prev => [...prev, ...newPreviews]);
      
      message.success(`Added ${newFiles.length} file(s). Total: ${uploadedFiles.length + newFiles.length}`);
    } else {
      message.info('All selected files are already added');
    }
  }, [uploadedFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']
    },
    multiple: true
  });

  // Mobile camera capture - allows multiple photos
  const handleCameraCapture = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files).filter(file => 
        !uploadedFiles.some(existing => existing.name === file.name && existing.size === file.size)
      );
      
      if (newFiles.length > 0) {
        setUploadedFiles(prev => [...prev, ...newFiles]);
        
        const newPreviews = newFiles.map(file => ({
          file,
          url: URL.createObjectURL(file)
        }));
        setPreviewUrls(prev => [...prev, ...newPreviews]);
        
        message.success(`Added ${newFiles.length} photo(s). Total: ${uploadedFiles.length + newFiles.length}`);
      }
    }
    // Reset input to allow same file selection
    event.target.value = '';
  }, [uploadedFiles]);

  const removeFile = useCallback((fileToRemove: File) => {
    setUploadedFiles(prev => prev.filter(f => f !== fileToRemove));
    setPreviewUrls(prev => {
      const previewToRemove = prev.find(p => p.file === fileToRemove);
      if (previewToRemove) {
        URL.revokeObjectURL(previewToRemove.url);
      }
      return prev.filter(p => p.file !== fileToRemove);
    });
  }, []);

  const processBatch = async (files: File[]): Promise<BatchProcessingResults> => {
    const results: BatchProcessingResults = { successful: [], failed: [] };
    const BATCH_SIZE = 4; // Process 4 files in parallel
    
    setProcessingProgress({ current: 0, total: files.length });
    
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (file) => {
        setCurrentProcessing(file.name);
        try {
          const response = await apiService.uploadInvoice(file);
          results.successful.push(response);
          setProcessingProgress(prev => ({ ...prev, current: prev.current + 1 }));
          return { success: true, fileName: file.name };
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || error.message || 'Failed to process invoice';
          results.failed.push({ fileName: file.name, error: errorMessage });
          setProcessingProgress(prev => ({ ...prev, current: prev.current + 1 }));
          return { success: false, fileName: file.name, error: errorMessage };
        }
      });
      
      await Promise.all(batchPromises);
    }
    
    return results;
  };

  const handleUpload = async () => {
    if (uploadedFiles.length === 0) {
      message.warning('Please select at least one image');
      return;
    }

    setIsUploading(true);
    setCurrentProcessing('');
    
    try {
      if (uploadedFiles.length === 1) {
        // Single file processing
        const response = await apiService.uploadInvoice(uploadedFiles[0]);
        message.success(`Invoice processed successfully! Added ${response.rowsAdded} rows to Excel.`);
        onUploadSuccess(response);
      } else {
        // Batch processing
        const results = await processBatch(uploadedFiles);
        
        const totalSuccess = results.successful.length;
        const totalFailed = results.failed.length;
        const totalRows = results.successful.reduce((sum, r) => sum + r.rowsAdded, 0);
        
        if (totalSuccess > 0) {
          message.success(`Batch processing complete! ${totalSuccess} invoices processed, ${totalRows} rows added to Excel.`);
        }
        if (totalFailed > 0) {
          message.error(`${totalFailed} invoices failed to process.`);
        }
        
        onBatchUploadSuccess(results);
      }
      
      // Reset form
      handleClear();
    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to process invoices';
      message.error(errorMessage);
      onUploadError(errorMessage);
    } finally {
      setIsUploading(false);
      setProcessingProgress({ current: 0, total: 0 });
      setCurrentProcessing('');
    }
  };

  const handleClear = () => {
    setUploadedFiles([]);
    previewUrls.forEach(preview => URL.revokeObjectURL(preview.url));
    setPreviewUrls([]);
    setProcessingProgress({ current: 0, total: 0 });
    setCurrentProcessing('');
  };

  return (
    <Card title={<Title level={4}>Upload Invoice Images (Batch Processing)</Title>}>
      <div>
        {/* Drag & Drop Area */}
        <DropzoneContainer {...getRootProps()} isDragActive={isDragActive}>
          <input {...getInputProps()} />
          <InboxOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
          <div>
            <Text strong>Click or drag multiple invoice images to this area</Text>
            <br />
            <Text type="secondary">
              Supports: PNG, JPG, JPEG, GIF, BMP, WEBP • Multiple files supported
            </Text>
            <br />
            <Text type="secondary">
              {uploadedFiles.length > 0 ? `${uploadedFiles.length} files selected` : 'Select multiple files for batch processing'}
            </Text>
          </div>
        </DropzoneContainer>
        
        {/* Camera Options */}
        <div style={{ textAlign: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
          <Text type="secondary" style={{ marginBottom: 12, display: 'block' }}>
            Or take multiple photos with your camera
          </Text>
          <Space>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={handleCameraCapture}
              style={{ display: 'none' }}
              id="camera-input"
            />
            <Button
              icon={<CameraOutlined />}
              onClick={() => document.getElementById('camera-input')?.click()}
              size="large"
            >
              Take Photo
            </Button>
            <Button
              icon={<PlusOutlined />}
              onClick={() => document.getElementById('file-input')?.click()}
              size="large"
            >
              Select Files
            </Button>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                if (e.target.files) {
                  const files = Array.from(e.target.files);
                  onDrop(files);
                }
                e.target.value = '';
              }}
              style={{ display: 'none' }}
              id="file-input"
            />
          </Space>
        </div>

        {/* File List */}
        {uploadedFiles.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text strong>
                Selected Files ({uploadedFiles.length})
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  {(uploadedFiles.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024).toFixed(2)} MB total
                </Tag>
              </Text>
              <Button 
                size="small" 
                onClick={handleClear} 
                disabled={isUploading}
                icon={<DeleteOutlined />}
              >
                Clear All
              </Button>
            </div>

            <List
              size="small"
              dataSource={uploadedFiles}
              renderItem={(file, index) => (
                <List.Item
                  actions={[
                    <Button
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => removeFile(file)}
                      disabled={isUploading}
                      danger
                    >
                      Remove
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    title={file.name}
                    description={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                  />
                  {previewUrls.find(p => p.file === file) && (
                    <img
                      src={previewUrls.find(p => p.file === file)?.url}
                      alt={file.name}
                      style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }}
                    />
                  )}
                </List.Item>
              )}
            />
          </div>
        )}

        {/* Processing Progress */}
        {isUploading && processingProgress.total > 0 && (
          <div style={{ marginTop: 24 }}>
            <Alert
              message="Processing Invoices..."
              description={
                <div>
                  <div style={{ marginBottom: 8 }}>
                    Processing: {currentProcessing || 'Preparing...'}
                  </div>
                  <Progress
                    percent={Math.round((processingProgress.current / processingProgress.total) * 100)}
                    status="active"
                    format={() => `${processingProgress.current}/${processingProgress.total}`}
                  />
                </div>
              }
              type="info"
              showIcon
            />
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Space size="large">
            <Button
              type="primary"
              icon={isUploading ? <LoadingOutlined /> : <UploadOutlined />}
              onClick={handleUpload}
              loading={isUploading}
              size="large"
              disabled={uploadedFiles.length === 0}
            >
              {isUploading ? 
                (uploadedFiles.length === 1 ? 'Processing...' : 'Processing Batch...') : 
                (uploadedFiles.length === 1 ? 'Process Invoice' : `Process ${uploadedFiles.length} Invoices`)
              }
            </Button>
            <Button 
              onClick={handleClear} 
              disabled={isUploading}
              size="large"
            >
              Clear All
            </Button>
          </Space>
        </div>
      </div>
    </Card>
  );
};

export default ImageUpload;
