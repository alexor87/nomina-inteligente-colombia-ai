import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { PayrollDomainService } from '@/services/PayrollDomainService';
import { AtomicLiquidationService } from '@/services/AtomicLiquidationService';
import type { PayrollSummary } from '@/types/payroll';

interface LiquidationResult {
  success: boolean;
  periodId?: string;
  summary?: PayrollSummary;
  message: string;
}

export const usePayrollUnified = () => {
  const [isLiquidating, setIsLiquidating] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [liquidationResult, setLiquidationResult] = useState<any>(null);
  
  const { toast } = useToast();
  const { companyId } = useCurrentCompany();

  const detectCurrentPeriodSituation = useCallback(async () => {
    if (!companyId) {
      console.warn('No company selected, skipping period detection');
      return null;
    }

    try {
      const period = await PayrollDomainService.detectCurrentPeriodSituation(companyId);
      setCurrentPeriod(period);
      return period;
    } catch (error) {
      console.error('Error detecting current period:', error);
      toast({
        title: "Error",
        description: "No se pudo detectar el período actual",
        variant: "destructive"
      });
      return null;
    }
  }, [companyId, toast]);

  const createNextPeriod = useCallback(async () => {
    if (!companyId) {
      toast({
        title: "Error",
        description: "No se ha seleccionado una empresa",
        variant: "destructive"
      });
      return;
    }

    try {
      const newPeriod = await PayrollDomainService.createNextPeriod(companyId);
      setCurrentPeriod(newPeriod);
      toast({
        title: "Período creado",
        description: "Se ha creado el nuevo período de nómina",
      });
      return newPeriod;
    } catch (error) {
      console.error('Error creating next period:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el nuevo período",
        variant: "destructive"
      });
    }
  }, [companyId, toast]);

  const closePeriod = useCallback(async (periodId: string) => {
    try {
      await PayrollDomainService.closePeriod(periodId);
      setCurrentPeriod(null);
      toast({
        title: "Período cerrado",
        description: "Se ha cerrado el período actual",
      });
    } catch (error) {
      console.error('Error closing period:', error);
      toast({
        title: "Error",
        description: "No se pudo cerrar el período",
        variant: "destructive"
      });
    }
  }, [toast]);

  const getPayrollHistory = useCallback(async () => {
    try {
      return await PayrollDomainService.getPayrollHistory();
    } catch (error) {
      console.error('Error getting payroll history:', error);
      toast({
        title: "Error",
        description: "No se pudo obtener el historial de nómina",
        variant: "destructive"
      });
      return [];
    }
  }, [toast]);

  const liquidatePayroll = useCallback(async (): Promise<LiquidationResult> => {
    if (!currentPeriod || !companyId) {
      const message = 'No hay período activo para liquidar';
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      });
      return { success: false, message };
    }

    try {
      setIsLiquidating(true);
      console.log('🚀 Iniciando liquidación atómica para período:', currentPeriod.id);

      // Ejecutar liquidación atómica
      const atomicResult = await AtomicLiquidationService.execute_atomic_liquidation(
        currentPeriod.id, 
        companyId
      );

      if (!atomicResult.success) {
        throw new Error(atomicResult.message || 'Error en liquidación atómica');
      }

      console.log('✅ Liquidación atómica exitosa:', atomicResult.message);

      // ✅ NUEVO: AUTO-PROVISIONING después de liquidación exitosa
      await handleAutoProvisioning(currentPeriod.id);

      // Preparar resultado
      const result: LiquidationResult = {
        success: true,
        periodId: currentPeriod.id,
        summary: atomicResult.summary,
        message: atomicResult.message
      };

      // Mostrar modal de éxito
      setLiquidationResult({
        periodData: {
          startDate: currentPeriod.fecha_inicio,
          endDate: currentPeriod.fecha_fin,
          type: currentPeriod.tipo_periodo
        },
        summary: atomicResult.summary,
        periodId: currentPeriod.id
      });
      setShowSuccessModal(true);

      // Limpiar período actual
      setCurrentPeriod(null);

      return result;

    } catch (error) {
      console.error('❌ Error en liquidación:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido en liquidación';
      
      toast({
        title: "Error en liquidación",
        description: message,
        variant: "destructive"
      });

      return { success: false, message };
    } finally {
      setIsLiquidating(false);
    }
  }, [currentPeriod, companyId, toast]);

  // ✅ NUEVO: Función para manejar provisiones automáticas
  const handleAutoProvisioning = async (periodId: string) => {
    try {
      console.log('🧮 Verificando modo de provisiones para auto-cálculo...');

      // 1. Leer configuración de provisiones de la empresa
      const { data: companySettings, error: settingsError } = await supabase
        .from('company_settings')
        .select('provision_mode')
        .eq('company_id', companyId)
        .single();

      if (settingsError) {
        console.warn('⚠️ No se pudo leer configuración de provisiones:', settingsError.message);
        return; // No bloquear liquidación por esto
      }

      const provisionMode = companySettings?.provision_mode || 'on_liquidation';
      console.log('📋 Modo de provisiones detectado:', provisionMode);

      if (provisionMode !== 'on_liquidation') {
        console.log('📋 Provisiones en modo consolidado mensual - no se calculan automáticamente');
        toast({
          title: "Modo consolidación mensual",
          description: "Las provisiones se registrarán cuando ejecute la consolidación mensual desde Prestaciones Sociales.",
          className: "border-blue-200 bg-blue-50"
        });
        return;
      }

      // 2. Invocar provisiones automáticas con retry por si el período no está completamente cerrado
      console.log('🧮 Ejecutando provisiones automáticas para período:', periodId);
      
      let attempts = 0;
      const maxAttempts = 5;
      const retryDelay = 800; // ms

      while (attempts < maxAttempts) {
        attempts++;
        console.log(`🔄 Intento ${attempts}/${maxAttempts} de calcular provisiones...`);

        const { data: provisionResp, error: provisionErr } = await supabase.functions.invoke('provision-social-benefits', {
          body: { period_id: periodId }
        });

        if (provisionErr) {
          console.error(`❌ Error en intento ${attempts}:`, provisionErr);
          
          // Si es error de período no cerrado y tenemos más intentos, reintentar
          if (provisionErr.message?.includes('period_not_closed') && attempts < maxAttempts) {
            console.log(`⏳ Período no completamente cerrado, reintentando en ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
          
          // Otros errores o máximo de intentos alcanzado
          console.error('❌ Error final calculando provisiones:', provisionErr);
          toast({
            title: "Advertencia",
            description: "La nómina se liquidó exitosamente, pero hubo un problema calculando las provisiones automáticamente. Puede recalcularlas manualmente desde el módulo de Prestaciones Sociales.",
            variant: "destructive",
          });
          return;
        }

        // ✅ Éxito
        console.log('✅ Provisiones registradas automáticamente:', provisionResp);
        
        const provisionCount = provisionResp?.count || 0;
        if (provisionCount > 0) {
          toast({
            title: "Provisiones calculadas automáticamente",
            description: `Se calcularon y registraron ${provisionCount} provisiones para este período.`,
            className: "border-green-200 bg-green-50"
          });
        } else {
          console.log('ℹ️ No se encontraron empleados para calcular provisiones');
        }
        return; // Salir del loop de retry
      }

    } catch (error) {
      console.warn('⚠️ Error inesperado en auto-provisioning:', error);
      toast({
        title: "Advertencia",
        description: "La nómina se liquidó exitosamente, pero no se pudieron calcular las provisiones automáticamente. Puede hacerlo manualmente desde Prestaciones Sociales.",
        variant: "destructive",
      });
    }
  };

  const closeSuccessModal = useCallback(() => {
    setShowSuccessModal(false);
    setLiquidationResult(null);
  }, []);

  return {
    detectCurrentPeriodSituation,
    createNextPeriod,
    closePeriod,
    getPayrollHistory,
    isLiquidating,
    currentPeriod,
    liquidatePayroll,
    showSuccessModal,
    liquidationResult,
    closeSuccessModal,
  };
};
