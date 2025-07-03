import { useState, useCallback } from 'react';
import { PayrollHistoryPeriod, ReopenPeriodData, EditWizardSteps, AuditLog } from '@/types/payroll-history';
import { PayrollReopenService, ReopenPeriodRequest } from '@/services/PayrollReopenService';
import { PayrollHistoryService } from '@/services/PayrollHistoryService';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UsePayrollHistoryReturn {
  isLoading: boolean;
  isReopening: boolean;
  isExporting: boolean;
  isRegenerating: boolean;
  isFixing: boolean;
  canUserReopenPeriods: boolean;
  checkUserPermissions: () => Promise<void>;
  reopenPeriod: (periodo: string) => Promise<void>;
  closePeriodAgain: (periodo: string) => Promise<void>;
  canReopenPeriod: (periodo: string) => Promise<{canReopen: boolean, reason?: string, hasVouchers: boolean}>;
  closePeriodWithWizard: (periodId: string, wizardSteps: EditWizardSteps) => Promise<void>;
  exportToExcel: (periods: PayrollHistoryPeriod[]) => Promise<void>;
  downloadFile: (fileUrl: string, fileName: string) => Promise<void>;
  createAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => Promise<void>;
  regenerateHistoricalData: (periodId: string) => Promise<boolean>;
  fixSpecificPeriodData: (periodId: string) => Promise<boolean>;
}

