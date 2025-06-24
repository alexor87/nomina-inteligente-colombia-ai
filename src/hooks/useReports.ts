import { useState, useEffect } from 'react';
import { ReportFilters, SavedFilter, ExportHistory } from '@/types/reports';
import { ReportsDataService } from '@/services/ReportsDataService';
import { ReportsExportService } from '@/services/ReportsExportService';
import { ReportsFilterService } from '@/services/ReportsFilterService';
import { ReportsMetricsService } from '@/services/ReportsMetricsService';
import { supabase } from '@/integrations/supabase/client';

export const useReports = () => {
  const [filters, setFilters] = useState<ReportFilters>({});
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [exportHistory, setExportHistory] = useState<ExportHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeReportType, setActiveReportType] = useState<string>('payroll-summary');

  const getCurrentUserCompanyId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      
      return profile?.company_id || null;
    } catch (error) {
      console.error('Error getting company ID:', error);
      return null;
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    loadSavedFilters();
    loadExportHistory();
  }, []);

  const loadSavedFilters = async () => {
    try {
      const filters = await ReportsFilterService.loadSavedFilters();
      setSavedFilters(filters);
    } catch (error) {
      console.error('Error loading saved filters:', error);
    }
  };

  const loadExportHistory = async () => {
    try {
      const history = await ReportsMetricsService.loadExportHistory();
      setExportHistory(history);
    } catch (error) {
      console.error('Error loading export history:', error);
    }
  };

  const getPayrollSummaryReport = async (filters: ReportFilters) => {
    setLoading(true);
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('payrolls')
        .select(`
          *,
          employees (id, nombre, apellido, cargo)
        `)
        .eq('company_id', companyId);

      if (error) throw error;

      return data?.map(payroll => ({
        employeeId: payroll.employee_id,
        employeeName: `${payroll.employees.nombre} ${payroll.employees.apellido}`,
        period: payroll.periodo,
        totalEarnings: Number(payroll.total_devengado || 0),
        totalDeductions: Number(payroll.total_deducciones || 0),
        netPay: Number(payroll.neto_pagado || 0),
        employerContributions: Number((payroll.total_devengado || 0) * 0.215), // Aproximado 21.5%
        costCenter: 'Administración'
      })) || [];
    } catch (error) {
      console.error('Error getting payroll summary report:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getLaborCostReport = async (filters: ReportFilters) => {
    setLoading(true);
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', companyId)
        .eq('estado', 'activo');

      if (error) throw error;

      return data?.map(employee => ({
        employeeId: employee.id,
        employeeName: `${employee.nombre} ${employee.apellido}`,
        baseSalary: Number(employee.salario_base || 0),
        benefits: Number(employee.salario_base || 0) * 0.15, // 15% beneficios
        overtime: 0, // No hay datos de horas extra en empleados
        bonuses: 0, // No hay datos de bonos en empleados
        employerContributions: Number(employee.salario_base || 0) * 0.215, // 21.5% aportes
        totalCost: Number(employee.salario_base || 0) * 1.365, // Base + beneficios + aportes
        costCenter: 'Administración'
      })) || [];
    } catch (error) {
      console.error('Error getting labor cost report:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getSocialSecurityReport = async (filters: ReportFilters) => {
    setLoading(true);
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('payrolls')
        .select(`
          *,
          employees (id, nombre, apellido, eps, afp, arl)
        `)
        .eq('company_id', companyId);

      if (error) throw error;

      return data?.map(payroll => ({
        employeeId: payroll.employee_id,
        employeeName: `${payroll.employees.nombre} ${payroll.employees.apellido}`,
        healthEmployee: Number(payroll.salud_empleado || 0),
        healthEmployer: Number(payroll.salud_empleado || 0) * 0.85/0.04, // Empleador paga 8.5% vs 4% empleado
        pensionEmployee: Number(payroll.pension_empleado || 0),
        pensionEmployer: Number(payroll.pension_empleado || 0) * 12/4, // Empleador paga 12% vs 4% empleado
        arl: Number(payroll.salario_base || 0) * 0.00522, // 0.522% promedio ARL
        compensationBox: Number(payroll.salario_base || 0) * 0.04, // 4% caja compensación
        total: Number(payroll.salud_empleado || 0) + Number(payroll.pension_empleado || 0) + 
               (Number(payroll.salario_base || 0) * 0.04522) // ARL + Caja
      })) || [];
    } catch (error) {
      console.error('Error getting social security report:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getIncomeRetentionCertificates = async (year: number) => {
    setLoading(true);
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('payrolls')
        .select(`
          *,
          employees (id, nombre, apellido, cedula)
        `)
        .eq('company_id', companyId)
        .gte('created_at', `${year}-01-01`)
        .lt('created_at', `${year + 1}-01-01`);

      if (error) throw error;

      return data?.map(payroll => ({
        employeeId: payroll.employee_id,
        employeeName: `${payroll.employees.nombre} ${payroll.employees.apellido}`,
        year: year,
        totalIncome: Number(payroll.total_devengado || 0),
        totalRetentions: Number(payroll.retencion_fuente || 0),
        status: 'generated' as const,
        generatedAt: new Date().toISOString(),
        sentAt: undefined
      })) || [];
    } catch (error) {
      console.error('Error getting income retention certificates:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getNoveltyHistoryReport = async (filters: ReportFilters) => {
    setLoading(true);
    try {
      // Por ahora retornamos array vacío ya que no hay tabla de novedades
      return [];
    } catch (error) {
      console.error('Error getting novelty history report:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getAccountingExports = async (filters: ReportFilters) => {
    setLoading(true);
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('payrolls')
        .select(`
          *,
          employees (nombre, apellido)
        `)
        .eq('company_id', companyId);

      if (error) throw error;

      const accountingEntries = data?.map(payroll => ({
        account: '510505',
        description: `Nómina ${payroll.employees.nombre} ${payroll.employees.apellido}`,
        debit: Number(payroll.total_devengado || 0),
        credit: 0
      })) || [];

      return [{
        id: 'accounting-export-1',
        type: 'nomina',
        period: data?.[0]?.periodo || 'N/A',
        totalAmount: accountingEntries.reduce((sum, entry) => sum + entry.debit, 0),
        accountingEntries,
        generatedAt: new Date().toISOString()
      }];
    } catch (error) {
      console.error('Error getting accounting exports:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async (reportType: string, data: any[], fileName: string) => {
    setLoading(true);
    try {
      return await ReportsExportService.exportToExcel(
        reportType, 
        data, 
        fileName, 
        filters,
        (newExport) => setExportHistory(prev => [newExport, ...prev])
      );
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async (reportType: string, data: any[], fileName: string) => {
    setLoading(true);
    try {
      return await ReportsExportService.exportToPDF(
        reportType, 
        data, 
        fileName, 
        filters,
        (newExport) => setExportHistory(prev => [newExport, ...prev])
      );
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async (reportType: string, data: any[], fileName: string) => {
    setLoading(true);
    try {
      return await ReportsExportService.exportToCSV(
        reportType, 
        data, 
        fileName, 
        filters,
        (newExport) => setExportHistory(prev => [newExport, ...prev])
      );
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const saveFilter = async (name: string, reportType: string) => {
    try {
      const newFilter = await ReportsFilterService.saveFilter(name, reportType, filters);
      setSavedFilters(prev => [...prev, newFilter]);
      return newFilter;
    } catch (error) {
      console.error('Error saving filter:', error);
      throw error;
    }
  };

  const deleteFilter = async (filterId: string) => {
    try {
      await ReportsFilterService.deleteFilter(filterId);
      setSavedFilters(prev => prev.filter(f => f.id !== filterId));
    } catch (error) {
      console.error('Error deleting filter:', error);
      throw error;
    }
  };

  const applyFilter = (savedFilter: SavedFilter) => {
    setFilters(savedFilter.filters);
    setActiveReportType(savedFilter.reportType);
  };

  const clearFilters = () => {
    setFilters({});
  };

  const getReportMetrics = async () => {
    try {
      return await ReportsMetricsService.getReportMetrics();
    } catch (error) {
      console.error('Error getting report metrics:', error);
      throw error;
    }
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
    exportToCSV,
    saveFilter,
    deleteFilter,
    applyFilter,
    clearFilters,
    getReportMetrics
  };
};
