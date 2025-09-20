import axios from 'axios';
import { ProcessingResponse, ProcessedInvoice } from '../types/Invoice';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api'  // Use relative URL in production
  : 'http://localhost:3001/api';  // Use localhost in development

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const apiService = {
  async uploadInvoice(file: File): Promise<ProcessingResponse> {
    const formData = new FormData();
    formData.append('invoice', file);

    const response = await api.post<ProcessingResponse>('/upload-invoice', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  async getProcessedInvoices(): Promise<ProcessedInvoice[]> {
    const response = await api.get<ProcessedInvoice[]>('/processed-invoices');
    return response.data;
  },

  async checkInvoiceExists(ordenServicio: string): Promise<boolean> {
    const response = await api.get<{ exists: boolean }>(`/check-invoice/${ordenServicio}`);
    return response.data.exists;
  },

  async deleteInvoice(invoiceId: number): Promise<void> {
    await api.delete(`/invoice/${invoiceId}`);
  },

  async downloadExcel(): Promise<void> {
    const response = await api.get('/download-excel', {
      responseType: 'blob',
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    });

    // Create blob link to download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Extract filename from response headers or use default
    const contentDisposition = response.headers['content-disposition'];
    const filename = contentDisposition 
      ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') 
      : 'ESTUDIOS DOPPLER JULIO - AGOSTO 2025.xlsx';
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
