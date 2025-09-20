import axios from 'axios';
import { ProcessingResponse, ProcessedInvoice } from '../types/Invoice';

const API_BASE_URL = 'http://localhost:3001/api';

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
};
