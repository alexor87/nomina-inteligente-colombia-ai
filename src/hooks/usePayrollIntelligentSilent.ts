
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { PayrollPeriodIntelligentService, PeriodStatus } from '@/services/PayrollPeriodIntelligentService';
import { PayrollPeriodService } from '@/services/PayrollPeriodService';

export const usePayrollIntelligentSilent = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(true);
  const [periodStatus, setPeriodStatus] = useState<PeriodStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    handleIntelligentFlow();
  }, []);

  const handleIntelligentFlow = async () => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);

      console.log('🎯 Iniciando flujo inteligente silencioso...');

      // Invalidar cache para asegurar datos frescos
      const companyId = await PayrollPeriodService.getCurrentUserCompanyId();
      if (companyId) {
        PayrollPeriodIntelligentService.invalidateConfigurationCache(companyId);
      }

      // Detectar estado del sistema
      const status = await PayrollPeriodIntelligentService.detectPeriodStatus();
      setPeriodStatus(status);

      console.log('📊 Estado detectado:', status);

      // Manejar cada caso automáticamente
      switch (status.action) {
        case 'resume':
          // Caso 1: Hay período activo, continuar automáticamente
          console.log('📋 Continuando con período activo existente');
          showSuccessToast('Continuando con período actual', status.message);
          // Ya estamos en la página correcta, no necesitamos navegar
          break;

        case 'create':
          // Caso 2: Crear nuevo período automáticamente
          console.log('🚀 Creando nuevo período automáticamente');
          await createNewPeriodAutomatically(status);
          break;

        case 'configure':
          // Caso 3: Falta configuración - redirigir a settings
          console.log('⚙️ Redirigiendo a configuración');
          setErrorMessage('Se requiere configuración de periodicidad');
          toast({
            title: "Configuración requerida",
            description: "Configura la periodicidad de nómina para continuar",
            className: "border-orange-200 bg-orange-50"
          });
          setTimeout(() => navigate('/settings'), 2000);
          break;

        case 'view_last':
          // Caso 4: Error - mostrar mensaje
          console.log('❌ Error en el sistema');
          setErrorMessage(status.message);
          toast({
            title: "Error",
            description: status.message,
            variant: "destructive"
          });
          break;

        default:
          console.log('❓ Estado no reconocido');
          setErrorMessage('Estado del sistema no reconocido');
      }

    } catch (error) {
      console.error('❌ Error en flujo inteligente:', error);
      setErrorMessage('Error al procesar el período de nómina');
      toast({
        title: "Error del sistema",
        description: "No se pudo procesar el período. Intenta recargar la página.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const createNewPeriodAutomatically = async (status: PeriodStatus) => {
    if (!status.nextPeriod) {
      console.error('❌ No hay datos del siguiente período');
      setErrorMessage('Error: No se pudo calcular el siguiente período');
      return;
    }

    try {
      console.log('🚀 Creando período:', status.nextPeriod);

      // Validar que no haya superposición
      const validation = await PayrollPeriodIntelligentService.validateNonOverlappingPeriod(
        status.nextPeriod.startDate,
        status.nextPeriod.endDate
      );

      if (!validation.isValid) {
        console.error('❌ Período superpuesto detectado');
        setErrorMessage('Error: Período se superpone con otro existente');
        toast({
          title: "Período superpuesto",
          description: "Ya existe un período que se superpone con las fechas calculadas",
          variant: "destructive"
        });
        return;
      }

      // Crear período automáticamente
      const newPeriod = await PayrollPeriodIntelligentService.createNextPeriod(status.nextPeriod);
      
      if (newPeriod) {
        console.log('✅ Período creado exitosamente:', newPeriod.id);
        
        // Mensaje de éxito con información del período
        const periodText = PayrollPeriodService.formatPeriodText(
          newPeriod.fecha_inicio, 
          newPeriod.fecha_fin
        );
        
        showSuccessToast(
          'Nuevo período generado',
          `Período ${periodText} creado automáticamente`
        );

        // Actualizar estado
        setPeriodStatus({
          ...status,
          action: 'resume',
          currentPeriod: newPeriod,
          message: `Período ${periodText} listo para liquidación`
        });

      } else {
        console.error('❌ Error creando período');
        setErrorMessage('Error al crear el nuevo período');
        toast({
          title: "Error",
          description: "No se pudo crear el nuevo período de nómina",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Error en creación automática:', error);
      setErrorMessage('Error al crear el período automáticamente');
      toast({
        title: "Error",
        description: "Ocurrió un error al crear el período",
        variant: "destructive"
      });
    }
  };

  const showSuccessToast = (title: string, description: string) => {
    toast({
      title,
      description,
      className: "border-green-200 bg-green-50"
    });
  };

  const retryFlow = () => {
    handleIntelligentFlow();
  };

  return {
    isProcessing,
    periodStatus,
    errorMessage,
    retryFlow
  };
};
