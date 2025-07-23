
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { useVacationConflictDetection } from '@/hooks/useVacationConflictDetection';
import { ConflictResolutionPanel } from '@/components/vacation-integration/ConflictResolutionPanel';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';

interface VacationConflictAlertProps {
  onConflictsResolved?: () => void;
}

export const VacationConflictAlert: React.FC<VacationConflictAlertProps> = ({
  onConflictsResolved
}) => {
  const [showResolutionPanel, setShowResolutionPanel] = useState(false);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const { companyId } = useCurrentCompany();
  
  const conflictHook = useVacationConflictDetection();

  const checkForConflicts = async () => {
    if (!companyId) return;
    
    setIsCheckingConflicts(true);
    try {
      // Verificar conflictos para el período actual
      const currentDate = new Date();
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      await conflictHook.detectConflicts(
        companyId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
    } catch (error) {
      console.error('Error checking conflicts:', error);
    } finally {
      setIsCheckingConflicts(false);
    }
  };

  useEffect(() => {
    checkForConflicts();
  }, [companyId]);

  const handleResolveConflicts = async (resolutions: any[]) => {
    try {
      await conflictHook.resolveConflicts(resolutions);
      setShowResolutionPanel(false);
      onConflictsResolved?.();
    } catch (error) {
      console.error('Error resolving conflicts:', error);
    }
  };

  if (isCheckingConflicts) {
    return (
      <Alert className="border-blue-200 bg-blue-50">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <AlertDescription>
          Verificando consistencia entre vacaciones y novedades...
        </AlertDescription>
      </Alert>
    );
  }

  if (!conflictHook.hasConflicts) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          ✅ No hay conflictos detectados entre vacaciones y novedades
        </AlertDescription>
      </Alert>
    );
  }

  if (showResolutionPanel) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-orange-800">
            Resolución de Conflictos de Vacaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ConflictResolutionPanel
            conflictReport={conflictHook.conflictReport!}
            onResolveConflicts={handleResolveConflicts}
            onCancel={() => setShowResolutionPanel(false)}
            isResolving={conflictHook.isResolving}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Alert className="border-orange-200 bg-orange-50">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <strong className="text-orange-800">Conflictos detectados:</strong>
          <span className="text-orange-700 ml-2">
            {conflictHook.conflictReport?.totalConflicts} inconsistencias entre vacaciones y novedades
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowResolutionPanel(true)}
          className="text-orange-700 border-orange-200 hover:bg-orange-100"
        >
          Resolver Conflictos
        </Button>
      </AlertDescription>
    </Alert>
  );
};
