import React from 'react';
import { Gift, Wallet, Percent, Calendar, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface LiquidationHeroProps {
  benefitType: 'prima' | 'cesantias' | 'intereses_cesantias';
  benefitLabel: string;
  periodLabel: string;
  description: string;
  periodStart?: string;
  periodEnd?: string;
  legalDeadline?: string;
}

const BENEFIT_ICONS = {
  prima: Gift,
  cesantias: Wallet,
  intereses_cesantias: Percent,
};

const BENEFIT_COLORS = {
  prima: 'text-green-600 bg-green-100 dark:bg-green-900/30',
  cesantias: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  intereses_cesantias: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
};

const formatShortDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  try {
    return format(parseISO(dateStr), "d MMM yyyy", { locale: es });
  } catch {
    return dateStr;
  }
};

const getDeadlineStatus = (legalDeadline?: string) => {
  if (!legalDeadline) return null;
  try {
    const deadline = parseISO(legalDeadline);
    const today = new Date();
    const daysUntil = differenceInDays(deadline, today);
    
    if (daysUntil < 0) {
      return { status: 'overdue', label: 'Vencido', className: 'bg-destructive/10 text-destructive border-destructive/20' };
    } else if (daysUntil <= 7) {
      return { status: 'urgent', label: 'Vence pronto', className: 'bg-destructive/10 text-destructive border-destructive/20 animate-pulse' };
    } else if (daysUntil <= 30) {
      return { status: 'warning', label: 'Próximo a vencer', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200' };
    }
    return null;
  } catch {
    return null;
  }
};

export const LiquidationHero: React.FC<LiquidationHeroProps> = ({
  benefitType,
  benefitLabel,
  periodLabel,
  description,
  periodStart,
  periodEnd,
  legalDeadline,
}) => {
  const Icon = BENEFIT_ICONS[benefitType] || Gift;
  const colorClass = BENEFIT_COLORS[benefitType] || BENEFIT_COLORS.prima;
  const deadlineStatus = getDeadlineStatus(legalDeadline);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row items-start gap-6 p-6">
          {/* Icon container */}
          <div className={`p-4 rounded-2xl ${colorClass}`}>
            <Icon className="h-12 w-12" />
          </div>

          {/* Content */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">
                {benefitLabel}
              </h1>
              <span className="px-3 py-1 bg-accent text-accent-foreground rounded-full text-sm font-medium">
                {periodLabel}
              </span>
            </div>
            <p className="text-muted-foreground leading-relaxed max-w-2xl">
              {description}
            </p>
            
            {/* Period dates row */}
            {(periodStart || periodEnd || legalDeadline) && (
              <div className="flex flex-wrap items-center gap-4 pt-2 text-sm">
                {periodStart && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Inicio: <span className="font-medium text-foreground">{formatShortDate(periodStart)}</span></span>
                  </div>
                )}
                {periodEnd && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Fin: <span className="font-medium text-foreground">{formatShortDate(periodEnd)}</span></span>
                  </div>
                )}
                {legalDeadline && (
                  <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border ${deadlineStatus?.className || 'text-muted-foreground'}`}>
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Límite: <span className="font-medium">{formatShortDate(legalDeadline)}</span></span>
                    {deadlineStatus && (
                      <span className="text-xs font-medium ml-1">({deadlineStatus.label})</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
