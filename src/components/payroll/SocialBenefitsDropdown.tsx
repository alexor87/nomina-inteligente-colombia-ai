import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, ChevronRight, Loader2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePendingPeriods } from '@/hooks/usePendingPeriods';

interface SocialBenefitsDropdownProps {
  companyId: string;
  employees: { id: string }[];
  disabled?: boolean;
  activeYear?: number;
}

type SocialBenefitType = 'prima' | 'cesantias' | 'intereses_cesantias';

const BENEFIT_CONFIG: Record<SocialBenefitType, { label: string; icon: string; shortLabel: string }> = {
  prima: { label: 'Prima de Servicios', icon: '🎁', shortLabel: 'Prima' },
  cesantias: { label: 'Cesantías', icon: '📦', shortLabel: 'Cesantías' },
  intereses_cesantias: { label: 'Intereses de Cesantías', icon: '💵', shortLabel: 'Intereses' },
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const SocialBenefitsDropdown: React.FC<SocialBenefitsDropdownProps> = ({
  companyId,
  employees,
  disabled = false,
  activeYear,
}) => {
  const navigate = useNavigate();
  const { periods, isLoading, periodsByType, stats } = usePendingPeriods();

  if (employees.length === 0) return null;

  // Filter periods by active year if provided
  const filterByYear = (items: typeof periods) => {
    if (!activeYear) return items;
    return items.filter(p => {
      const year = new Date(p.periodStart).getFullYear();
      return year === activeYear;
    });
  };

  const filteredPeriodsByType = {
    prima: filterByYear(periodsByType.prima),
    cesantias: filterByYear(periodsByType.cesantias),
    intereses_cesantias: filterByYear(periodsByType.intereses_cesantias),
  };

  const filteredTotalPending = 
    filteredPeriodsByType.prima.length + 
    filteredPeriodsByType.cesantias.length + 
    filteredPeriodsByType.intereses_cesantias.length;

  const handleNavigateToLiquidation = (benefitType: SocialBenefitType, periodLabel: string) => {
    // Encode the period label for URL
    const encodedPeriod = encodeURIComponent(periodLabel);
    navigate(`/modules/prestaciones-sociales/liquidar/${benefitType}/${encodedPeriod}`);
  };

  const renderBenefitItems = (type: SocialBenefitType) => {
    const items = filteredPeriodsByType[type];
    const config = BENEFIT_CONFIG[type];

    if (items.length === 0) return null;

    return items.map((period) => (
      <DropdownMenuItem
        key={`${type}-${period.periodLabel}`}
        onClick={() => handleNavigateToLiquidation(type, period.periodLabel)}
        className="flex items-center justify-between gap-4 cursor-pointer py-3"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{config.icon}</span>
          <div>
            <p className="font-medium">{config.label}</p>
            <p className="text-xs text-muted-foreground">{period.periodLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-sm font-semibold">{formatCurrency(period.totalAmount)}</p>
            <p className="text-xs text-muted-foreground">{period.employeesCount} empleados</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </DropdownMenuItem>
    ));
  };

  const hasPendingPeriods = filteredTotalPending > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="border-green-600/30 text-green-700 dark:text-green-400 hover:bg-green-500/10"
        >
          <Gift className="h-4 w-4 mr-2" />
          Prestaciones Sociales
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-popover">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Prestaciones Pendientes
          {activeYear && (
            <Badge variant="outline" className="ml-1 text-xs">
              {activeYear}
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !hasPendingPeriods ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              No hay prestaciones pendientes
            </p>
          </div>
        ) : (
          <>
            {renderBenefitItems('prima')}
            {filteredPeriodsByType.prima.length > 0 && (filteredPeriodsByType.cesantias.length > 0 || filteredPeriodsByType.intereses_cesantias.length > 0) && (
              <DropdownMenuSeparator />
            )}
            {renderBenefitItems('cesantias')}
            {filteredPeriodsByType.cesantias.length > 0 && filteredPeriodsByType.intereses_cesantias.length > 0 && (
              <DropdownMenuSeparator />
            )}
            {renderBenefitItems('intereses_cesantias')}
          </>
        )}

      </DropdownMenuContent>
    </DropdownMenu>
  );
};
