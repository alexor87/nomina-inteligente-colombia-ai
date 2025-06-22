
import { useState, useEffect } from 'react';
import { ReportFilters, PayrollSummaryReport, LaborCostReport, SocialSecurityReport, IncomeRetentionCertificate, NoveltyHistoryReport, AccountingExport, ExportHistory, ReportMetrics, SavedFilter } from '@/types/reports';

// Mock data - En producción vendría de Supabase
const mockPayrollSummary: PayrollSummaryReport[] = [
  {
    employeeId: '1',
    employeeName: 'Juan Pérez',
    period: '2025-01',
    totalEarnings: 2500000,
    totalDeductions: 300000,
    netPay: 2200000,
    employerContributions: 500000,
    costCenter: 'Administración'
  },
  {
    employeeId: '2',
    employeeName: 'María García',
    period: '2025-01',
    totalEarnings: 3000000,
    totalDeductions: 400000,
    netPay: 2600000,
    employerContributions: 600000,
    costCenter: 'Ventas'
  }
];

const mockLaborCosts: LaborCostReport[] = [
  {
    employeeId: '1',
    employeeName: 'Juan Pérez',
    baseSalary: 2000000,
    benefits: 300000,
    overtime: 200000,
    bonuses: 0,
    employerContributions: 500000,
    totalCost: 3000000,
    costCenter: 'Administración'
  }
];

const mockSocialSecurity: SocialSecurityReport[] = [
  {
    employeeId: '1',
    employeeName: 'Juan Pérez',
    healthEmployee: 100000,
    healthEmployer: 212500,
    pensionEmployee: 160000,
    pensionEmployer: 240000,
    arl: 10440,
    compensationBox: 80000,
    total: 802940
  }
];

export const useReports = () => {
  const [filters, setFilters] = useState<ReportFilters>({});
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [exportHistory, setExportHistory] = useState<ExportHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeReportType, setActiveReportType] = useState<string>('payroll-summary');

  // Cargar datos iniciales
  useEffect(() => {
    loadSavedFilters();
    loadExportHistory();
  }, []);

  const loadSavedFilters = async () => {
    // Mock data - En producción cargar desde Supabase
    setSavedFilters([
      {
        id: '1',
        name: 'Empleados Activos 2025',
        filters: { employeeStatus: ['activo'] },
        reportType: 'payroll-summary',
        userId: 'user1',
        createdAt: '2025-01-01'
      }
    ]);
  };

  const loadExportHistory = async () => {
    // Mock data - En producción cargar desde Supabase
    setExportHistory([
      {
        id: '1',
        reportType: 'payroll-summary',
        fileName: 'resumen_nomina_enero_2025.xlsx',
        format: 'excel',
        generatedBy: 'admin@empresa.com',
        generatedAt: '2025-01-15T10:30:00Z',
        parameters: { dateRange: { from: '2025-01-01', to: '2025-01-31' } }
      }
    ]);
  };

  const getPayrollSummaryReport = async (filters: ReportFilters): Promise<PayrollSummaryReport[]> => {
    setLoading(true);
    try {
      // Simular llamada a API
      await new Promise(resolve => setTimeout(resolve, 1000));
      return mockPayrollSummary;
    } finally {
      setLoading(false);
    }
  };

  const getLaborCostReport = async (filters: ReportFilters): Promise<LaborCostReport[]> => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return mockLaborCosts;
    } finally {
      setLoading(false);
    }
  };

  const getSocialSecurityReport = async (filters: ReportFilters): Promise<SocialSecurityReport[]> => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return mockSocialSecurity;
    } finally {
      setLoading(false);
    }
  };

  const getIncomeRetentionCertificates = async (year: number): Promise<IncomeRetentionCertificate[]> => {
    // Mock data
    return [
      {
        employeeId: '1',
        employeeName: 'Juan Pérez',
        year: 2024,
        totalIncome: 30000000,
        totalRetentions: 500000,
        status: 'generated',
        generatedAt: '2025-01-10T09:00:00Z'
      }
    ];
  };

  const getNoveltyHistoryReport = async (filters: ReportFilters): Promise<NoveltyHistoryReport[]> => {
    return [
      {
        id: '1',
        employeeId: '1',
        employeeName: 'Juan Pérez',
        type: 'overtime',
        description: 'Horas extras nocturnas',
        amount: 150000,
        hours: 8,
        date: '2025-01-15',
        status: 'approved'
      }
    ];
  };

  const getAccountingExports = async (filters: ReportFilters): Promise<AccountingExport[]> => {
    return [
      {
        id: '1',
        type: 'payroll',
        period: '2025-01',
        totalAmount: 5000000,
        accountingEntries: [
          { account: '510506', description: 'Sueldos y salarios', debit: 5000000, credit: 0 },
          { account: '236505', description: 'Salarios por pagar', debit: 0, credit: 5000000 }
        ],
        generatedAt: '2025-01-31T18:00:00Z'
      }
    ];
  };

  const exportToExcel = async (reportType: string, data: any[], fileName: string) => {
    // Simular exportación
    console.log('Exporting to Excel:', { reportType, fileName, recordCount: data.length });
    
    // Registrar en historial
    const newExport: ExportHistory = {
      id: Date.now().toString(),
      reportType,
      fileName: `${fileName}.xlsx`,
      format: 'excel',
      generatedBy: 'admin@empresa.com',
      generatedAt: new Date().toISOString(),
      parameters: filters
    };
    
    setExportHistory(prev => [newExport, ...prev]);
    return newExport;
  };

  const exportToPDF = async (reportType: string, data: any[], fileName: string) => {
    console.log('Exporting to PDF:', { reportType, fileName, recordCount: data.length });
    
    const newExport: ExportHistory = {
      id: Date.now().toString(),
      reportType,
      fileName: `${fileName}.pdf`,
      format: 'pdf',
      generatedBy: 'admin@empresa.com',
      generatedAt: new Date().toISOString(),
      parameters: filters
    };
    
    setExportHistory(prev => [newExport, ...prev]);
    return newExport;
  };

  const saveFilter = async (name: string, reportType: string) => {
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name,
      filters,
      reportType,
      userId: 'user1',
      createdAt: new Date().toISOString()
    };
    
    setSavedFilters(prev => [...prev, newFilter]);
    return newFilter;
  };

  const applyFilter = (savedFilter: SavedFilter) => {
    setFilters(savedFilter.filters);
    setActiveReportType(savedFilter.reportType);
  };

  const getReportMetrics = async (): Promise<ReportMetrics> => {
    return {
      averageCostPerEmployee: 3000000,
      averageBenefitLoad: 0.42,
      totalMonthlyCost: 15000000,
      employeeCount: 5
    };
  };

  return {
    filters,
    setFilters,
    savedFilters,
    exportHistory,
    loading,
    activeReportType,
    setActiveReportType,
    getPayrollSummaryReport,
    getLaborCostReport,
    getSocialSecurityReport,
    getIncomeRetentionCertificates,
    getNoveltyHistoryReport,
    getAccountingExports,
    exportToExcel,
    exportToPDF,
    saveFilter,
    applyFilter,
    getReportMetrics
  };
};
