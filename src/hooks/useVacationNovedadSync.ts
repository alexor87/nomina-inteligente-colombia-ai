
import { useEffect } from 'react';
import { VacationNovedadSyncService } from '@/services/VacationNovedadSyncService';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';

/**
 * ✅ HOOK PARA INICIALIZAR SINCRONIZACIÓN BIDIRECCIONAL AUTOMÁTICAMENTE
 */
export const useVacationNovedadSync = () => {
  const { companyId } = useCurrentCompany();

  useEffect(() => {
    if (!companyId) return;

    console.log('🔗 Inicializando sincronización bidireccional para empresa:', companyId);
    VacationNovedadSyncService.initialize(companyId);

    return () => {
      console.log('🔗 Limpiando sincronización bidireccional');
      VacationNovedadSyncService.cleanup();
    };
  }, [companyId]);

  return {
    // Solo para debugging
    companyId,
    isActive: !!companyId
  };
};
