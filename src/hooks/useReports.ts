
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ExportHistory, ReportFilters, SavedFilter } from '@/types/reports';

export const useReports = () => {
  const { user } = useAuth();
  const [exportHistory, setExportHistory] = useState<ExportHistory[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [activeReportType, setActiveReportType] = useState<string>('employees');

  const addExportToHistory = useCallback((exportItem: ExportHistory) => {
    // Usar el email del usuario autenticado
    const exportWithUser = {
      ...exportItem,
      generatedBy: user?.email || 'Usuario desconocido'
    };
    
    setExportHistory(prev => [exportWithUser, ...prev]);
  }, [user?.email]);

  const saveFilter = useCallback(async (name: string, reportType: string) => {
    // Aquí irían los filtros actuales del reporte
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name,
      filters: {}, // Los filtros actuales del contexto
      reportType,
      createdAt: new Date().toISOString(),
      createdBy: user?.email || 'Usuario desconocido'
    };
    
    setSavedFilters(prev => [...prev, newFilter]);
  }, [user?.email]);

  const applyFilter = useCallback((filter: SavedFilter) => {
    // Aplicar los filtros guardados
    console.log('Applying filter:', filter);
    // Implementar lógica de aplicación de filtros
  }, []);

  return {
    exportHistory,
    savedFilters,
    activeReportType,
    setActiveReportType,
    addExportToHistory,
    saveFilter,
    applyFilter
  };
};
