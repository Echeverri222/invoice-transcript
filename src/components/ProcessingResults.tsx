import React from 'react';
import { Card, Descriptions, Table, Typography, Tag, Space } from 'antd';
import { CheckCircleOutlined, FileExcelOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { ProcessingResponse, InvoiceService } from '../types/Invoice';

const { Title, Text } = Typography;

const SuccessCard = styled(Card)`
  border-color: #52c41a;
  .ant-card-head {
    background-color: #f6ffed;
    border-bottom-color: #b7eb8f;
  }
`;

const ServiceValue = styled(Text)`
  font-weight: bold;
  color: #1890ff;
`;

interface ProcessingResultsProps {
  result: ProcessingResponse;
}

const ProcessingResults: React.FC<ProcessingResultsProps> = ({ result }) => {
  const { data, rowsAdded } = result;

  const serviceColumns = [
    {
      title: 'Service Code',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <Tag color="blue">{code}</Tag>
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (description: string) => <Text>{description}</Text>
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (value: string | number) => {
        // Value should already be processed (last 2 zeros removed) from backend
        const numValue = typeof value === 'number' ? value : parseFloat(value);
        return <ServiceValue>${numValue.toLocaleString()}</ServiceValue>;
      }
    }
  ];

  const servicesWithKeys = data.services.map((service: InvoiceService, index: number) => ({
    ...service,
    key: index
  }));

  return (
    <SuccessCard 
      title={
        <Space>
          <CheckCircleOutlined style={{ color: '#52c41a' }} />
          <span>Invoice Processed Successfully</span>
        </Space>
      }
      extra={
        <Tag icon={<FileExcelOutlined />} color="green">
          {rowsAdded} rows added to Excel
        </Tag>
      }
    >
      <Title level={4}>Invoice Information</Title>
      
      <Descriptions bordered size="small" column={{ xs: 1, sm: 1, md: 2 }}>
        <Descriptions.Item label="Service Order #">
          <Tag color="volcano" style={{ fontSize: '14px' }}>{data.orden_servicio}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Date">
          {data.fecha}
        </Descriptions.Item>
        <Descriptions.Item label="Hospital">
          {data.hospital}
        </Descriptions.Item>
        <Descriptions.Item label="Plan">
          {data.plan}
        </Descriptions.Item>
        <Descriptions.Item label="Patient Name">
          <Text strong>{data.patient_name}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Patient ID">
          {data.patient_id}
        </Descriptions.Item>
        <Descriptions.Item label="Age">
          {data.age}
        </Descriptions.Item>
        <Descriptions.Item label="Sex">
          {data.sex}
        </Descriptions.Item>
      </Descriptions>

      <div style={{ marginTop: 24 }}>
        <Title level={4}>Services Processed</Title>
        <Table
          columns={serviceColumns}
          dataSource={servicesWithKeys}
          pagination={false}
          size="small"
          scroll={{ x: 'max-content' }}
          summary={() => {
            const total = data.services.reduce((sum, service) => {
              // Value should already be processed (last 2 zeros removed) from backend
              const value = typeof service.value === 'number' ? service.value : parseFloat(service.value);
              return sum + value;
            }, 0);

            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}></Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <Text strong>Total</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2}>
                  <Text strong style={{ color: '#1890ff' }}>
                    ${total.toLocaleString()}
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </div>
    </SuccessCard>
  );
};

export default ProcessingResults;
