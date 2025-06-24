
export interface PayrollVoucher {
  id: string;
  companyId: string;
  employeeId: string;
  payrollId?: string;
  periodo: string;
  startDate: string;
  endDate: string;
  netPay: number;
  voucherStatus: 'generado' | 'pendiente' | 'firmado' | 'error';
  sentToEmployee: boolean;
  sentDate?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  dianStatus: 'pendiente' | 'firmado' | 'rechazado' | 'error';
  dianCufe?: string;
  electronicSignatureDate?: string;
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
  action: 'generated' | 'downloaded' | 'sent_email' | 'sent_whatsapp' | 'regenerated' | 'viewed';
  method?: string;
  recipientEmail?: string;
  recipientPhone?: string;
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
  dianStatus: string;
  startDate: string;
  endDate: string;
}

export interface VoucherSummary {
  totalVouchers: number;
  signedPercentage: number;
  sentPercentage: number;
  pendingVouchers: number;
}
