import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle2, TrendingUp, Users } from 'lucide-react';
import { usePendingPeriods } from '@/hooks/usePendingPeriods';
import { PendingPeriod } from '@/services/SocialBenefitsLiquidationService';
import { BenefitSection } from './BenefitSection';
import { cn } from '@/lib/utils';

interface PendingLiquidationsPanelProps {
  onSelectPeriod: (period: PendingPeriod) => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Loading skeleton
const LoadingSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-20 w-full" />
    <Skeleton className="h-16 w-full" />
    <Skeleton className="h-16 w-full" />
    <Skeleton className="h-16 w-full" />
  </div>
);

// Empty state when everything is up to date
const EmptyState = () => (
  <Card className="border-2 border-dashed border-success/30 bg-success/5">
    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-4 rounded-full bg-success/10 mb-4">
        <CheckCircle2 className="h-10 w-10 text-success" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        ¡Todo al día!
      </h3>
      <p className="text-muted-foreground max-w-md">
        No tienes prestaciones sociales pendientes por liquidar. 
        Las nuevas provisiones aparecerán aquí automáticamente al cerrar períodos de nómina.
      </p>
    </CardContent>
  </Card>
);

// Stats cards
const StatsBar: React.FC<{
  totalPending: number;
  overdueCount: number;
  urgentCount: number;
  totalAmount: number;
}> = ({ totalPending, overdueCount, urgentCount, totalAmount }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
    <Card className="bg-card border">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          <TrendingUp className="h-4 w-4" />
          Pendientes
        </div>
        <div className="text-2xl font-bold text-foreground">{totalPending}</div>
      </CardContent>
    </Card>
    
    {overdueCount > 0 && (
      <Card className="bg-destructive/5 border-destructive/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-destructive text-sm mb-1">
            <AlertTriangle className="h-4 w-4" />
            Vencidos
          </div>
          <div className="text-2xl font-bold text-destructive">{overdueCount}</div>
        </CardContent>
      </Card>
    )}
    
    {urgentCount > 0 && overdueCount === 0 && (
      <Card className="bg-warning/5 border-warning/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-warning dark:text-warning-foreground text-sm mb-1">
            <AlertTriangle className="h-4 w-4" />
            Urgentes
          </div>
          <div className="text-2xl font-bold text-warning dark:text-warning-foreground">{urgentCount}</div>
        </CardContent>
      </Card>
    )}
    
    <Card className={cn("bg-card border", overdueCount === 0 && urgentCount === 0 && "col-span-2")}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          <Users className="h-4 w-4" />
          Monto Total
        </div>
        <div className="text-xl font-bold text-foreground truncate">
          {formatCurrency(totalAmount)}
        </div>
      </CardContent>
    </Card>
  </div>
);

export const PendingLiquidationsPanel: React.FC<PendingLiquidationsPanelProps> = ({
  onSelectPeriod
}) => {
  const { 
    isLoading, 
    error, 
    periodsByType, 
    stats 
  } = usePendingPeriods();

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (stats.totalPending === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      {/* Alert banner for overdue/urgent */}
      {stats.overdueCount > 0 && (
        <Alert variant="destructive" className="border-2">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-base font-semibold">
            ¡Atención! Tienes {stats.overdueCount} período{stats.overdueCount !== 1 ? 's' : ''} vencido{stats.overdueCount !== 1 ? 's' : ''}
          </AlertTitle>
          <AlertDescription>
            Estas prestaciones ya pasaron su fecha límite legal. Te recomendamos liquidarlas lo antes posible.
          </AlertDescription>
        </Alert>
      )}

      {stats.overdueCount === 0 && stats.urgentCount > 0 && (
        <Alert className="border-2 border-warning/50 bg-warning/5 text-warning-foreground">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <AlertTitle className="text-base font-semibold">
            {stats.urgentCount} período{stats.urgentCount !== 1 ? 's' : ''} próximo{stats.urgentCount !== 1 ? 's' : ''} a vencer
          </AlertTitle>
          <AlertDescription className="text-muted-foreground">
            Tienes prestaciones que vencen en los próximos 30 días. Planifica su liquidación.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats bar */}
      <StatsBar {...stats} />

      {/* Benefit sections */}
      <div className="space-y-4">
        <BenefitSection
          type="prima"
          periods={periodsByType.prima}
          onLiquidate={onSelectPeriod}
          defaultOpen={periodsByType.prima.some(p => p.status === 'overdue' || p.status === 'urgent')}
        />
        <BenefitSection
          type="cesantias"
          periods={periodsByType.cesantias}
          onLiquidate={onSelectPeriod}
          defaultOpen={periodsByType.cesantias.some(p => p.status === 'overdue' || p.status === 'urgent')}
        />
        <BenefitSection
          type="intereses_cesantias"
          periods={periodsByType.intereses_cesantias}
          onLiquidate={onSelectPeriod}
          defaultOpen={periodsByType.intereses_cesantias.some(p => p.status === 'overdue' || p.status === 'urgent')}
        />
      </div>
    </div>
  );
};
