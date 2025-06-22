
export interface PaymentEmployee {
  id: string;
  employeeId: string;
  name: string;
  position: string;
  bankName: string;
  accountType: 'ahorros' | 'corriente';
  accountNumber: string;
  netPay: number;
  paymentStatus: 'pendiente' | 'pagado' | 'fallido';
  paymentMethod: 'transferencia' | 'efectivo' | 'datafono';
  paymentDate?: string;
  errorReason?: string;
  confirmedBy?: string;
  confirmedAt?: string;
  observations?: string;
  costCenter?: string;
}

export interface PaymentPeriod {
  id: string;
  periodName: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'processing' | 'completed';
  totalEmployees: number;
  totalAmount: number;
  totalPaid: number;
  totalFailed: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentFilters {
  paymentStatus?: 'pendiente' | 'pagado' | 'fallido';
  bankName?: string;
  costCenter?: string;
}

export interface BankFileGeneration {
  bankName: 'bancolombia' | 'bogota' | 'davivienda' | 'nequi' | 'excel_generico';
  format: 'txt' | 'csv' | 'xlsx';
  employees: PaymentEmployee[];
  totalAmount: number;
  totalAccounts: number;
}

export interface PaymentBatch {
  id: string;
  periodId: string;
  fileName: string;
  bankName: string;
  fileUrl: string;
  totalEmployees: number;
  totalAmount: number;
  createdBy: string;
  createdAt: string;
  status: 'generated' | 'processed' | 'confirmed';
}

export interface PaymentAuditLog {
  id: string;
  periodId: string;
  employeeId?: string;
  action: 'payment_marked' | 'file_generated' | 'retry_payment' | 'account_updated';
  userId: string;
  userName: string;
  timestamp: string;
  details: string;
  oldValue?: any;
  newValue?: any;
}

export interface PaymentConfirmation {
  employeeId: string;
  paymentDate: string;
  confirmedBy: string;
  observations?: string;
}
