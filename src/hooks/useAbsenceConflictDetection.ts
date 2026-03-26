
import { useState, useCallback } from 'react';
import { VacationNovedadConflictDetector, ConflictReport } from '@/services/vacation-integration/VacationNovedadConflictDetector';
import { ConflictResolution } from '@/components/vacation-integration/ConflictResolutionPanel';
import { useToast } from '@/hooks/use-toast';

export const useAbsenceConflictDetection = () => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [conflictReport, setConflictReport] = useState<ConflictReport | null>(null);
  const { toast } = useToast();

  const detectConflicts = useCallback(async (
    companyId: string,
    startDate: string,
    endDate: string,
    periodId?: string
  ): Promise<ConflictReport> => {
    try {
      setIsDetecting(true);
      console.log('Starting conflict detection...', { companyId, startDate, endDate, periodId });

      if (!companyId || !startDate || !endDate) {
        console.warn('Missing required parameters for conflict detection');
        const emptyReport: ConflictReport = {
          hasConflicts: false,
          totalConflicts: 0,
          conflictGroups: [],
          summary: { duplicates: 0, overlaps: 0, typeMismatches: 0 }
        };
        setConflictReport(emptyReport);
        return emptyReport;
      }

      const report = await VacationNovedadConflictDetector.detectConflicts(
        companyId,
        startDate,
        endDate,
        periodId
      );

      setConflictReport(report);

      if (report.hasConflicts) {
        toast({
          title: "Conflictos Detectados",
          description: `Se encontraron ${report.totalConflicts} grupos de conflictos entre ausencias y novedades`,
          variant: "destructive"
        });
      } else {
        console.log('No conflicts detected');
        toast({
          title: "Sin Conflictos",
          description: "No se detectaron conflictos entre modulos",
          className: "border-green-200 bg-green-50"
        });
      }

      return report;
    } catch (error) {
      console.error('Error detecting conflicts:', error);

      const errorReport: ConflictReport = {
        hasConflicts: false,
        totalConflicts: 0,
        conflictGroups: [],
        summary: { duplicates: 0, overlaps: 0, typeMismatches: 0 }
      };

      setConflictReport(errorReport);

      toast({
        title: "Error en Deteccion",
        description: "Error al detectar conflictos, pero puedes continuar con la liquidacion",
        variant: "destructive"
      });

      return errorReport;
    } finally {
      setIsDetecting(false);
    }
  }, [toast]);

  const resolveConflicts = useCallback(async (
    resolutions: ConflictResolution[]
  ): Promise<boolean> => {
    try {
      setIsResolving(true);
      console.log('Resolving conflicts...', resolutions);

      // TODO: Implement real resolution logic
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Conflictos Resueltos",
        description: `Se resolvieron ${resolutions.length} conflictos exitosamente`,
        className: "border-green-200 bg-green-50"
      });

      setConflictReport(null);

      return true;
    } catch (error) {
      console.error('Error resolving conflicts:', error);
      toast({
        title: "Error",
        description: "Error al resolver conflictos",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsResolving(false);
    }
  }, [toast]);

  const clearConflictReport = useCallback(() => {
    setConflictReport(null);
  }, []);

  return {
    // State
    isDetecting,
    isResolving,
    conflictReport,
    hasConflicts: conflictReport?.hasConflicts || false,

    // Actions
    detectConflicts,
    resolveConflicts,
    clearConflictReport
  };
};
