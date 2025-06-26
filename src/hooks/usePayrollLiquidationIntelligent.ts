
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { PayrollPeriodIntelligentService, PeriodStatus } from '@/services/PayrollPeriodIntelligentService';
import { PayrollPeriodService } from '@/services/PayrollPeriodService';

export const usePayrollLiquidationIntelligent = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [periodStatus, setPeriodStatus] = useState<PeriodStatus | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Detectar estado inteligente al cargar
  const detectPeriodStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Detectando estado inteligente del módulo...');
      const status = await PayrollPeriodIntelligentService.detectPeriodStatus();
      setPeriodStatus(status);
      
      // Si es reanudar, ir directo sin mostrar diálogo
      if (status.action === 'resume') {
        toast({
          title: "Nómina en curso",
          description: status.message,
          className: "border-blue-200 bg-blue-50"
        });
        // No mostrar diálogo, ir directo a la liquidación
        setShowDialog(false);
      } else {
        // Para otros casos, mostrar diálogo
        setShowDialog(true);
      }
    } catch (error) {
      console.error('❌ Error detectando estado:', error);
      toast({
        title: "Error de conexión",
        description: "No se pudo verificar el estado de la nómina",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Cargar al montar el componente
  useEffect(() => {
    detectPeriodStatus();
  }, [detectPeriodStatus]);

  // Reanudar periodo existente
  const handleResumePeriod = useCallback(() => {
    if (!periodStatus?.currentPeriod) return;
    
    setShowDialog(false);
    toast({
      title: "Nómina reanudada",
      description: periodStatus.message,
      className: "border-blue-200 bg-blue-50"
    });
    
    // Aquí se puede redirigir a la página específica de liquidación si es necesario
    console.log('📋 Reanudando periodo:', periodStatus.currentPeriod.id);
  }, [periodStatus, toast]);

  // Crear nuevo periodo
  const handleCreateNewPeriod = useCallback(async () => {
    if (!periodStatus?.nextPeriod) return;
    
    setIsProcessing(true);
    try {
      // Validar que no haya superposición
      const validation = await PayrollPeriodIntelligentService.validateNonOverlappingPeriod(
        periodStatus.nextPeriod.startDate,
        periodStatus.nextPeriod.endDate
      );

      if (!validation.isValid) {
        toast({
          title: "Periodo superpuesto",
          description: "Ya existe un periodo que se superpone con las fechas seleccionadas",
          variant: "destructive"
        });
        return;
      }

      const newPeriod = await PayrollPeriodIntelligentService.createNextPeriod(periodStatus.nextPeriod);
      
      if (newPeriod) {
        setShowDialog(false);
        toast({
          title: "¡Nuevo periodo creado!",
          description: `Periodo ${PayrollPeriodService.formatPeriodText(newPeriod.fecha_inicio, newPeriod.fecha_fin)} iniciado correctamente`,
          className: "border-green-200 bg-green-50"
        });
        
        // Recargar estado para reflejar el nuevo periodo
        setTimeout(() => {
          detectPeriodStatus();
        }, 1000);
      } else {
        toast({
          title: "Error al crear periodo",
          description: "No se pudo crear el nuevo periodo de nómina",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Error creando periodo:', error);
      toast({
        title: "Error",
        description: "Ocurrió un error al crear el periodo",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [periodStatus, toast, detectPeriodStatus]);

  // Ver último periodo (modo solo lectura)
  const handleViewLastPeriod = useCallback(() => {
    if (!periodStatus?.currentPeriod) return;
    
    setShowDialog(false);
    toast({
      title: "Consultando periodo anterior",
      description: "Cargando datos del último periodo cerrado...",
      className: "border-yellow-200 bg-yellow-50"
    });
    
    // Redirigir a vista de solo lectura del último periodo
    console.log('👁️ Viendo periodo anterior:', periodStatus.currentPeriod.id);
  }, [periodStatus, toast]);

  // Ir a configuración
  const handleGoToSettings = useCallback(() => {
    setShowDialog(false);
    navigate('/settings');
    toast({
      title: "Redirigiendo a Configuración",
      description: "Configura la periodicidad para poder usar el módulo de nómina",
      className: "border-orange-200 bg-orange-50"
    });
  }, [navigate, toast]);

  // Cerrar diálogo
  const handleCloseDialog = useCallback(() => {
    setShowDialog(false);
    // Si no hay periodo activo y cierra el diálogo, redirigir al dashboard
    if (periodStatus?.action !== 'resume') {
      navigate('/dashboard');
    }
  }, [navigate, periodStatus]);

  return {
    periodStatus,
    showDialog,
    isLoading,
    isProcessing,
    handleResumePeriod,
    handleCreateNewPeriod,
    handleViewLastPeriod,
    handleGoToSettings,
    handleCloseDialog,
    detectPeriodStatus
  };
};
