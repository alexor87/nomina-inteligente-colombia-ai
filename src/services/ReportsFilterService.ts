
import { SavedFilter, ReportFilters } from '@/types/reports';

export class ReportsFilterService {
  static async loadSavedFilters(): Promise<SavedFilter[]> {
    // Mock data - En producción cargar desde Supabase
    return [
      {
        id: '1',
        name: 'Empleados Activos 2025',
        filters: { employeeStatus: ['activo'] },
        reportType: 'payroll-summary',
        userId: 'user1',
        createdAt: '2025-01-01'
      }
    ];
  }

  static async saveFilter(
    name: string, 
    reportType: string, 
    filters: ReportFilters
  ): Promise<SavedFilter> {
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name,
      filters,
      reportType,
      userId: 'user1',
      createdAt: new Date().toISOString()
    };
    
    return newFilter;
  }
}