export const usePayrollHistory = (): UsePayrollHistoryReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [canUserReopenPeriods, setCanUserReopenPeriods] = useState(false);

  const checkUserPermissions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const companyId = await PayrollHistoryService.getCurrentUserCompanyId();
      if (!companyId) return;

      const canReopen = await PayrollReopenService.canUserReopenPeriods(user.id, companyId);
      setCanUserReopenPeriods(canReopen);
    } catch (error) {
      console.error('Error checking user permissions:', error);
      setCanUserReopenPeriods(false);
    }
  }, []);

  const canReopenPeriod = useCallback(async (periodo: string): Promise<{canReopen: boolean, reason?: string, hasVouchers: boolean}> => {
    try {
      const companyId = await PayrollHistoryService.getCurrentUserCompanyId();
      if (!companyId) {
        return { canReopen: false, reason: 'No se encontró la empresa', hasVouchers: false };
      }

      return await PayrollReopenService.canReopenPeriod(periodo, companyId);
    } catch (error) {
      console.error('Error checking if period can be reopened:', error);
      return { canReopen: false, reason: 'Error verificando período', hasVouchers: false };
    }
  }, []);

  const reopenPeriod = useCallback(async (periodo: string): Promise<void> => {
    setIsReopening(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const companyId = await PayrollHistoryService.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se encontró la empresa del usuario');
      }

      const request: ReopenPeriodRequest = {
        periodo,
        companyId,
        userId: user.id,
        userEmail: user.email || ''
      };

      await PayrollReopenService.reopenPeriod(request);

      toast({
        title: "✅ Período reabierto correctamente",
        description: "Ahora puedes editar la nómina. Los cambios se registrarán en el historial.",
      });

    } catch (error: any) {
      console.error('Error reopening period:', error);
      toast({
        title: "Error al reabrir período",
        description: error.message || "No se pudo reabrir el período. Intente nuevamente.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsReopening(false);
    }
  }, []);

  const closePeriodAgain = useCallback(async (periodo: string): Promise<void> => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const companyId = await PayrollHistoryService.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se encontró la empresa del usuario');
      }

      const request: ReopenPeriodRequest = {
        periodo,
        companyId,
        userId: user.id,
        userEmail: user.email || ''
      };

      await PayrollReopenService.closePeriodAgain(request);

      toast({
        title: "Período cerrado nuevamente",
        description: "El período ha sido cerrado correctamente.",
      });

    } catch (error: any) {
      console.error('Error closing period again:', error);
      toast({
        title: "Error al cerrar período",
        description: error.message || "No se pudo cerrar el período.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const closePeriodWithWizard = useCallback(async (periodId: string, wizardSteps: EditWizardSteps): Promise<void> => {
    setIsLoading(true);
    try {
      // Simulación de procesamiento
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const tasks = [];
      
      if (wizardSteps.pilaFile.regenerate) {
        tasks.push("Regenerando archivo PILA...");
      }
      
      if (wizardSteps.payslips.update) {
        tasks.push("Actualizando comprobantes de pago...");
      }

      // Crear log de auditoría
      await createAuditLog({
        periodId,
        action: 'closed',
        userId: 'admin@empresa.com',
        userName: 'Admin Usuario',
        details: `Período cerrado con las siguientes acciones: ${tasks.join(', ')}`
      });

      toast({
        title: "Período procesado exitosamente",
        description: `Se completaron ${tasks.length} tareas de procesamiento`,
      });
    } catch (error) {
      toast({
        title: "Error al procesar período",
        description: "Ocurrió un error durante el procesamiento",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const exportToExcel = useCallback(async (periods: PayrollHistoryPeriod[]): Promise<void> => {
    setIsExporting(true);
    try {
      // Simulación de exportación
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // En un caso real, aquí generaríamos el archivo Excel
      const blob = new Blob(['Datos de períodos...'], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `historial-nomina-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Exportación completada",
        description: `Se exportaron ${periods.length} períodos a Excel`,
      });
    } catch (error) {
      toast({
        title: "Error en la exportación",
        description: "No se pudo exportar el archivo",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, []);

  const downloadFile = useCallback(async (fileUrl: string, fileName: string): Promise<void> => {
    try {
      // Simulación de descarga
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Descarga iniciada",
        description: `Descargando ${fileName}`,
      });
    } catch (error) {
      toast({
        title: "Error en la descarga",
        description: "No se pudo descargar el archivo",
        variant: "destructive",
      });
      throw error;
    }
  }, []);

  const createAuditLog = useCallback(async (log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> => {
    try {
      // Simulación de creación de log
      const auditLog: AuditLog = {
        ...log,
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString()
      };
      
      console.log('Audit log created:', auditLog);
      // En un caso real, aquí enviaríamos el log a la base de datos
    } catch (error) {
      console.error('Error creating audit log:', error);
    }
  }, []);

  const fixSpecificPeriodData = useCallback(async (periodId: string): Promise<boolean> => {
    setIsFixing(true);
    try {
      console.log('🔧 Iniciando corrección específica de período:', periodId);
      
      const result = await PayrollHistoryService.fixSpecificPeriodData(periodId);
      
      if (result.success) {
        toast({
          title: "✅ Período corregido exitosamente",
          description: result.message,
          className: "border-green-200 bg-green-50"
        });
        return true;
      } else {
        toast({
          title: "❌ Error corrigiendo período",
          description: result.message,
          variant: "destructive"
        });
        return false;
      }
    } catch (error: any) {
      console.error('❌ Error en corrección específica:', error);
      toast({
        title: "Error corrigiendo período",
        description: error.message || "No se pudo corregir el período específico",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsFixing(false);
    }
  }, []);

  const regenerateHistoricalData = useCallback(async (periodId: string): Promise<boolean> => {
    setIsRegenerating(true);
    try {
      console.log('🔄 Iniciando regeneración de datos históricos para:', periodId);
      
      const result = await PayrollHistoryService.regenerateHistoricalData(periodId);
      
      if (result.success) {
        toast({
          title: "✅ Datos regenerados exitosamente",
          description: result.message,
          className: "border-green-200 bg-green-50"
        });
        return true;
      } else {
        toast({
          title: "❌ Error regenerando datos",
          description: result.message,
          variant: "destructive"
        });
        return false;
      }
    } catch (error: any) {
      console.error('❌ Error en regeneración:', error);
      toast({
        title: "Error regenerando datos",
        description: error.message || "No se pudieron regenerar los datos históricos",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsRegenerating(false);
    }
  }, []);

  return {
    isLoading,
    isReopening,
    isExporting,
    isRegenerating,
    isFixing,
    canUserReopenPeriods,
    checkUserPermissions,
    reopenPeriod,
    closePeriodAgain,
    canReopenPeriod,
    closePeriodWithWizard,
    exportToExcel,
    downloadFile,
    createAuditLog,
    regenerateHistoricalData,
    fixSpecificPeriodData
  };
};
