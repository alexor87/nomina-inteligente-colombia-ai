
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { DataCleanupService, CleanupReport, DiagnosticData } from '@/services/payroll-intelligent/DataCleanupService';

export const useDataCleanup = () => {
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [cleanupReport, setCleanupReport] = useState<CleanupReport | null>(null);
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticData | null>(null);
  const { toast } = useToast();

  const runDiagnostic = async (companyIdentifier: string) => {
    try {
      setIsDiagnosing(true);
      console.log('🔍 Ejecutando diagnóstico para:', companyIdentifier);
      
      // Buscar empresa
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id, razon_social')
        .or(`razon_social.ilike.%${companyIdentifier}%,nit.eq.${companyIdentifier}`)
        .single();

      if (companyError || !company) {
        throw new Error(`Empresa no encontrada: ${companyIdentifier}`);
      }

      const diagnostic = await DataCleanupService.getDiagnosticData(company.id);
      setDiagnosticData(diagnostic);
      
      const totalRecords = Object.values(diagnostic).reduce((sum, count) => sum + count, 0);
      
      toast({
        title: "📊 Diagnóstico completado",
        description: `Se encontraron ${totalRecords} registros en total`,
        className: totalRecords > 0 ? "border-orange-200 bg-orange-50" : "border-green-200 bg-green-50"
      });

      return diagnostic;
    } catch (error) {
      console.error('Error en diagnóstico:', error);
      toast({
        title: "Error en diagnóstico",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsDiagnosing(false);
    }
  };

  const executeAggressiveCleanup = async (companyIdentifier: string) => {
    try {
      setIsCleaningUp(true);
      console.log('💥 Iniciando limpieza agresiva para:', companyIdentifier);
      
      toast({
        title: "🚨 Iniciando limpieza DEFINITIVA...",
        description: "Eliminando TODOS los datos de empleados, nóminas y registros relacionados",
        className: "border-red-200 bg-red-50"
      });

      const report = await DataCleanupService.executeAggressiveCleanup(companyIdentifier);
      setCleanupReport(report);

      if (report.success) {
        const totalDeleted = Object.values(report.results).reduce((sum, r) => sum + r.deleted, 0);
        toast({
          title: "✅ ¡LIMPIEZA DEFINITIVA COMPLETADA!",
          description: `Se eliminaron ${totalDeleted} registros. La cuenta está ahora completamente limpia.`,
          className: "border-green-200 bg-green-50"
        });
      } else {
        const totalRemaining = Object.values(report.results).reduce((sum, r) => sum + r.after, 0);
        toast({
          title: "⚠️ Limpieza parcial",
          description: `Quedan ${totalRemaining} registros. Ver detalles para más información.`,
          variant: "destructive"
        });
      }

      return report;
    } catch (error) {
      console.error('Error durante limpieza agresiva:', error);
      toast({
        title: "Error crítico en limpieza",
        description: "No se pudo completar la limpieza agresiva",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsCleaningUp(false);
    }
  };

  const executeEmergencyCleanup = async (companyIdentifier: string) => {
    try {
      setIsCleaningUp(true);
      console.log('🚨 Iniciando limpieza de emergencia para:', companyIdentifier);
      
      toast({
        title: "🚨 Limpieza de emergencia...",
        description: "Eliminando empleados uno por uno como último recurso",
        className: "border-red-200 bg-red-50"
      });

      // Buscar empresa
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id, razon_social')
        .or(`razon_social.ilike.%${companyIdentifier}%,nit.eq.${companyIdentifier}`)
        .single();

      if (companyError || !company) {
        throw new Error(`Empresa no encontrada: ${companyIdentifier}`);
      }

      const result = await DataCleanupService.emergencyCleanup(company.id);
      
      if (result.success && result.deletedIds.length > 0) {
        toast({
          title: "✅ Limpieza de emergencia exitosa",
          description: `Se eliminaron ${result.deletedIds.length} empleados individualmente`,
          className: "border-green-200 bg-green-50"
        });
      } else if (result.errors.length > 0) {
        toast({
          title: "⚠️ Limpieza parcial",
          description: `${result.deletedIds.length} eliminados, ${result.errors.length} errores`,
          variant: "destructive"
        });
      }

      return result;
    } catch (error) {
      console.error('Error durante limpieza de emergencia:', error);
      toast({
        title: "Error en limpieza de emergencia",
        description: "Falló la limpieza individual",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsCleaningUp(false);
    }
  };

  const verifyCleanup = async (companyIdentifier: string) => {
    try {
      // Buscar empresa
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id, razon_social')
        .or(`razon_social.ilike.%${companyIdentifier}%,nit.eq.${companyIdentifier}`)
        .single();

      if (companyError || !company) {
        throw new Error(`Empresa no encontrada: ${companyIdentifier}`);
      }

      const verification = await DataCleanupService.verifyCompleteCleanup(company.id);
      
      if (verification.isEmpty) {
        toast({
          title: "✅ Verificación exitosa",
          description: "✨ La cuenta está completamente limpia - como nueva ✨",
          className: "border-green-200 bg-green-50"
        });
      } else {
        const total = Object.values(verification.remainingData).reduce((sum, count) => sum + count, 0);
        toast({
          title: "⚠️ Datos residuales encontrados",
          description: `Aún quedan ${total} registros sin eliminar`,
          variant: "destructive"
        });
      }

      return verification;
    } catch (error) {
      console.error('Error durante verificación:', error);
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
    isDiagnosing,
    cleanupReport,
    diagnosticData,
    runDiagnostic,
    executeAggressiveCleanup,
    executeEmergencyCleanup,
    verifyCleanup
  };
};
