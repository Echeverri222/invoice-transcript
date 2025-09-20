export interface InvoiceService {
  code: string;
  description: string;
  value: string | number;
}

export interface InvoiceData {
  orden_servicio: string;
  fecha: string;
  hospital: string;
  patient_name: string;
  patient_id: string;
  age: string;
  sex: string;
  plan: string;
  eps: string;
  services: InvoiceService[];
}

export interface ProcessedInvoice {
  id: number;
  orden_servicio: string;
  patient_name: string;
  patient_id: string;
  processed_date: string;
  excel_row_count: number;
  image_path: string;
  services?: string;
}

export interface ProcessingResponse {
  success: boolean;
  message: string;
  data: InvoiceData;
  rowsAdded: number;
  invoiceId: number;
}
