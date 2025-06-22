
import { useState, useEffect } from 'react';
import { ReportFilters, SavedFilter, ExportHistory } from '@/types/reports';
import { ReportsDataService } from '@/services/ReportsDataService';
import { ReportsExportService } from '@/services/ReportsExportService';
import { ReportsFilterService } from '@/services/ReportsFilterService';
import { ReportsMetricsService } from '@/services/ReportsMetricsService';

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
      return await ReportsDataService.getPayrollSummaryReport(filters);
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
      return await ReportsDataService.getLaborCostReport(filters);
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
      return await ReportsDataService.getSocialSecurityReport(filters);
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
      return await ReportsDataService.getIncomeRetentionCertificates(year);
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
      return await ReportsDataService.getNoveltyHistoryReport(filters);
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
      return await ReportsDataService.getAccountingExports(filters);
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
