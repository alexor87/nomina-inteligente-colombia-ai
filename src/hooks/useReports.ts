
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
    const filters = await ReportsFilterService.loadSavedFilters();
    setSavedFilters(filters);
  };

  const loadExportHistory = async () => {
    const history = await ReportsMetricsService.loadExportHistory();
    setExportHistory(history);
  };

  const getPayrollSummaryReport = async (filters: ReportFilters) => {
    setLoading(true);
    try {
      return await ReportsDataService.getPayrollSummaryReport(filters);
    } finally {
      setLoading(false);
    }
  };

  const getLaborCostReport = async (filters: ReportFilters) => {
    setLoading(true);
    try {
      return await ReportsDataService.getLaborCostReport(filters);
    } finally {
      setLoading(false);
    }
  };

  const getSocialSecurityReport = async (filters: ReportFilters) => {
    setLoading(true);
    try {
      return await ReportsDataService.getSocialSecurityReport(filters);
    } finally {
      setLoading(false);
    }
  };

  const getIncomeRetentionCertificates = async (year: number) => {
    return await ReportsDataService.getIncomeRetentionCertificates(year);
  };

  const getNoveltyHistoryReport = async (filters: ReportFilters) => {
    return await ReportsDataService.getNoveltyHistoryReport(filters);
  };

  const getAccountingExports = async (filters: ReportFilters) => {
    return await ReportsDataService.getAccountingExports(filters);
  };

  const exportToExcel = async (reportType: string, data: any[], fileName: string) => {
    return await ReportsExportService.exportToExcel(
      reportType, 
      data, 
      fileName, 
      filters,
      (newExport) => setExportHistory(prev => [newExport, ...prev])
    );
  };

  const exportToPDF = async (reportType: string, data: any[], fileName: string) => {
    return await ReportsExportService.exportToPDF(
      reportType, 
      data, 
      fileName, 
      filters,
      (newExport) => setExportHistory(prev => [newExport, ...prev])
    );
  };

  const saveFilter = async (name: string, reportType: string) => {
    const newFilter = await ReportsFilterService.saveFilter(name, reportType, filters);
    setSavedFilters(prev => [...prev, newFilter]);
    return newFilter;
  };

  const applyFilter = (savedFilter: SavedFilter) => {
    setFilters(savedFilter.filters);
    setActiveReportType(savedFilter.reportType);
  };

  const getReportMetrics = async () => {
    return await ReportsMetricsService.getReportMetrics();
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
