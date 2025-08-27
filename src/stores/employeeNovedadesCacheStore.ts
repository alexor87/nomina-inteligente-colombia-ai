
import { create } from 'zustand';
import { PayrollNovedad } from '@/types/novedades-enhanced';

interface EmployeeNovedadesCacheState {
  employeeNovedadesCache: Record<string, PayrollNovedad[]>;
  lastRefreshTime: number;
  setEmployeeNovedades: (employeeId: string, novedades: PayrollNovedad[]) => void;
  updateEmployeeNovedades: (updates: Record<string, PayrollNovedad[]>) => void;
  removeNovedadFromCache: (novedadId: string) => void;
  clearCache: () => void;
  setLastRefreshTime: (time: number) => void;
}

export const useEmployeeNovedadesCacheStore = create<EmployeeNovedadesCacheState>((set, get) => ({
  employeeNovedadesCache: {},
  lastRefreshTime: Date.now(),
  
  setEmployeeNovedades: (employeeId: string, novedades: PayrollNovedad[]) => {
    console.log('🏪 Global Store: Actualizando novedades para empleado:', employeeId, 'Count:', novedades.length);
    set((state) => ({
      employeeNovedadesCache: {
        ...state.employeeNovedadesCache,
        [employeeId]: novedades
      },
      lastRefreshTime: Date.now()
    }));
  },
  
  updateEmployeeNovedades: (updates: Record<string, PayrollNovedad[]>) => {
    console.log('🏪 Global Store: Actualizando múltiples empleados:', Object.keys(updates));
    set((state) => ({
      employeeNovedadesCache: {
        ...state.employeeNovedadesCache,
        ...updates
      },
      lastRefreshTime: Date.now()
    }));
  },
  
  removeNovedadFromCache: (novedadId: string) => {
    console.log('🏪 Global Store: Removiendo novedad del cache global:', novedadId);
    const { employeeNovedadesCache } = get();
    const updated: Record<string, PayrollNovedad[]> = {};
    
    Object.entries(employeeNovedadesCache).forEach(([empId, list]) => {
      updated[empId] = list.filter(n => n.id !== novedadId);
    });
    
    set({
      employeeNovedadesCache: updated,
      lastRefreshTime: Date.now()
    });
  },
  
  clearCache: () => {
    console.log('🏪 Global Store: Limpiando cache completo');
    set({
      employeeNovedadesCache: {},
      lastRefreshTime: Date.now()
    });
  },
  
  setLastRefreshTime: (time: number) => {
    console.log('🏪 Global Store: Actualizando lastRefreshTime:', time);
    set({ lastRefreshTime: time });
  }
}));
