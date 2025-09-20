import React, { useState } from 'react';
import { Layout, Typography, Space, Divider, Alert, Card, List, Tag, Button, message } from 'antd';
import { FileTextOutlined, MedicineBoxOutlined, CheckCircleOutlined, CloseCircleOutlined, DownloadOutlined, LoadingOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import ImageUpload, { BatchProcessingResults } from './components/ImageUpload';
import ProcessingResults from './components/ProcessingResults';
import ProcessedInvoices from './components/ProcessedInvoices';
import { ProcessingResponse } from './types/Invoice';
import { apiService } from './services/api';
import 'antd/dist/reset.css';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

const StyledLayout = styled(Layout)`
  min-height: 100vh;
`;

const StyledHeader = styled(Header)`
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  display: flex;
  align-items: center;
  padding: 0 50px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  color: white;
  
  .ant-typography {
    color: white !important;
    margin: 0;
  }
`;

const StyledContent = styled(Content)`
  padding: 24px 50px;
  background-color: #f0f2f5;
`;

const ContentContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const StyledFooter = styled(Footer)`
  text-align: center;
  background-color: #001529;
  color: rgba(255, 255, 255, 0.65);
`;

const App: React.FC = () => {
  const [processingResult, setProcessingResult] = useState<ProcessingResponse | null>(null);
  const [batchResults, setBatchResults] = useState<BatchProcessingResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const handleUploadSuccess = (response: ProcessingResponse) => {
    setProcessingResult(response);
    setBatchResults(null); // Clear batch results when single upload succeeds
    setError(null);
    setRefreshTrigger(prev => prev + 1); // Trigger refresh of processed invoices
  };

  const handleBatchUploadSuccess = (results: BatchProcessingResults) => {
    setBatchResults(results);
    setProcessingResult(null); // Clear single result when batch upload succeeds
    setError(null);
    setRefreshTrigger(prev => prev + 1); // Trigger refresh of processed invoices
  };

  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage);
    setProcessingResult(null);
    setBatchResults(null);
  };

  const handleDownloadExcel = async () => {
    setIsDownloading(true);
    try {
      await apiService.downloadExcel();
      message.success('Excel file downloaded successfully!');
    } catch (error: any) {
      console.error('Download error:', error);
      const errorMessage = error.response?.status === 404 
        ? 'No Excel file available. Please process at least one invoice first.'
        : error.response?.data?.error || 'Failed to download Excel file';
      message.error(errorMessage);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <StyledLayout>
      <StyledHeader>
        <HeaderContent>
          <Space size="middle">
            <MedicineBoxOutlined style={{ fontSize: '28px' }} />
            <div>
              <Title level={2}>Invoice Transcript App</Title>
              <Text>Process medical invoices and update Excel files automatically</Text>
            </div>
          </Space>
        </HeaderContent>
      </StyledHeader>

      <StyledContent>
        <ContentContainer>
          {/* Environment Warning */}
          <Alert
            message="Environment Setup Required"
            description="Make sure to set your OPENAI_API_KEY environment variable and start the backend server on port 3001."
            type="warning"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Upload Section */}
            <div>
              <ImageUpload 
                onUploadSuccess={handleUploadSuccess}
                onBatchUploadSuccess={handleBatchUploadSuccess}
                onUploadError={handleUploadError}
              />
            </div>

            {/* Download Excel Section */}
            <Card>
              <div style={{ textAlign: 'center' }}>
                <Title level={4} style={{ marginBottom: 16 }}>
                  <FileTextOutlined style={{ marginRight: 8 }} />
                  Download Current Excel File
                </Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                  Download the latest Excel file with all processed invoices from S3 storage
                </Text>
                <Button 
                  type="primary" 
                  size="large"
                  icon={isDownloading ? <LoadingOutlined /> : <DownloadOutlined />}
                  onClick={handleDownloadExcel}
                  loading={isDownloading}
                >
                  {isDownloading ? 'Downloading...' : 'Download Excel File'}
                </Button>
              </div>
            </Card>

            {/* Error Display */}
            {error && (
              <Alert
                message="Processing Error"
                description={error}
                type="error"
                showIcon
                closable
                onClose={() => setError(null)}
              />
            )}

            {/* Single Processing Results */}
            {processingResult && (
              <div>
                <ProcessingResults result={processingResult} />
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <Text type="secondary">
                    Ready to process another invoice? Upload a new image above.
                  </Text>
                </div>
              </div>
            )}

            {/* Batch Processing Results */}
            {batchResults && (
              <Card title={<Title level={4}>Batch Processing Results</Title>}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  {/* Summary */}
                  <div style={{ textAlign: 'center' }}>
                    <Space size="large">
                      <Tag color="green" style={{ fontSize: 16, padding: '8px 16px' }}>
                        <CheckCircleOutlined /> {batchResults.successful.length} Successful
                      </Tag>
                      {batchResults.failed.length > 0 && (
                        <Tag color="red" style={{ fontSize: 16, padding: '8px 16px' }}>
                          <CloseCircleOutlined /> {batchResults.failed.length} Failed
                        </Tag>
                      )}
                      <Tag color="blue" style={{ fontSize: 16, padding: '8px 16px' }}>
                        {batchResults.successful.reduce((sum, r) => sum + r.rowsAdded, 0)} Total Rows Added
                      </Tag>
                    </Space>
                  </div>

                  {/* Successful Results */}
                  {batchResults.successful.length > 0 && (
                    <div>
                      <Title level={5} style={{ color: '#52c41a', marginBottom: 16 }}>
                        <CheckCircleOutlined /> Successfully Processed ({batchResults.successful.length})
                      </Title>
                      <List
                        size="small"
                        dataSource={batchResults.successful}
                        renderItem={(result) => (
                          <List.Item>
                            <List.Item.Meta
                              title={`${result.data.patient_name} (ID: ${result.data.patient_id})`}
                              description={
                                <Space wrap>
                                  <Text type="secondary">Date: {result.data.fecha}</Text>
                                  <Text type="secondary">Services: {result.data.services.length}</Text>
                                  <Text type="secondary">Rows: {result.rowsAdded}</Text>
                                  <Tag color="blue">{result.data.eps}</Tag>
                                </Space>
                              }
                            />
                            <div>
                              <Text strong>
                                ${result.data.services.reduce((sum: number, s: any) => sum + (typeof s.value === 'number' ? s.value : parseFloat(s.value)), 0).toLocaleString()}
                              </Text>
                            </div>
                          </List.Item>
                        )}
                      />
                    </div>
                  )}

                  {/* Failed Results */}
                  {batchResults.failed.length > 0 && (
                    <div>
                      <Title level={5} style={{ color: '#f5222d', marginBottom: 16 }}>
                        <CloseCircleOutlined /> Failed to Process ({batchResults.failed.length})
                      </Title>
                      <List
                        size="small"
                        dataSource={batchResults.failed}
                        renderItem={(failure) => (
                          <List.Item>
                            <List.Item.Meta
                              title={failure.fileName}
                              description={
                                <Text type="danger">{failure.error}</Text>
                              }
                            />
                          </List.Item>
                        )}
                      />
                    </div>
                  )}

                  <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <Text type="secondary">
                      Ready to process more invoices? Upload new images above.
                    </Text>
                  </div>
                </Space>
              </Card>
            )}

            <Divider>
              <Space>
                <FileTextOutlined />
                <Text strong>Processing History</Text>
              </Space>
            </Divider>

            {/* Processed Invoices List */}
            <ProcessedInvoices refreshTrigger={refreshTrigger} />
          </Space>
        </ContentContainer>
      </StyledContent>

      <StyledFooter>
        <Space direction="vertical" size="small">
          <Text>Invoice Transcript App ©2025</Text>
          <Text type="secondary">
            Powered by OpenAI Vision API • Built with React & TypeScript
          </Text>
        </Space>
      </StyledFooter>
    </StyledLayout>
  );
};

export default App;
