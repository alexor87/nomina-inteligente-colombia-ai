import React, { useState } from 'react';
import { Gift, Loader2, AlertTriangle, Clock, CheckCircle2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { SocialBenefitsLiquidationService, type LiquidationPreview, type PendingPeriod, type PendingPeriodStatus } from '@/services/SocialBenefitsLiquidationService';
import { LiquidationPreviewModal } from './LiquidationPreviewModal';
import { usePendingPeriods } from '@/hooks/usePendingPeriods';

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
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Vencido
        </Badge>
      );
    case 'urgent':
      return (
        <Badge variant="warning" className="gap-1">
          <Clock className="h-3 w-3" />
          Urgente
        </Badge>
      );
    case 'current':
      return (
        <Badge variant="info" className="gap-1">
          <Calendar className="h-3 w-3" />
          En período
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Pendiente
        </Badge>
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
      <div key={type} className="space-y-3">
        <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
          <span>{config.icon}</span>
          {config.label}
        </h4>
        <div className="space-y-2">
          {items.map((period) => {
            const periodKey = getPeriodKey(period);
            const isThisPeriodLoading = isLoadingPreview && selectedPeriod && getPeriodKey(selectedPeriod) === periodKey;
            
            return (
              <Card key={periodKey} className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-base">{period.periodLabel}</span>
                        {getStatusBadge(period.status)}
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground space-y-1">
                        <div>{period.employeesCount} empleados</div>
                        <div className="font-bold text-base text-foreground">{formatCurrency(period.totalAmount)}</div>
                        {period.daysUntilDeadline !== undefined && (
                          <div className={period.daysUntilDeadline < 0 ? 'text-destructive font-medium' : period.daysUntilDeadline <= 15 ? 'text-yellow-700 dark:text-yellow-400' : 'text-muted-foreground'}>
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
                </CardContent>
              </Card>
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
            className="border-green-600/30 text-green-700 dark:text-green-400 hover:bg-green-500/10"
          >
            <Gift className="h-4 w-4 mr-2" />
            Prestaciones Sociales
            {stats.totalPending > 0 && (
              <Badge variant="success" className="ml-2">
                {stats.totalPending}
              </Badge>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Gift className="h-5 w-5 text-green-600" />
              Prestaciones Sociales Pendientes
            </DialogTitle>
            <DialogDescription>
              Gestiona y liquida las prestaciones sociales de tus empleados
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
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
              <div className="space-y-5">
                {/* Stats summary */}
                {(stats.overdueCount > 0 || stats.urgentCount > 0) && (
                  <div className="flex gap-2 flex-wrap">
                    {stats.overdueCount > 0 && (
                      <Badge variant="destructive">
                        {stats.overdueCount} vencido{stats.overdueCount > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {stats.urgentCount > 0 && (
                      <Badge variant="warning">
                        {stats.urgentCount} urgente{stats.urgentCount > 1 ? 's' : ''}
                      </Badge>
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
