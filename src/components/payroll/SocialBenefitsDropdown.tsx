import React, { useState } from 'react';
import { Gift, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { SocialBenefitsService } from '@/services/SocialBenefitsService';
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
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    benefit: BenefitOption | null;
  }>({ open: false, benefit: null });
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const benefitOptions = getBenefitOptions();

  const handleSelectBenefit = (benefit: BenefitOption) => {
    setIsOpen(false);
    setConfirmDialog({ open: true, benefit });
  };

  const handleConfirmLiquidation = async () => {
    if (!confirmDialog.benefit || employees.length === 0) return;

    const benefit = confirmDialog.benefit;
    const dates = benefit.getPeriodDates();
    
    setConfirmDialog({ open: false, benefit: null });
    setIsProcessing(true);
    setProgress({ current: 0, total: employees.length });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < employees.length; i++) {
      const employee = employees[i];
      setProgress({ current: i + 1, total: employees.length });

      try {
        const result = await SocialBenefitsService.calculateAndSave({
          employeeId: employee.id,
          benefitType: benefit.key,
          periodStart: dates.start,
          periodEnd: dates.end,
          notes: `Liquidación masiva - ${benefit.label} ${benefit.getPeriodLabel()}`,
        });

        if (result.success) {
          successCount++;
        } else {
          errorCount++;
          console.error(`Error liquidando ${benefit.label} para ${employee.nombre}:`, result);
        }
      } catch (error) {
        errorCount++;
        console.error(`Error liquidando ${benefit.label} para ${employee.nombre}:`, error);
      }
    }

    setIsProcessing(false);
    setProgress({ current: 0, total: 0 });

    if (errorCount === 0) {
      toast({
        title: '✅ Liquidación completada',
        description: `${benefit.label} liquidada para ${successCount} empleados`,
      });
    } else {
      toast({
        title: '⚠️ Liquidación parcial',
        description: `${successCount} exitosos, ${errorCount} con errores`,
        variant: 'destructive',
      });
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
            disabled={disabled || isProcessing}
            className="text-green-700 border-green-300 hover:bg-green-100"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {progress.current}/{progress.total}
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

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => !open && setConfirmDialog({ open: false, benefit: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.benefit?.icon} Liquidar {confirmDialog.benefit?.label}
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Desea liquidar <strong>{confirmDialog.benefit?.label}</strong> del{' '}
              <strong>{confirmDialog.benefit?.getPeriodLabel()}</strong> para{' '}
              <strong>{employees.length} empleados</strong>?
              <br />
              <br />
              Esta acción calculará y guardará la prestación para todos los empleados activos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLiquidation}>
              Liquidar {employees.length} empleados
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
