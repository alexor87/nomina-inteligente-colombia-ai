import React from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Gift, Package, Percent, LucideIcon } from 'lucide-react';
import { PendingPeriod } from '@/services/SocialBenefitsLiquidationService';
import { PeriodCard } from './PeriodCard';
import { cn } from '@/lib/utils';

type BenefitType = 'prima' | 'cesantias' | 'intereses_cesantias';

interface BenefitSectionProps {
  type: BenefitType;
  periods: PendingPeriod[];
  onLiquidate: (period: PendingPeriod) => void;
  defaultOpen?: boolean;
}

const benefitConfig: Record<BenefitType, {
  title: string;
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
}> = {
  prima: {
    title: 'Prima de Servicios',
    icon: Gift,
    colorClass: 'text-success',
    bgClass: 'bg-success/10'
  },
  cesantias: {
    title: 'Cesantías',
    icon: Package,
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10'
  },
  intereses_cesantias: {
    title: 'Intereses de Cesantías',
    icon: Percent,
    colorClass: 'text-purple-600 dark:text-purple-400',
    bgClass: 'bg-purple-500/10'
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

export const BenefitSection: React.FC<BenefitSectionProps> = ({
  type,
  periods,
  onLiquidate,
  defaultOpen = true
}) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const config = benefitConfig[type];
  const Icon = config.icon;

  const totalAmount = periods.reduce((sum, p) => sum + p.totalAmount, 0);
  const hasOverdue = periods.some(p => p.status === 'overdue');
  const hasUrgent = periods.some(p => p.status === 'urgent');

  if (periods.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <CollapsibleTrigger className="w-full">
        <div className={cn(
          'flex items-center justify-between p-4 rounded-lg border transition-colors',
          'hover:bg-accent/50',
          isOpen ? 'bg-accent/30' : 'bg-card'
        )}>
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', config.bgClass)}>
              <Icon className={cn('h-5 w-5', config.colorClass)} />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-foreground">{config.title}</h3>
              <p className="text-sm text-muted-foreground">
                {periods.length} período{periods.length !== 1 ? 's' : ''} pendiente{periods.length !== 1 ? 's' : ''} 
                <span className="mx-2">•</span>
                <span className="font-medium">{formatCurrency(totalAmount)}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {hasOverdue && (
              <Badge variant="destructive" className="text-xs">
                VENCIDO
              </Badge>
            )}
            {!hasOverdue && hasUrgent && (
              <Badge className="text-xs bg-warning text-warning-foreground">
                URGENTE
              </Badge>
            )}
            <ChevronDown className={cn(
              'h-5 w-5 text-muted-foreground transition-transform duration-200',
              isOpen && 'rotate-180'
            )} />
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pl-4 animate-fade-in">
        {periods.map((period, index) => (
          <PeriodCard
            key={`${period.benefitType}-${period.periodStart}-${index}`}
            period={period}
            onLiquidate={onLiquidate}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};
