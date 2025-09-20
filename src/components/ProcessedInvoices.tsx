import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Typography, Tag, Space, Popconfirm, message } from 'antd';
import { DeleteOutlined, ReloadOutlined, FileTextOutlined } from '@ant-design/icons';
import { apiService } from '../services/api';
import { ProcessedInvoice } from '../types/Invoice';

const { Title } = Typography;

interface ProcessedInvoicesProps {
  refreshTrigger: number;
}

const ProcessedInvoices: React.FC<ProcessedInvoicesProps> = ({ refreshTrigger }) => {
  const [invoices, setInvoices] = useState<ProcessedInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const data = await apiService.getProcessedInvoices();
      setInvoices(data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      message.error('Failed to load processed invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (invoiceId: number) => {
    setDeleting(invoiceId);
    try {
      await apiService.deleteInvoice(invoiceId);
      message.success('Invoice deleted successfully');
      fetchInvoices(); // Refresh the list
    } catch (error) {
      console.error('Error deleting invoice:', error);
      message.error('Failed to delete invoice');
    } finally {
      setDeleting(null);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [refreshTrigger]);

  const columns = [
    {
      title: 'Order #',
      dataIndex: 'orden_servicio',
      key: 'orden_servicio',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
      width: 120,
    },
    {
      title: 'Patient Name',
      dataIndex: 'patient_name',
      key: 'patient_name',
      ellipsis: true,
    },
    {
      title: 'Patient ID',
      dataIndex: 'patient_id',
      key: 'patient_id',
      width: 120,
    },
    {
      title: 'Processed Date',
      dataIndex: 'processed_date',
      key: 'processed_date',
      render: (date: string) => new Date(date).toLocaleString(),
      width: 180,
    },
    {
      title: 'Excel Rows',
      dataIndex: 'excel_row_count',
      key: 'excel_row_count',
      render: (count: number) => (
        <Tag color="green" icon={<FileTextOutlined />}>
          {count}
        </Tag>
      ),
      width: 100,
    },
    {
      title: 'Services',
      dataIndex: 'services',
      key: 'services',
      render: (services: string) => services || 'N/A',
      ellipsis: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ProcessedInvoice) => (
        <Popconfirm
          title="Delete Invoice"
          description="Are you sure you want to delete this invoice? This action cannot be undone."
          onConfirm={() => handleDelete(record.id)}
          okText="Yes"
          cancelText="No"
          okButtonProps={{ danger: true }}
        >
          <Button
            type="text"
            icon={<DeleteOutlined />}
            danger
            loading={deleting === record.id}
            size="small"
          />
        </Popconfirm>
      ),
      width: 80,
    },
  ];

  return (
    <Card 
      title={
        <Space>
          <Title level={4} style={{ margin: 0 }}>
            Processed Invoices ({invoices.length})
          </Title>
        </Space>
      }
      extra={
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchInvoices}
          loading={loading}
        >
          Refresh
        </Button>
      }
    >
      <Table
        columns={columns}
        dataSource={invoices}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total: number) => `Total ${total} invoices`,
        }}
        scroll={{ x: 'max-content' }}
        size="small"
      />
    </Card>
  );
};

export default ProcessedInvoices;
