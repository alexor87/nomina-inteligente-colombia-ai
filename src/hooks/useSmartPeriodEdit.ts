
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { PayrollHistoryPeriod } from '@/types/payroll-history';
import { PayrollReopenService } from '@/services/PayrollReopenService';

export const useSmartPeriodEdit = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSmartEdit = useCallback(async (period: PayrollHistoryPeriod) => {
    setIsProcessing(true);
    
    try {
      // Si ya está reabierto, ir directo a editar
      if (period.reopenedBy) {
        console.log('🎯 Period already reopened, navigating to edit...');
        
        // Guardar información del período para continuar editando
        sessionStorage.setItem('continueEditingPeriod', JSON.stringify({
          id: period.id,
          periodo: period.period,
          startDate: period.startDate,
          endDate: period.endDate,
          type: period.type,
          status: period.status,
          reopenedBy: period.reopenedBy,
          reopenedAt: period.reopenedAt,
          employeesCount: period.employeesCount
        }));
        
        toast({
          title: "Continuando edición",
          description: `Cargando período ${period.period} para editar`,
        });
        
        navigate('/app/payroll');
        return;
      }

      // Si está cerrado, reabrirlo automáticamente
      console.log('🔓 Reopening closed period automatically...');
      
      // Mock del proceso de reapertura (aquí iría la lógica real)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simular reapertura exitosa y navegar
      sessionStorage.setItem('continueEditingPeriod', JSON.stringify({
        id: period.id,
        periodo: period.period,
        startDate: period.startDate,
        endDate: period.endDate,
        type: period.type,
        status: 'reabierto',
        reopenedBy: 'current-user@example.com',
        reopenedAt: new Date().toISOString(),
        employeesCount: period.employeesCount
      }));
      
      toast({
        title: "✅ Período reabierto y listo",
        description: `${period.period} está ahora disponible para editar`,
      });
      
      navigate('/app/payroll');
      
    } catch (error) {
      console.error('Error in smart edit:', error);
      toast({
        title: "Error al procesar período",
        description: "No se pudo abrir el período para edición",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [navigate, toast]);

  return {
    handleSmartEdit,
    isProcessing
  };
};
