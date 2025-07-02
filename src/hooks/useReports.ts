
import { useState } from 'react';
import { ReportFilters, SavedFilter, ExportHistory, IncomeRetentionCertificate } from '@/types/reports';

export const useReports = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({});
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [exportHistory, setExportHistory] = useState<ExportHistory[]>([]);
  const [activeReportType, setActiveReportType] = useState('payroll-summary');

  const getPayrollSummaryReport = async (filters: ReportFilters) => {
    setIsLoading(true);
    try {
      // Mock data generation for payroll summary
      const mockData = [];
      const employees = ['Juan Pérez', 'María García', 'Carlos López', 'Ana Rodríguez', 'Luis Martínez'];
      const costCenters = ['Administración', 'Ventas', 'Producción', 'Logística'];
      
      for (let i = 0; i < 15; i++) {
        mockData.push({
          employeeName: employees[i % employees.length],
          period: '2024-01',
          totalEarnings: 2800000 + (i * 150000),
          totalDeductions: 560000 + (i * 30000),
          netPay: 2240000 + (i * 120000),
          employerContributions: 588000 + (i * 31500),
          costCenter: costCenters[i % costCenters.length]
        });
      }
      
      return mockData;
    } finally {
      setIsLoading(false);
    }
  };

  const getLaborCostReport = async (filters: ReportFilters) => {
    setIsLoading(true);
    try {
      const mockData = [];
      const employees = ['Juan Pérez', 'María García', 'Carlos López', 'Ana Rodríguez', 'Luis Martínez'];
      
      for (let i = 0; i < 15; i++) {
        mockData.push({
          employeeName: employees[i % employees.length],
          baseSalary: 2800000 + (i * 100000),
          benefits: 280000 + (i * 10000),
          overtime: 150000 + (i * 25000),
          bonuses: 100000 + (i * 15000),
          employerContributions: 588000 + (i * 21000),
          totalCost: 3918000 + (i * 171000),
          costCenter: `Centro ${i % 4 + 1}`
        });
      }
      
      return mockData;
    } finally {
      setIsLoading(false);
    }
  };

  const getSocialSecurityReport = async (filters: ReportFilters) => {
    setIsLoading(true);
    try {
      const mockData = [];
      const employees = ['Juan Pérez', 'María García', 'Carlos López', 'Ana Rodríguez', 'Luis Martínez'];
      
      for (let i = 0; i < 15; i++) {
        const baseSalary = 2800000 + (i * 100000);
        mockData.push({
          employeeName: employees[i % employees.length],
          healthEmployee: baseSalary * 0.04,
          healthEmployer: baseSalary * 0.085,
          pensionEmployee: baseSalary * 0.04,
          pensionEmployer: baseSalary * 0.12,
          arl: baseSalary * 0.00522,
          compensationBox: baseSalary * 0.04,
          total: baseSalary * (0.04 + 0.085 + 0.04 + 0.12 + 0.00522 + 0.04)
        });
      }
      
      return mockData;
    } finally {
      setIsLoading(false);
    }
  };

  const getNoveltyHistoryReport = async (filters: ReportFilters) => {
    setIsLoading(true);
    try {
      const mockData = [];
      const employees = ['Juan Pérez', 'María García', 'Carlos López', 'Ana Rodríguez', 'Luis Martínez'];
      const noveltyTypes = ['Horas Extra', 'Bonificación', 'Licencia', 'Incapacidad'];
      
      for (let i = 0; i < 20; i++) {
        mockData.push({
          employeeName: employees[i % employees.length],
          noveltyType: noveltyTypes[i % noveltyTypes.length],
          startDate: `2024-01-${(i % 28) + 1}`,
          endDate: `2024-01-${(i % 28) + 3}`,
          amount: 50000 + (i * 25000),
          status: 'Aprobada'
        });
      }
      
      return mockData;
    } finally {
      setIsLoading(false);
    }
  };

  const getAccountingExports = async (filters: ReportFilters) => {
    setIsLoading(true);
    try {
      const mockData = [];
      const accounts = ['51050501 - Salarios', '51051001 - Cesantías', '51051501 - Prima de Servicios'];
      
      for (let i = 0; i < 10; i++) {
        mockData.push({
          account: accounts[i % accounts.length],
          debit: 15000000 + (i * 500000),
          credit: 0,
          description: `Provisión nómina enero 2024`,
          period: '2024-01'
        });
      }
      
      return mockData;
    } finally {
      setIsLoading(false);
    }
  };

  const getIncomeRetentionCertificates = async (year: number) => {
    setIsLoading(true);
    try {
      const mockData = [];
      const employees = ['Juan Pérez', 'María García', 'Carlos López', 'Ana Rodríguez', 'Luis Martínez'];
      
      for (let i = 0; i < 10; i++) {
        mockData.push({
          employeeId: `emp-${i + 1}`,
          employeeName: employees[i % employees.length],
          year,
          totalIncome: 35000000 + (i * 2000000),
          totalRetentions: 1500000 + (i * 100000),
          status: ['generated', 'sent', 'pending'][i % 3] as 'generated' | 'sent' | 'pending',
          generatedAt: '2024-01-15',
          sentAt: i % 3 === 1 ? '2024-01-20' : undefined
        });
      }
      
      return mockData;
    } finally {
      setIsLoading(false);
    }
  };

  const exportToExcel = async (reportType: string, data: any[], fileName: string) => {
    try {
      console.log('Exporting to Excel:', { reportType, fileName, records: data.length });
      
      // Ensure we have data to export
      if (!data || data.length === 0) {
        console.warn('No data to export');
        throw new Error('No hay datos para exportar');
      }
      
      // Use ExcelExportService for actual export
      const { ExcelExportService } = await import('@/services/ExcelExportService');
      
      // Generate proper filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const finalFileName = `${fileName}_${timestamp}`;
      
      switch (reportType) {
        case 'payroll-summary':
        case 'cost-centers':
        case 'employee-detail':
        case 'employee-detail-hr':
          ExcelExportService.exportPayrollSummaryExcel(data, finalFileName);
          break;
        case 'labor-costs':
          ExcelExportService.exportLaborCostsExcel(data, finalFileName);
          break;
        case 'social-security':
        case 'ugpp-social-security':
          ExcelExportService.exportSocialSecurityExcel(data, finalFileName);
          break;
        default:
          ExcelExportService.exportToExcel(data, finalFileName, 'Reporte');
      }

      const newExport: ExportHistory = {
        id: Date.now().toString(),
        reportType,
        fileName: `${finalFileName}.xlsx`,
        format: 'excel',
        generatedBy: 'admin@empresa.com',
        generatedAt: new Date().toISOString(),
        parameters: filters
      };
      setExportHistory(prev => [newExport, ...prev]);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw error;
    }
  };

  const exportToPDF = async (reportType: string, data: any[], fileName: string) => {
    try {
      console.log('Exporting to PDF:', { reportType, fileName, records: data.length });
      
      // Ensure we have data to export
      if (!data || data.length === 0) {
        console.warn('No data to export');
        throw new Error('No hay datos para exportar');
      }
      
      // Use PDFExportService for actual export
      const { PDFExportService } = await import('@/services/PDFExportService');
      
      // Generate proper filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const finalFileName = `${fileName}_${timestamp}`;
      
      switch (reportType) {
        case 'payroll-summary':
        case 'cost-centers':
        case 'employee-detail':
        case 'employee-detail-hr':
          PDFExportService.exportPayrollSummaryPDF(data, finalFileName);
          break;
        case 'labor-costs':
          PDFExportService.exportLaborCostsPDF(data, finalFileName);
          break;
        case 'social-security':
        case 'ugpp-social-security':
          PDFExportService.exportSocialSecurityPDF(data, finalFileName);
          break;
        default:
          PDFExportService.exportToPDF(data, finalFileName, 'Reporte', [
            { header: 'ID', dataKey: 'id' },
            { header: 'Descripción', dataKey: 'name' },
            { header: 'Valor', dataKey: 'value' },
            { header: 'Fecha', dataKey: 'date' }
          ]);
      }

      const newExport: ExportHistory = {
        id: Date.now().toString(),
        reportType,
        fileName: `${finalFileName}.pdf`,
        format: 'pdf',
        generatedBy: 'admin@empresa.com',
        generatedAt: new Date().toISOString(),
        parameters: filters
      };
      setExportHistory(prev => [newExport, ...prev]);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw error;
    }
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
  };

  const applyFilter = (filter: SavedFilter) => {
    setFilters(filter.filters);
    setActiveReportType(filter.reportType);
  };

  return {
    isLoading,
    loading: isLoading,
    filters,
    setFilters,
    savedFilters,
    exportHistory,
    activeReportType,
    setActiveReportType,
    getPayrollSummaryReport,
    getLaborCostReport,
    getSocialSecurityReport,
    getNoveltyHistoryReport,
    getAccountingExports,
    getIncomeRetentionCertificates,
    exportToExcel,
    exportToPDF,
    saveFilter,
    applyFilter
  };
};
