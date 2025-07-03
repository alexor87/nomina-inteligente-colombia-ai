
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { SmartPeriodDetectionService, SmartPeriodDetection } from '@/services/payroll-intelligent/SmartPeriodDetectionService';

export interface PeriodStatus {
  hasActivePeriod: boolean;
  currentPeriod?: any;
  nextPeriod?: {
    startDate: string;
    endDate: string;
    type: string;
  };
  action: 'resume' | 'suggest_next';
  message: string;
}

export const useSmartPeriodDetection = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [periodStatus, setPeriodStatus] = useState<PeriodStatus | null>(null);
  const [detection, setDetection] = useState<SmartPeriodDetection | null>(null);
  const { toast } = useToast();

  // 🎯 DETECCIÓN INTELIGENTE PRINCIPAL
  const detectPeriod = useCallback(async (retryCount = 0) => {
    try {
      setIsLoading(true);
      console.log(`🚀 INICIANDO DETECCIÓN INTELIGENTE... (intento ${retryCount + 1})`);
      
      // Limpiar cache para asegurar datos frescos
      SmartPeriodDetectionService.clearCache();
      
      // Ejecutar detección inteligente
      const detectionResult = await SmartPeriodDetectionService.detectCurrentPeriod();
      setDetection(detectionResult);
      
      // Convertir resultado a formato esperado
      const status: PeriodStatus = {
        hasActivePeriod: detectionResult.action === 'resume',
        currentPeriod: detectionResult.existing_period || detectionResult.active_period,
        nextPeriod: detectionResult.action === 'create' ? {
          startDate: detectionResult.calculated_period.start_date,
          endDate: detectionResult.calculated_period.end_date,
          type: detectionResult.calculated_period.type
        } : undefined,
        action: detectionResult.action === 'resume' ? 'resume' : 'suggest_next',
        message: detectionResult.message
      };
      
      setPeriodStatus(status);
      
      console.log('✅ DETECCIÓN COMPLETADA:', status);
      
      // Validar consistencia
      const isConsistent = await SmartPeriodDetectionService.validatePeriodConsistency();
      if (!isConsistent) {
        console.warn('⚠️ INCONSISTENCIAS DETECTADAS');
      }
      
    } catch (error) {
      console.error(`❌ Error en detección (intento ${retryCount + 1}):`, error);
      
      // RETRY LOGIC
      if (retryCount < 2) {
        const delay = (retryCount + 1) * 1000; // 1s, 2s
        console.log(`🔄 Reintentando en ${delay}ms...`);
        
        setTimeout(() => {
          detectPeriod(retryCount + 1);
        }, delay);
        return;
      }
      
      // Si fallan todos los reintentos
      console.error('💥 TODOS LOS REINTENTOS FALLARON');
      toast({
        title: "Error de Detección",
        description: "No se pudo detectar el período actual. Intenta recargar la página.",
        variant: "destructive"
      });
      
      // Estado de error
      setPeriodStatus({
        hasActivePeriod: false,
        action: 'suggest_next',
        message: "Error en detección. Recarga la página o contacta soporte técnico."
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // 🆕 CREAR NUEVO PERÍODO
  const createNewPeriod = useCallback(async () => {
    if (!detection || !periodStatus?.nextPeriod) return;
    
    try {
      setIsProcessing(true);
      
      console.log('🆕 CREANDO NUEVO PERÍODO...');
      
      const newPeriod = await SmartPeriodDetectionService.createPeriodFromDetection(detection);
      
      // Actualizar estado
      setPeriodStatus({
        hasActivePeriod: true,
        currentPeriod: newPeriod,
        action: 'resume',
        message: `Período ${newPeriod.periodo} creado exitosamente`
      });
      
      toast({
        title: "✅ Período creado",
        description: `Período ${newPeriod.periodo} listo para liquidación`,
        className: "border-green-200 bg-green-50"
      });
      
      console.log('✅ PERÍODO CREADO Y ESTADO ACTUALIZADO');
      
    } catch (error) {
      console.error('❌ Error creando período:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el período",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [detection, periodStatus, toast]);

  // 🔄 REFRESCAR DETECCIÓN
  const refreshDetection = useCallback(async () => {
    console.log('🔄 REFRESCANDO DETECCIÓN...');
    await detectPeriod(0);
  }, [detectPeriod]);

  // Inicializar al montar
  useEffect(() => {
    detectPeriod();
  }, [detectPeriod]);

  return {
    // Estado
    isLoading,
    isProcessing,
    periodStatus,
    detection,
    
    // Acciones
    createNewPeriod,
    refreshDetection,
    
    // Estados calculados
    canCreatePeriod: periodStatus?.action === 'suggest_next' && periodStatus?.nextPeriod,
    isValidDetection: detection !== null,
    suggestedPeriodName: detection?.calculated_period?.period_name
  };
};
