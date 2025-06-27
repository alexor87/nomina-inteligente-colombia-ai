
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

  // Handle tipo cotizante change - improved with better error handling
  const handleTipoCotizanteChange = useCallback(async (tipoCotizanteId: string) => {
    console.log('🔄 Changing tipo cotizante to:', tipoCotizanteId);
    setValue?.('tipoCotizanteId', tipoCotizanteId);
    setValue?.('subtipoCotizanteId', ''); // Always clear subtipo when changing tipo
    
    if (tipoCotizanteId) {
      try {
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
      console.log('🔄 Loading subtipos for tipoCotizanteId:', employee.tipoCotizanteId);
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
