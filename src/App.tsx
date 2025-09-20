import React, { useState } from 'react';
import { Layout, Typography, Space, Divider, Alert, Card, List, Tag } from 'antd';
import { FileTextOutlined, MedicineBoxOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import ImageUpload, { BatchProcessingResults } from './components/ImageUpload';
import ProcessingResults from './components/ProcessingResults';
import ProcessedInvoices from './components/ProcessedInvoices';
import { ProcessingResponse } from './types/Invoice';
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
