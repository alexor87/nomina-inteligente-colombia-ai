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
      
      // Invalidar cache antes de detectar para asegurar datos frescos
      const companyId = await PayrollPeriodService.getCurrentUserCompanyId();
      if (companyId) {
        PayrollPeriodIntelligentService.invalidateConfigurationCache(companyId);
        console.log('🗑️ Cache invalidado antes de detectar estado');
      }
      
      const status = await PayrollPeriodIntelligentService.detectPeriodStatus();
      setPeriodStatus(status);
      
      console.log('📊 Estado detectado:', status);
      
      // Mostrar información de debugging sobre la periodicidad
      if (status.nextPeriod) {
        console.log('📊 Periodicidad detectada:', status.nextPeriod.type);
        console.log('📅 Fechas calculadas:', {
          inicio: status.nextPeriod.startDate,
          fin: status.nextPeriod.endDate
        });
      }
      
      // Si es reanudar, ir directo sin mostrar diálogo
      if (status.action === 'resume') {
        console.log('🔄 Reanudando periodo existente');
        toast({
          title: "Nómina en curso",
          description: status.message,
          className: "border-blue-200 bg-blue-50"
        });
        setShowDialog(false);
      } else {
        // Para otros casos, mostrar diálogo
        console.log('💬 Mostrando diálogo de decisión');
        setShowDialog(true);
      }
    } catch (error) {
      console.error('❌ Error detectando estado:', error);
      toast({
        title: "Error de conexión",
        description: "No se pudo verificar el estado de la nómina. Intenta recargar la página.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Cargar al montar el componente y cuando cambie la ruta
  useEffect(() => {
    console.log('🚀 Hook montado, detectando estado...');
    detectPeriodStatus();
  }, [detectPeriodStatus]);

  // Escuchar cambios de configuración (cuando el usuario viene de settings)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('📄 Página visible de nuevo, refrescando estado...');
        detectPeriodStatus();
      }
    };

    const handleFocus = () => {
      console.log('🎯 Ventana enfocada, refrescando estado...');
      detectPeriodStatus();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
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
    
    console.log('📋 Reanudando periodo:', periodStatus.currentPeriod.id);
  }, [periodStatus, toast]);

  // Crear nuevo periodo con validación mejorada
  const handleCreateNewPeriod = useCallback(async () => {
    if (!periodStatus?.nextPeriod) return;
    
    setIsProcessing(true);
    try {
      console.log('🚀 Iniciando creación de nuevo periodo:', periodStatus.nextPeriod);
      console.log('📊 Tipo de periodicidad a crear:', periodStatus.nextPeriod.type);
      
      // Validar que no haya superposición
      const validation = await PayrollPeriodIntelligentService.validateNonOverlappingPeriod(
        periodStatus.nextPeriod.startDate,
        periodStatus.nextPeriod.endDate
      );

      if (!validation.isValid) {
        console.log('❌ Periodo superpuesto detectado');
        toast({
          title: "Periodo superpuesto",
          description: "Ya existe un periodo que se superpone con las fechas seleccionadas",
          variant: "destructive"
        });
        return;
      }

      const newPeriod = await PayrollPeriodIntelligentService.createNextPeriod(periodStatus.nextPeriod);
      
      if (newPeriod) {
        console.log('✅ Nuevo periodo creado exitosamente:', newPeriod.id);
        console.log('📅 Periodo creado con fechas:', {
          inicio: newPeriod.fecha_inicio,
          fin: newPeriod.fecha_fin,
          tipo: newPeriod.tipo_periodo
        });
        
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
        console.log('❌ Error creando nuevo periodo');
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
    if (!periodStatus?.currentPeriod) {
      toast({
        title: "No hay período anterior",
        description: "No se encontró un período anterior para consultar",
        variant: "destructive"
      });
      return;
    }
    
    setShowDialog(false);
    
    // Navegar a la página de detalles del historial de nómina
    navigate(`/payroll-history/${periodStatus.currentPeriod.id}`);
    
    toast({
      title: "Consultando período anterior",
      description: `Mostrando detalles del período ${PayrollPeriodService.formatPeriodText(periodStatus.currentPeriod.fecha_inicio, periodStatus.currentPeriod.fecha_fin)}`,
      className: "border-blue-200 bg-blue-50"
    });
    
    console.log('👁️ Navegando a período anterior:', {
      periodId: periodStatus.currentPeriod.id,
      fechas: {
        inicio: periodStatus.currentPeriod.fecha_inicio,
        fin: periodStatus.currentPeriod.fecha_fin
      },
      estado: periodStatus.currentPeriod.estado
    });
  }, [periodStatus, toast, navigate]);

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

  // Método para refrescar manualmente
  const refreshPeriodStatus = useCallback(() => {
    console.log('🔄 Refresh manual solicitado');
    detectPeriodStatus();
  }, [detectPeriodStatus]);

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
    detectPeriodStatus,
    refreshPeriodStatus // Método adicional para refresh manual
  };
};
