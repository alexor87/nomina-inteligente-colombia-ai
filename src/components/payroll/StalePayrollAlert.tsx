import React, { useEffect, useRef } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useStalePayrollSync } from '@/hooks/useStalePayrollSync';
import { useAuth } from '@/contexts/AuthContext';

interface StalePayrollAlertProps {
  periodId?: string;
  autoRefresh?: boolean;
}

export const StalePayrollAlert: React.FC<StalePayrollAlertProps> = ({
  periodId,
  autoRefresh = true
}) => {
  const { profile } = useAuth();
  const { stalePayrolls, loading, syncing, getStalePayrolls, autoSyncStalePayrolls } = useStalePayrollSync();
  const autoSyncRef = useRef(false);

  useEffect(() => {
    if (profile?.company_id && autoRefresh) {
      getStalePayrolls(profile.company_id);
    }
  }, [profile?.company_id, autoRefresh]);

  // Filter stale payrolls for specific period if provided
  const relevantStalePayrolls = periodId 
    ? stalePayrolls.filter(sp => sp.period_id === periodId)
    : stalePayrolls;

  // Check if records are old enough to trigger auto-sync
  const hasOldStaleRecords = relevantStalePayrolls.some(sp => {
    const updatedAt = new Date(sp.updated_at);
    const tenSecondsAgo = new Date(Date.now() - 10000);
    return updatedAt < tenSecondsAgo;
  });

  // Auto-sync when there are old stale records
  useEffect(() => {
    const performAutoSync = async () => {
      if (
        profile?.company_id && 
        hasOldStaleRecords && 
        !syncing && 
        !autoSyncRef.current &&
        relevantStalePayrolls.length > 0
      ) {
        autoSyncRef.current = true;
        await autoSyncStalePayrolls(profile.company_id, periodId);
        autoSyncRef.current = false;
      }
    };

    performAutoSync();
  }, [profile?.company_id, hasOldStaleRecords, syncing, relevantStalePayrolls.length, periodId]);

  // Don't show if loading, no records, or records are too new
  if (loading || relevantStalePayrolls.length === 0 || !hasOldStaleRecords) {
    return null;
  }

  return (
    <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800 mb-4">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex-1">
          <div className="font-medium text-amber-800 dark:text-amber-200 mb-1">
            {syncing ? 'Sincronizando cambios...' : 'Cambios pendientes de sincronización'}
          </div>
          <div className="text-sm text-amber-700 dark:text-amber-300">
            {syncing ? (
              'Actualizando registros de nómina...'
            ) : (
              relevantStalePayrolls.length === 1 
                ? `1 registro de nómina tiene cambios sin sincronizar`
                : `${relevantStalePayrolls.length} registros de nómina tienen cambios sin sincronizar`
            )}
          </div>
          {!syncing && relevantStalePayrolls.length <= 3 && (
            <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Empleados: {relevantStalePayrolls.map(sp => sp.employee_name).join(', ')}
            </div>
          )}
        </div>
        {syncing && (
          <div className="flex items-center ml-4">
            <RefreshCw className="h-4 w-4 text-amber-600 dark:text-amber-400 animate-spin" />
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};