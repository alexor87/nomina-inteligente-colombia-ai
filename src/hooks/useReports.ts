
import { useState } from 'react';
import { ReportFilters, SavedFilter, ExportHistory } from '@/types/reports';
import { ReportsDBService } from '@/services/ReportsDBService';
import { toast } from '@/hooks/use-toast';

export const useReports = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({});
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [exportHistory, setExportHistory] = useState<ExportHistory[]>([]);
  const [activeReportType, setActiveReportType] = useState('payroll-summary');

  // REPORTE DE RESUMEN DE NÓMINA - 100% DATOS REALES
  const getPayrollSummaryReport = async (filters: ReportFilters) => {
    console.log('📊 useReports: Getting payroll summary with real data');
    setIsLoading(true);
    try {
      const data = await ReportsDBService.getPayrollSummaryReport(filters);
      console.log('✅ useReports: Payroll summary data received:', data.length, 'records');
      return data;
    } catch (error) {
      console.error('❌ useReports: Error getting payroll summary:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de nómina",
        variant: "destructive"
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // REPORTE DE COSTOS LABORALES - 100% DATOS REALES
  const getLaborCostReport = async (filters: ReportFilters) => {
    console.log('📊 useReports: Getting labor costs with real data');
    setIsLoading(true);
    try {
      const data = await ReportsDBService.getLaborCostReport(filters);
      console.log('✅ useReports: Labor cost data received:', data.length, 'records');
      return data;
    } catch (error) {
      console.error('❌ useReports: Error getting labor costs:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los costos laborales",
        variant: "destructive"
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // REPORTE DE SEGURIDAD SOCIAL - 100% DATOS REALES
  const getSocialSecurityReport = async (filters: ReportFilters) => {
    console.log('📊 useReports: Getting social security with real data');
    setIsLoading(true);
    try {
      const data = await ReportsDBService.getSocialSecurityReport(filters);
      console.log('✅ useReports: Social security data received:', data.length, 'records');
      return data;
    } catch (error) {
      console.error('❌ useReports: Error getting social security:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de seguridad social",
        variant: "destructive"
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // REPORTE DE NOVEDADES - 100% DATOS REALES
  const getNoveltyHistoryReport = async (filters: ReportFilters) => {
    console.log('📊 useReports: Getting novelty history with real data');
    setIsLoading(true);
    try {
      const data = await ReportsDBService.getNoveltyHistoryReport(filters);
      console.log('✅ useReports: Novelty history data received:', data.length, 'records');
      return data;
    } catch (error) {
      console.error('❌ useReports: Error getting novelty history:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las novedades",
        variant: "destructive"
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // CERTIFICADOS DE RETENCIÓN - 100% DATOS REALES
  const getIncomeRetentionCertificates = async (year: number) => {
    console.log('📊 useReports: Getting retention certificates with real data for year:', year);
    setIsLoading(true);
    try {
      const data = await ReportsDBService.getIncomeRetentionCertificates(year);
      console.log('✅ useReports: Retention certificates data received:', data.length, 'records');
      return data;
    } catch (error) {
      console.error('❌ useReports: Error getting retention certificates:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los certificados de retención",
        variant: "destructive"
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // EXPORTACIONES CONTABLES - 100% DATOS REALES
  const getAccountingExports = async (filters: ReportFilters) => {
    console.log('📊 useReports: Getting accounting exports with real data');
    setIsLoading(true);
    try {
      const data = await ReportsDBService.getAccountingExports(filters);
      console.log('✅ useReports: Accounting exports data received:', data.length, 'records');
      return data;
    } catch (error) {
      console.error('❌ useReports: Error getting accounting exports:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las exportaciones contables",
        variant: "destructive"
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // DIAN - Estado Nómina Electrónica
  const getDianStatusReport = async (filters: ReportFilters) => {
    console.log('📊 useReports: Getting DIAN status with real data');
    setIsLoading(true);
    try {
      const data = await ReportsDBService.getDianStatusReport(filters);
      console.log('✅ useReports: DIAN status data received:', data.length, 'records');
      return data;
    } catch (error) {
      console.error('❌ useReports: Error getting DIAN status:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el estado de nómina electrónica",
        variant: "destructive"
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // PILA - Preliquidación
  const getPilaPreliquidation = async (filters: ReportFilters) => {
    console.log('📊 useReports: Getting PILA preliquidation with real data');
    setIsLoading(true);
    try {
      const data = await ReportsDBService.getPilaPreliquidation(filters);
      console.log('✅ useReports: PILA preliquidation data received:', data.length, 'records');
      return data;
    } catch (error) {
      console.error('❌ useReports: Error getting PILA preliquidation:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la preliquidación PILA",
        variant: "destructive"
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };
  // EXPORTACIÓN A EXCEL
  const exportToExcel = async (reportType: string, data: any[], fileName: string) => {
    try {
      console.log('📤 useReports: Exporting to Excel:', { reportType, fileName, records: data.length });
      
      if (!data || data.length === 0) {
        toast({
          title: "Sin datos",
          description: "No hay datos para exportar",
          variant: "destructive"
        });
        return;
      }
      
      // Usar ExcelExportService para exportación real
      const { ExcelExportService } = await import('@/services/ExcelExportService');
      
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

      // Registrar en historial
      const newExport: ExportHistory = {
        id: Date.now().toString(),
        reportType,
        fileName: `${finalFileName}.xlsx`,
        format: 'excel',
        generatedBy: 'usuario@empresa.com',
        generatedAt: new Date().toISOString(),
        parameters: filters
      };
      setExportHistory(prev => [newExport, ...prev]);

      toast({
        title: "Exportación exitosa",
        description: `Archivo ${finalFileName}.xlsx descargado`,
      });

    } catch (error) {
      console.error('❌ useReports: Error exporting to Excel:', error);
      toast({
        title: "Error de exportación",
        description: "No se pudo exportar el archivo Excel",
        variant: "destructive"
      });
    }
  };

  // EXPORTACIÓN A PDF
  const exportToPDF = async (reportType: string, data: any[], fileName: string) => {
    try {
      console.log('📤 useReports: Exporting to PDF:', { reportType, fileName, records: data.length });
      
      if (!data || data.length === 0) {
        toast({
          title: "Sin datos",
          description: "No hay datos para exportar",
          variant: "destructive"
        });
        return;
      }
      
      // Usar PDFExportService para exportación real
      const { PDFExportService } = await import('@/services/PDFExportService');
      
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

      // Registrar en historial
      const newExport: ExportHistory = {
        id: Date.now().toString(),
        reportType,
        fileName: `${finalFileName}.pdf`,
        format: 'pdf',
        generatedBy: 'usuario@empresa.com',
        generatedAt: new Date().toISOString(),
        parameters: filters
      };
      setExportHistory(prev => [newExport, ...prev]);

      toast({
        title: "Exportación exitosa",
        description: `Archivo ${finalFileName}.pdf descargado`,
      });

    } catch (error) {
      console.error('❌ useReports: Error exporting to PDF:', error);
      toast({
        title: "Error de exportación",
        description: "No se pudo exportar el archivo PDF",
        variant: "destructive"
      });
    }
  };

  // GUARDAR FILTRO
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
    
    toast({
      title: "Filtro guardado",
      description: `El filtro "${name}" ha sido guardado exitosamente`,
    });
  };

  // APLICAR FILTRO
  const applyFilter = (filter: SavedFilter) => {
    setFilters(filter.filters);
    setActiveReportType(filter.reportType);
    
    toast({
      title: "Filtro aplicado",
      description: `Se ha aplicado el filtro "${filter.name}"`,
    });
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
    getDianStatusReport,
    getPilaPreliquidation,
    exportToExcel,
    exportToPDF,
    saveFilter,
    applyFilter
  };
};
