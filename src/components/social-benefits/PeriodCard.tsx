import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, AlertTriangle, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { PendingPeriod, PendingPeriodStatus } from '@/services/SocialBenefitsLiquidationService';
import { cn } from '@/lib/utils';

interface PeriodCardProps {
  period: PendingPeriod;
  onLiquidate: (period: PendingPeriod) => void;
}

const statusConfig: Record<PendingPeriodStatus, {
  label: string;
  variant: 'destructive' | 'default' | 'secondary' | 'outline';
  icon: React.ElementType;
  bgClass: string;
  borderClass: string;
  textClass: string;
}> = {
  overdue: {
    label: 'VENCIDO',
    variant: 'destructive',
    icon: AlertTriangle,
    bgClass: 'bg-destructive/5 dark:bg-destructive/10',
    borderClass: 'border-destructive/30 hover:border-destructive/50',
    textClass: 'text-destructive'
  },
  urgent: {
    label: 'URGENTE',
    variant: 'default',
    icon: Clock,
    bgClass: 'bg-warning/5 dark:bg-warning/10',
    borderClass: 'border-warning/30 hover:border-warning/50',
    textClass: 'text-warning dark:text-warning-foreground'
  },
  current: {
    label: 'EN PERÍODO',
    variant: 'secondary',
    icon: CheckCircle,
    bgClass: 'bg-success/5 dark:bg-success/10',
    borderClass: 'border-success/30 hover:border-success/50',
    textClass: 'text-success'
  },
  future: {
    label: 'PRÓXIMO',
    variant: 'outline',
    icon: Calendar,
    bgClass: 'bg-muted/50',
    borderClass: 'border-border hover:border-muted-foreground/30',
    textClass: 'text-muted-foreground'
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatDeadline = (deadline: string, daysUntil: number) => {
  const date = new Date(deadline);
  const formatted = date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  
  if (daysUntil < 0) {
    return `Venció hace ${Math.abs(daysUntil)} días`;
  } else if (daysUntil === 0) {
    return 'Vence hoy';
  } else if (daysUntil === 1) {
    return 'Vence mañana';
  } else if (daysUntil <= 7) {
    return `Vence en ${daysUntil} días`;
  }
  return `Límite: ${formatted}`;
};

export const PeriodCard: React.FC<PeriodCardProps> = ({ period, onLiquidate }) => {
  const config = statusConfig[period.status];
  const StatusIcon = config.icon;

  return (
    <Card 
      className={cn(
        'transition-all duration-200 border-2 cursor-pointer group',
        config.bgClass,
        config.borderClass,
        'hover:shadow-md hover:scale-[1.01]'
      )}
      onClick={() => onLiquidate(period)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left side - Period info */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Header with badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge 
                variant={config.variant}
                className="flex items-center gap-1 text-xs font-semibold"
              >
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </Badge>
              <span className="text-sm font-medium text-foreground">
                {period.periodLabel}
              </span>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{period.employeesCount} empleado{period.employeesCount !== 1 ? 's' : ''}</span>
              </div>
              <div className={cn('flex items-center gap-1.5 text-xs', config.textClass)}>
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDeadline(period.legalDeadline, period.daysUntilDeadline)}</span>
              </div>
            </div>

            {/* Amount */}
            <div className="text-lg font-bold text-foreground">
              {formatCurrency(period.totalAmount)}
            </div>
          </div>

          {/* Right side - Action */}
          <div className="flex-shrink-0">
            <Button 
              variant="ghost" 
              size="sm"
              className={cn(
                'opacity-70 group-hover:opacity-100 transition-opacity',
                config.textClass
              )}
              onClick={(e) => {
                e.stopPropagation();
                onLiquidate(period);
              }}
            >
              Liquidar
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
