
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ExportHistory, 
  ReportFilters, 
  SavedFilter, 
  PayrollSummaryReport,
  LaborCostReport,
  SocialSecurityReport,
  NoveltyHistoryReport,
  IncomeRetentionCertificate,
  AccountingExport
} from '@/types/reports';
import { ReportsExportService } from '@/services/ReportsExportService';

export const useReports = () => {
  const { user } = useAuth();
  const [exportHistory, setExportHistory] = useState<ExportHistory[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [activeReportType, setActiveReportType] = useState<string>('employees');
  const [filters, setFilters] = useState<ReportFilters>({});
  const [loading, setLoading] = useState(false);

  const addExportToHistory = useCallback((exportItem: ExportHistory) => {
    const exportWithUser = {
      ...exportItem,
      generatedBy: user?.email || 'Usuario desconocido'
    };
    
    setExportHistory(prev => [exportWithUser, ...prev]);
  }, [user?.email]);

  const saveFilter = useCallback(async (name: string, reportType: string) => {
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name,
      filters: filters,
      reportType,
      userId: user?.id || '',
      createdAt: new Date().toISOString()
    };
    
    setSavedFilters(prev => [...prev, newFilter]);
  }, [filters, user?.id]);

  const applyFilter = useCallback((filter: SavedFilter) => {
    setFilters(filter.filters);
    console.log('Applying filter:', filter);
  }, []);

  // Mock data generation functions
  const getPayrollSummaryReport = useCallback(async (reportFilters: ReportFilters): Promise<PayrollSummaryReport[]> => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData: PayrollSummaryReport[] = [
        {
          employeeId: '1',
          employeeName: 'Juan Pérez',
          period: 'Enero 2025',
          totalEarnings: 2500000,
          totalDeductions: 400000,
          netPay: 2100000,
          employerContributions: 500000,
          costCenter: 'Administración'
        },
        {
          employeeId: '2',
          employeeName: 'María García',
          period: 'Enero 2025',
          totalEarnings: 1800000,
          totalDeductions: 300000,
          netPay: 1500000,
          employerContributions: 360000,
          costCenter: 'Ventas'
        }
      ];
      
      return mockData;
    } finally {
      setLoading(false);
    }
  }, []);

  const getLaborCostReport = useCallback(async (reportFilters: ReportFilters): Promise<LaborCostReport[]> => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData: LaborCostReport[] = [
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
      
      return mockData;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSocialSecurityReport = useCallback(async (reportFilters: ReportFilters): Promise<SocialSecurityReport[]> => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData: SocialSecurityReport[] = [
        {
          employeeId: '1',
          employeeName: 'Juan Pérez',
          healthEmployee: 100000,
          healthEmployer: 170000,
          pensionEmployee: 120000,
          pensionEmployer: 240000,
          arl: 10440,
          compensationBox: 80000,
          total: 720440
        }
      ];
      
      return mockData;
    } finally {
      setLoading(false);
    }
  }, []);

  const getNoveltyHistoryReport = useCallback(async (reportFilters: ReportFilters): Promise<NoveltyHistoryReport[]> => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData: NoveltyHistoryReport[] = [
        {
          id: '1',
          employeeId: '1',
          employeeName: 'Juan Pérez',
          type: 'horas_extra',
          description: 'Horas extra nocturnas',
          amount: 150000,
          hours: 8,
          date: '2025-01-15',
          status: 'approved'
        }
      ];
      
      return mockData;
    } finally {
      setLoading(false);
    }
  }, []);

  const getIncomeRetentionCertificates = useCallback(async (year: number): Promise<IncomeRetentionCertificate[]> => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData: IncomeRetentionCertificate[] = [
        {
          employeeId: '1',
          employeeName: 'Juan Pérez',
          year: year,
          totalIncome: 30000000,
          totalRetentions: 1500000,
          status: 'generated',
          generatedAt: '2025-01-15T10:00:00Z'
        }
      ];
      
      return mockData;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAccountingExports = useCallback(async (reportFilters: ReportFilters): Promise<AccountingExport[]> => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData: AccountingExport[] = [
        {
          id: '1',
          type: 'Nómina',
          period: 'Enero 2025',
          totalAmount: 10000000,
          accountingEntries: [
            {
              account: '5105',
              description: 'Gastos de Personal',
              debit: 10000000,
              credit: 0
            },
            {
              account: '2365',
              description: 'Retenciones y Aportes',
              debit: 0,
              credit: 2000000
            },
            {
              account: '1110',
              description: 'Bancos',
              debit: 0,
              credit: 8000000
            }
          ],
          generatedAt: '2025-01-15T10:00:00Z'
        }
      ];
      
      return mockData;
    } finally {
      setLoading(false);
    }
  }, []);

  const exportToExcel = useCallback(async (reportType: string, data: any[], fileName: string) => {
    if (!user?.email) return;
    
    return await ReportsExportService.exportToExcel(
      reportType,
      data,
      fileName,
      filters,
      user.email,
      addExportToHistory
    );
  }, [filters, user?.email, addExportToHistory]);

  const exportToPDF = useCallback(async (reportType: string, data: any[], fileName: string) => {
    if (!user?.email) return;
    
    return await ReportsExportService.exportToPDF(
      reportType,
      data,
      fileName,
      filters,
      user.email,
      addExportToHistory
    );
  }, [filters, user?.email, addExportToHistory]);

  return {
    exportHistory,
    savedFilters,
    activeReportType,
    filters,
    loading,
    setActiveReportType,
    setFilters,
    addExportToHistory,
    saveFilter,
    applyFilter,
    getPayrollSummaryReport,
    getLaborCostReport,
    getSocialSecurityReport,
    getNoveltyHistoryReport,
    getIncomeRetentionCertificates,
    getAccountingExports,
    exportToExcel,
    exportToPDF
  };
};
