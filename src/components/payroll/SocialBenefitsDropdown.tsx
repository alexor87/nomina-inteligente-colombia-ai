import React, { useState } from 'react';
import { Gift, Loader2, AlertTriangle, Clock, CheckCircle2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { SocialBenefitsLiquidationService, type LiquidationPreview, type PendingPeriod, type PendingPeriodStatus } from '@/services/SocialBenefitsLiquidationService';
import { LiquidationPreviewModal } from './LiquidationPreviewModal';
import { usePendingPeriods } from '@/hooks/usePendingPeriods';
import type { BenefitType } from '@/types/social-benefits';

interface SocialBenefitsDropdownProps {
  companyId: string;
  employees: { id: string }[];
  disabled?: boolean;
}

type SocialBenefitType = 'prima' | 'cesantias' | 'intereses_cesantias';

const BENEFIT_CONFIG: Record<SocialBenefitType, { label: string; icon: string }> = {
  prima: { label: 'Prima de Servicios', icon: '🎁' },
  cesantias: { label: 'Cesantías', icon: '📦' },
  intereses_cesantias: { label: 'Intereses de Cesantías', icon: '💵' },
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getStatusBadge = (status: PendingPeriodStatus) => {
  switch (status) {
    case 'overdue':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
          <AlertTriangle className="h-3 w-3" />
          Vencido
        </span>
      );
    case 'urgent':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-600">
          <Clock className="h-3 w-3" />
          Urgente
        </span>
      );
    case 'current':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600">
          <Calendar className="h-3 w-3" />
          En período
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
          <CheckCircle2 className="h-3 w-3" />
          Pendiente
        </span>
      );
  }
};

