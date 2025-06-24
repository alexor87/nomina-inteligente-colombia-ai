
export interface PayrollVoucher {
  id: string;
  companyId: string;
  employeeId: string;
  payrollId?: string;
  periodo: string;
  startDate: string;
  endDate: string;
  netPay: number;
  voucherStatus: 'generado' | 'pendiente' | 'enviado' | 'error';
  sentToEmployee: boolean;
  sentDate?: string;
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
  generatedBy?: string;
  // Campos calculados del empleado
  employeeName?: string;
  employeeEmail?: string;
  employeeCedula?: string;
}

export interface VoucherAuditLog {
  id: string;
  companyId: string;
  voucherId: string;
  userId: string;
  action: 'generated' | 'downloaded' | 'sent_email' | 'regenerated' | 'viewed';
  method?: string;
  recipientEmail?: string;
  success: boolean;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface VoucherFilters {
  searchTerm: string;
  periodo: string;
  voucherStatus: string;
  sentToEmployee?: boolean;
  startDate: string;
  endDate: string;
}

export interface VoucherSummary {
  totalVouchers: number;
  sentPercentage: number;
  pendingVouchers: number;
  generatedVouchers: number;
}
