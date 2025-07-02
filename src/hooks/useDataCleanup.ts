
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { DataCleanupService, CleanupReport } from '@/services/payroll-intelligent/DataCleanupService';

export const useDataCleanup = () => {
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupReport, setCleanupReport] = useState<CleanupReport | null>(null);
  const { toast } = useToast();

  const executeCleanup = async (companyIdentifier: string) => {
    try {
      setIsCleaningUp(true);
      console.log('🚀 Starting cleanup process for:', companyIdentifier);
      
      toast({
        title: "Iniciando limpieza...",
        description: "Eliminando todos los datos de empleados y nóminas",
      });

      const report = await DataCleanupService.executeCompleteCleanup(companyIdentifier);
      setCleanupReport(report);

      if (report.success) {
        toast({
          title: "✅ Limpieza completada exitosamente",
          description: `Se eliminaron ${report.results.employees.deleted} empleados y ${report.results.payrolls.deleted} registros de nómina`,
          className: "border-green-200 bg-green-50"
        });
      } else {
        toast({
          title: "❌ Error en la limpieza",
          description: report.errors.join(', '),
          variant: "destructive"
        });
      }

      return report;
    } catch (error) {
      console.error('Error during cleanup:', error);
      toast({
        title: "Error crítico",
        description: "No se pudo completar la limpieza de datos",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsCleaningUp(false);
    }
  };

  const verifyCleanup = async (companyId: string) => {
    try {
      const verification = await DataCleanupService.verifyCleanup(companyId);
      
      if (verification.isEmpty) {
        toast({
          title: "✅ Verificación exitosa",
          description: "No se encontraron datos residuales",
          className: "border-green-200 bg-green-50"
        });
      } else {
        toast({
          title: "⚠️ Datos residuales encontrados",
          description: `Empleados: ${verification.remainingData.employees}, Nóminas: ${verification.remainingData.payrolls}`,
          variant: "destructive"
        });
      }

      return verification;
    } catch (error) {
      console.error('Error during verification:', error);
      toast({
        title: "Error en verificación",
        description: "No se pudo verificar la limpieza",
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    isCleaningUp,
    cleanupReport,
    executeCleanup,
    verifyCleanup
  };
};
