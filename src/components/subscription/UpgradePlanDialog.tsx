import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Users, FileText, ArrowRight } from 'lucide-react';
import { PLANES_SAAS } from '@/constants';
import { LimitType } from '@/hooks/useSubscriptionLimits';

interface UpgradePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitType: LimitType | null;
  currentPlan: string | null;
  suggestedPlan: typeof PLANES_SAAS[number] | null;
  currentCount?: number | null;
  maxAllowed?: number;
}

export const UpgradePlanDialog: React.FC<UpgradePlanDialogProps> = ({
  open,
  onOpenChange,
  limitType,
  currentPlan,
  suggestedPlan,
  currentCount,
  maxAllowed,
}) => {
  const currentPlanData = PLANES_SAAS.find(p => p.id === currentPlan);
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

  const icon = limitType === 'employees' ? <Users className="h-6 w-6" /> : <FileText className="h-6 w-6" />;
  const title = limitType === 'employees' ? 'Límite de empleados alcanzado' : 'Límite de nóminas alcanzado';
  const description = limitType === 'employees'
    ? `Tu plan actual permite máximo ${maxAllowed} empleados. Actualmente tienes ${currentCount ?? '?'}.`
    : `Has alcanzado el límite de nóminas procesadas este mes en tu plan actual.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>{title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">{description}</p>

          <div className="flex items-center gap-3">
            {currentPlanData && (
              <div className="flex-1 rounded-lg border border-border p-3 text-center">
                <Badge variant="outline" className="mb-1 text-xs">{currentPlanData.nombre}</Badge>
                <p className="text-lg font-semibold text-foreground">{formatCurrency(currentPlanData.precio)}/mes</p>
                <p className="text-xs text-muted-foreground">{currentPlanData.empleados === -1 ? 'Ilimitado' : `${currentPlanData.empleados} empleados`}</p>
              </div>
            )}

            {suggestedPlan && (
              <>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 rounded-lg border-2 border-primary p-3 text-center bg-primary/5">
                  <Badge className="mb-1 text-xs">{suggestedPlan.nombre}</Badge>
                  <p className="text-lg font-semibold text-foreground">{formatCurrency(suggestedPlan.precio)}/mes</p>
                  <p className="text-xs text-muted-foreground">{suggestedPlan.empleados === -1 ? 'Ilimitado' : `${suggestedPlan.empleados} empleados`}</p>
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          <Button
            onClick={() => {
              window.open('mailto:soporte@nominapro.co?subject=Upgrade de plan', '_blank');
              onOpenChange(false);
            }}
          >
            Contactar para upgrade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
