import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useStalePayrollSync } from '@/hooks/useStalePayrollSync';
import { useAuth } from '@/contexts/AuthContext';

interface StalePayrollAlertProps {
  periodId?: string;
  onClose?: () => void;
  autoRefresh?: boolean;
}

export const StalePayrollAlert: React.FC<StalePayrollAlertProps> = ({
  periodId,
  onClose,
  autoRefresh = true
}) => {
  const { profile } = useAuth();
  const { stalePayrolls, loading, syncing, getStalePayrolls, syncStalePayrolls } = useStalePayrollSync();

  useEffect(() => {
    if (profile?.company_id && autoRefresh) {
      getStalePayrolls(profile.company_id);
    }
  }, [profile?.company_id, autoRefresh]);

  const handleSync = async () => {
    if (!profile?.company_id) return;
    await syncStalePayrolls(profile.company_id, periodId);
  };

  // Filter stale payrolls for specific period if provided
  const relevantStalePayrolls = periodId 
    ? stalePayrolls.filter(sp => sp.period_id === periodId)
    : stalePayrolls;

  // Solo mostrar si realmente hay registros desactualizados después de un tiempo
  // para evitar mostrar alertas innecesarias durante flujos normales
  if (loading || relevantStalePayrolls.length === 0) {
    return null;
  }
  
  // Evitar mostrar la alerta inmediatamente después de cambios
  // Solo mostrar si los registros han estado desactualizados por más de 10 segundos
  const hasOldStaleRecords = relevantStalePayrolls.some(sp => {
    const updatedAt = new Date(sp.updated_at);
    const tenSecondsAgo = new Date(Date.now() - 10000);
    return updatedAt < tenSecondsAgo;
  });
  
  if (!hasOldStaleRecords) {
    return null;
  }

  return (
    <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800 mb-4">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex-1">
          <div className="font-medium text-amber-800 dark:text-amber-200 mb-1">
            Cambios pendientes de sincronización
          </div>
          <div className="text-sm text-amber-700 dark:text-amber-300">
            {relevantStalePayrolls.length === 1 
              ? `1 registro de nómina tiene cambios sin sincronizar`
              : `${relevantStalePayrolls.length} registros de nómina tienen cambios sin sincronizar`
            }
          </div>
          {relevantStalePayrolls.length <= 3 && (
            <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Empleados: {relevantStalePayrolls.map(sp => sp.employee_name).join(', ')}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Button
            onClick={handleSync}
            disabled={syncing}
            size="sm"
            variant="outline"
            className="bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200 dark:bg-amber-900 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-800"
          >
            {syncing ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1" />
                Sincronizar
              </>
            )}
          </Button>
          {onClose && (
            <Button
              onClick={onClose}
              size="sm"
              variant="ghost"
              className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 p-1"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};