export const SocialBenefitsDropdown: React.FC<SocialBenefitsDropdownProps> = ({
  companyId,
  employees,
  disabled = false,
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PendingPeriod | null>(null);
  const [previewData, setPreviewData] = useState<LiquidationPreview | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const { periods, isLoading, error, refetch, periodsByType, stats } = usePendingPeriods();

  const handleSelectPeriod = async (period: PendingPeriod) => {
    setSelectedPeriod(period);
    setIsLoadingPreview(true);

    try {
      const result = await SocialBenefitsLiquidationService.getPreview(
        companyId,
        period.benefitType,
        period.periodStart,
        period.periodEnd,
        period.periodLabel
      );

      if (!result.success) {
        toast({
          title: 'Error obteniendo preview',
          description: 'error' in result ? result.error : 'Error desconocido',
          variant: 'destructive',
        });
        return;
      }

      if (result.mode === 'preview') {
        setPreviewData(result);
        setShowPreviewModal(true);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error en preview:', error);
      toast({
        title: 'Error',
        description: 'No se pudo obtener la información de liquidación',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleConfirmLiquidation = async (skipOpenPeriods: boolean) => {
    if (!selectedPeriod) return;

    setIsProcessing(true);

    try {
      const result = await SocialBenefitsLiquidationService.liquidate(
        companyId,
        selectedPeriod.benefitType,
        selectedPeriod.periodStart,
        selectedPeriod.periodEnd,
        selectedPeriod.periodLabel,
        skipOpenPeriods
      );

      if (!result.success) {
        toast({
          title: 'Error en liquidación',
          description: 'error' in result ? result.error : 'Error desconocido',
          variant: 'destructive',
        });
        return;
      }

      if (result.mode === 'saved') {
        const config = BENEFIT_CONFIG[selectedPeriod.benefitType];
        toast({
          title: '✅ Liquidación completada',
          description: `${config.label} liquidada para ${result.employeesCount} empleados - Total: ${formatCurrency(result.totalAmount)}`,
        });
        setShowPreviewModal(false);
        setPreviewData(null);
        setSelectedPeriod(null);
        refetch();
      }
    } catch (error) {
      console.error('Error en liquidación:', error);
      toast({
        title: 'Error',
        description: 'No se pudo completar la liquidación',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseModal = () => {
    if (!isProcessing) {
      setShowPreviewModal(false);
      setPreviewData(null);
      setSelectedPeriod(null);
    }
  };

  if (employees.length === 0) return null;

  const sortedPeriods = [...periods].sort((a, b) => {
    const priority: Record<PendingPeriodStatus, number> = { overdue: 0, urgent: 1, current: 2, future: 3 };
    return priority[a.status] - priority[b.status];
  });

  const getPeriodKey = (period: PendingPeriod) => `${period.benefitType}-${period.periodStart}-${period.periodEnd}`;

  const renderBenefitSection = (type: SocialBenefitType, items: PendingPeriod[]) => {
    if (items.length === 0) return null;
    const config = BENEFIT_CONFIG[type];
    
    return (
      <div key={type} className="space-y-2">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
          <span>{config.icon}</span>
          {config.label}
        </h4>
        <div className="space-y-2">
          {items.map((period) => {
            const periodKey = getPeriodKey(period);
            const isThisPeriodLoading = isLoadingPreview && selectedPeriod && getPeriodKey(selectedPeriod) === periodKey;
            
            return (
              <div
                key={periodKey}
                className="p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{period.periodLabel}</span>
                      {getStatusBadge(period.status)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                      <div>{period.employeesCount} empleados</div>
                      <div className="font-medium text-foreground">{formatCurrency(period.totalAmount)}</div>
                      {period.daysUntilDeadline !== undefined && (
                        <div className={period.daysUntilDeadline < 0 ? 'text-destructive' : period.daysUntilDeadline <= 15 ? 'text-yellow-600' : ''}>
                          {period.daysUntilDeadline < 0 
                            ? `Venció hace ${Math.abs(period.daysUntilDeadline)} días`
                            : period.daysUntilDeadline === 0
                            ? 'Vence hoy'
                            : `Vence en ${period.daysUntilDeadline} días`
                          }
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleSelectPeriod(period)}
                    disabled={isLoadingPreview}
                    className="shrink-0"
                  >
                    {isThisPeriodLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Liquidar'
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="text-green-700 border-green-300 hover:bg-green-100"
          >
            <Gift className="h-4 w-4 mr-2" />
            Prestaciones Sociales
            {stats.totalPending > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-green-600 text-white">
                {stats.totalPending}
              </span>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-green-600" />
              Prestaciones Sociales Pendientes
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-8 w-8 mx-auto text-destructive mb-2" />
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Reintentar
                </Button>
              </div>
            ) : periods.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-8 w-8 mx-auto text-green-600 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No tienes prestaciones pendientes
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Stats summary */}
                {(stats.overdueCount > 0 || stats.urgentCount > 0) && (
                  <div className="flex gap-2 flex-wrap">
                    {stats.overdueCount > 0 && (
                      <div className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium">
                        {stats.overdueCount} vencido{stats.overdueCount > 1 ? 's' : ''}
                      </div>
                    )}
                    {stats.urgentCount > 0 && (
                      <div className="px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-600 text-xs font-medium">
                        {stats.urgentCount} urgente{stats.urgentCount > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                )}

                {/* Sections by benefit type */}
                {renderBenefitSection('prima', periodsByType.prima)}
                {renderBenefitSection('cesantias', periodsByType.cesantias)}
                {renderBenefitSection('intereses_cesantias', periodsByType.intereses_cesantias)}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <LiquidationPreviewModal
        isOpen={showPreviewModal}
        onClose={handleCloseModal}
        onConfirm={handleConfirmLiquidation}
        preview={previewData}
        benefitLabel={selectedPeriod ? BENEFIT_CONFIG[selectedPeriod.benefitType].label : ''}
        benefitIcon={selectedPeriod ? BENEFIT_CONFIG[selectedPeriod.benefitType].icon : ''}
        benefitType={selectedPeriod?.benefitType}
        isProcessing={isProcessing}
      />
    </>
  );
};
