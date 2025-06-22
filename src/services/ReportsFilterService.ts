
import { SavedFilter, ReportFilters } from '@/types/reports';

export class ReportsFilterService {
  static async loadSavedFilters(): Promise<SavedFilter[]> {
    // Mock data - En producción cargar desde Supabase
    return [
      {
        id: '1',
        name: 'Empleados Activos 2025',
        filters: { 
          employeeStatus: ['activo'],
          dateRange: { from: '2025-01-01', to: '2025-12-31' }
        },
        reportType: 'payroll-summary',
        userId: 'user1',
        createdAt: '2025-01-01'
      },
      {
        id: '2',
        name: 'Centro Administración',
        filters: { 
          costCenters: ['Administración']
        },
        reportType: 'labor-costs',
        userId: 'user1',
        createdAt: '2025-01-05'
      },
      {
        id: '3',
        name: 'Horas Extra Enero',
        filters: { 
          noveltyTypes: ['overtime'],
          dateRange: { from: '2025-01-01', to: '2025-01-31' }
        },
        reportType: 'novelty-history',
        userId: 'user1',
        createdAt: '2025-01-10'
      }
    ];
  }

  static async saveFilter(
    name: string, 
    reportType: string, 
    filters: ReportFilters
  ): Promise<SavedFilter> {
    // Validar que el nombre no esté vacío
    if (!name.trim()) {
      throw new Error('El nombre del filtro es requerido');
    }

    // Validar que haya al menos un filtro aplicado
    const hasFilters = Object.keys(filters).some(key => {
      const value = filters[key as keyof ReportFilters];
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      if (typeof value === 'object' && value !== null) {
        // Handle dateRange object specifically
        if (key === 'dateRange') {
          const dateRange = value as { from: string; to: string };
          return dateRange.from !== '' || dateRange.to !== '';
        }
        // For other objects, check if they have any defined values
        return Object.values(value).some(v => v !== undefined && v !== '' && v !== null);
      }
      return value !== undefined && value !== '';
    });

    if (!hasFilters) {
      throw new Error('Debe aplicar al menos un filtro antes de guardar');
    }

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: name.trim(),
      filters,
      reportType,
      userId: 'user1', // En producción obtener del contexto de autenticación
      createdAt: new Date().toISOString()
    };
    
    // En producción aquí se guardaría en Supabase
    console.log('Saving filter:', newFilter);
    
    return newFilter;
  }

  static async deleteFilter(filterId: string): Promise<void> {
    // En producción eliminar de Supabase
    console.log('Deleting filter:', filterId);
  }

  static async updateFilter(
    filterId: string, 
    name: string, 
    filters: ReportFilters
  ): Promise<SavedFilter> {
    // En producción actualizar en Supabase
    const updatedFilter: SavedFilter = {
      id: filterId,
      name: name.trim(),
      filters,
      reportType: 'payroll-summary', // En producción obtener el tipo actual
      userId: 'user1',
      createdAt: new Date().toISOString()
    };
    
    console.log('Updating filter:', updatedFilter);
    return updatedFilter;
  }
}
