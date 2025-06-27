
import { useCallback, useEffect } from 'react';
import { UseFormSetValue } from 'react-hook-form';
import { Employee } from '@/types';
import { EmployeeFormData } from '@/components/employees/form/types';
import { useTiposCotizante } from '@/hooks/useTiposCotizante';

export const useTipoCotizanteManager = (employee?: Employee, setValue?: UseFormSetValue<EmployeeFormData>) => {
  const { 
    tiposCotizante, 
    subtiposCotizante, 
    isLoadingTipos, 
    isLoadingSubtipos, 
    error: tiposError,
    fetchSubtipos,
    clearSubtipos 
  } = useTiposCotizante();

  // Handle tipo cotizante change - optimized to avoid duplicate setValue calls
  const handleTipoCotizanteChange = useCallback(async (tipoCotizanteId: string) => {
    console.log('🔄 Changing tipo cotizante to:', tipoCotizanteId);
    
    // Only clear subtipo, don't set tipoCotizanteId here as it's already set by the Controller
    setValue?.('subtipoCotizanteId', '');
    
    if (tipoCotizanteId) {
      try {
        console.log('📥 Fetching subtipos for tipoCotizanteId:', tipoCotizanteId);
        await fetchSubtipos(tipoCotizanteId);
      } catch (error) {
        console.error('Error fetching subtipos:', error);
      }
    } else {
      clearSubtipos();
    }
  }, [setValue, fetchSubtipos, clearSubtipos]);

  // Load subtipos when employee has tipoCotizanteId - only on mount
  useEffect(() => {
    if (employee?.tipoCotizanteId) {
      console.log('🔄 Loading subtipos for existing employee tipoCotizanteId:', employee.tipoCotizanteId);
      fetchSubtipos(employee.tipoCotizanteId);
    }
  }, [employee?.tipoCotizanteId, fetchSubtipos]);

  return {
    tiposCotizante,
    subtiposCotizante,
    isLoadingTipos,
    isLoadingSubtipos,
    tiposError,
    handleTipoCotizanteChange
  };
};
