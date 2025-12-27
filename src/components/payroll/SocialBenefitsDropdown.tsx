import React, { useState } from 'react';
import { Gift, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { SocialBenefitsLiquidationService, type LiquidationPreview } from '@/services/SocialBenefitsLiquidationService';
import { LiquidationPreviewModal } from './LiquidationPreviewModal';
import type { BenefitType } from '@/types/social-benefits';

interface Employee {
  id: string;
  nombre?: string;
  apellido?: string;
  employee_name?: string;
}

interface SocialBenefitsDropdownProps {
  companyId: string;
  employees: Employee[];
  disabled?: boolean;
}

type BenefitOption = {
  key: BenefitType;
  label: string;
  icon: string;
  getPeriodLabel: () => string;
  getPeriodDates: () => { start: string; end: string };
};

const getBenefitOptions = (): BenefitOption[] => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11
  const semester = month < 6 ? 1 : 2;
  const semesterLabel = semester === 1 ? '1er Semestre' : '2do Semestre';
  
  return [
    {
      key: 'prima',
      label: 'Prima de Servicios',
      icon: '🎁',
      getPeriodLabel: () => `${semesterLabel} ${year}`,
      getPeriodDates: () => ({
        start: semester === 1 ? `${year}-01-01` : `${year}-07-01`,
        end: semester === 1 ? `${year}-06-30` : `${year}-12-31`,
      }),
    },
    {
      key: 'cesantias',
      label: 'Cesantías',
      icon: '📦',
      getPeriodLabel: () => `Año ${year}`,
      getPeriodDates: () => ({
        start: `${year}-01-01`,
        end: `${year}-12-31`,
      }),
    },
    {
      key: 'intereses_cesantias',
      label: 'Intereses de Cesantías',
      icon: '💵',
      getPeriodLabel: () => `Año ${year}`,
      getPeriodDates: () => ({
        start: `${year}-01-01`,
        end: `${year}-12-31`,
      }),
    },
  ];
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
  const [selectedBenefit, setSelectedBenefit] = useState<BenefitOption | null>(null);
  const [previewData, setPreviewData] = useState<LiquidationPreview | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const benefitOptions = getBenefitOptions();

  const handleSelectBenefit = async (benefit: BenefitOption) => {
    setIsOpen(false);
    setSelectedBenefit(benefit);
    setIsLoadingPreview(true);

    const dates = benefit.getPeriodDates();

    try {
      const result = await SocialBenefitsLiquidationService.getPreview(
        companyId,
        benefit.key,
        dates.start,
        dates.end,
        benefit.getPeriodLabel()
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
    if (!selectedBenefit) return;

    setIsProcessing(true);
    const dates = selectedBenefit.getPeriodDates();

    try {
      const result = await SocialBenefitsLiquidationService.liquidate(
        companyId,
        selectedBenefit.key,
        dates.start,
        dates.end,
        selectedBenefit.getPeriodLabel(),
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
        toast({
          title: '✅ Liquidación completada',
          description: `${selectedBenefit.label} liquidada para ${result.employeesCount} empleados - Total: $${result.totalAmount.toLocaleString()}`,
        });
        setShowPreviewModal(false);
        setPreviewData(null);
        setSelectedBenefit(null);
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
      setSelectedBenefit(null);
    }
  };

  if (employees.length === 0) return null;

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || isLoadingPreview}
            className="text-green-700 border-green-300 hover:bg-green-100"
          >
            {isLoadingPreview ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cargando...
              </>
            ) : (
              <>
                <Gift className="h-4 w-4 mr-2" />
                Prestaciones Sociales
                <ChevronDown className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 bg-popover">
          {benefitOptions.map((option) => (
            <DropdownMenuItem
              key={option.key}
              onClick={() => handleSelectBenefit(option)}
              className="flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span>{option.icon}</span>
                <span>{option.label}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {option.getPeriodLabel()}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <LiquidationPreviewModal
        isOpen={showPreviewModal}
        onClose={handleCloseModal}
        onConfirm={handleConfirmLiquidation}
        preview={previewData}
        benefitLabel={selectedBenefit?.label || ''}
        benefitIcon={selectedBenefit?.icon || ''}
        benefitType={selectedBenefit?.key}
        isProcessing={isProcessing}
      />
    </>
  );
};
