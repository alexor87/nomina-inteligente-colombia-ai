import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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
import { Calculator, Gift, Package, Percent, CheckCircle2, Loader2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SocialBenefitsService } from '@/services/SocialBenefitsService';
import type { BenefitType } from '@/types/social-benefits';

interface PayrollDashboardCardsProps {
  companyId: string;
  selectedPeriod: {
    id?: string;
    startDate: string;
    endDate: string;
    label: string;
  } | null;
  employees: any[];
  onPayrollClick?: () => void;
  isPayrollLiquidated?: boolean;
}

interface BenefitCardState {
  status: 'pending' | 'processing' | 'completed';
  estimatedAmount: number;
  progress: number;
  processedCount: number;
  totalCount: number;
}

type BenefitKey = 'prima' | 'cesantias' | 'intereses';

export const PayrollDashboardCards = ({
  companyId,
  selectedPeriod,
  employees,
  onPayrollClick,
  isPayrollLiquidated = false,
}: PayrollDashboardCardsProps) => {
  const { toast } = useToast();
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // Determine semester for Prima
  const isFirstSemester = currentMonth <= 6;
  const semesterLabel = isFirstSemester ? '1er Semestre' : '2do Semestre';
  const primaPeriodStart = isFirstSemester ? `${currentYear}-01-01` : `${currentYear}-07-01`;
  const primaPeriodEnd = isFirstSemester ? `${currentYear}-06-30` : `${currentYear}-12-31`;

  // Full year for Cesantías and Intereses
  const yearPeriodStart = `${currentYear}-01-01`;
  const yearPeriodEnd = `${currentYear}-12-31`;

  const [benefitStates, setBenefitStates] = useState<Record<BenefitKey, BenefitCardState>>({
    prima: { status: 'pending', estimatedAmount: 0, progress: 0, processedCount: 0, totalCount: 0 },
    cesantias: { status: 'pending', estimatedAmount: 0, progress: 0, processedCount: 0, totalCount: 0 },
    intereses: { status: 'pending', estimatedAmount: 0, progress: 0, processedCount: 0, totalCount: 0 },
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: BenefitKey | null;
    title: string;
    description: string;
  }>({ open: false, type: null, title: '', description: '' });

  // Calculate estimated amounts based on employees
  useEffect(() => {
    if (employees.length === 0) return;

    const totalSalaries = employees.reduce((sum, emp) => sum + (emp.salario_base || 0), 0);
    
    // Prima = 15 days of salary per semester (half month per semester)
    const estimatedPrima = totalSalaries / 2;
    
    // Cesantías = 1 month salary per year
    const estimatedCesantias = totalSalaries;
    
    // Intereses = 12% of Cesantías
    const estimatedIntereses = estimatedCesantias * 0.12;

    setBenefitStates(prev => ({
      ...prev,
      prima: { ...prev.prima, estimatedAmount: estimatedPrima, totalCount: employees.length },
      cesantias: { ...prev.cesantias, estimatedAmount: estimatedCesantias, totalCount: employees.length },
      intereses: { ...prev.intereses, estimatedAmount: estimatedIntereses, totalCount: employees.length },
    }));
  }, [employees]);

  const handleBenefitClick = (type: BenefitKey) => {
    const configs = {
      prima: {
        title: '¿Liquidar Prima de Servicios?',
        description: `Se liquidará la prima del ${semesterLabel} ${currentYear} para ${employees.length} empleados activos.`,
      },
      cesantias: {
        title: '¿Liquidar Cesantías?',
        description: `Se liquidarán las cesantías del año ${currentYear} para ${employees.length} empleados activos.`,
      },
      intereses: {
        title: '¿Liquidar Intereses de Cesantías?',
        description: `Se liquidarán los intereses de cesantías del año ${currentYear} para ${employees.length} empleados activos.`,
      },
    };

    setConfirmDialog({
      open: true,
      type,
      ...configs[type],
    });
  };

  const executeBulkLiquidation = async (type: BenefitKey) => {
    setConfirmDialog({ open: false, type: null, title: '', description: '' });
    
    const benefitTypeMap: Record<BenefitKey, BenefitType> = {
      prima: 'prima',
      cesantias: 'cesantias',
      intereses: 'intereses_cesantias',
    };

    const periodConfig = {
      prima: { start: primaPeriodStart, end: primaPeriodEnd },
      cesantias: { start: yearPeriodStart, end: yearPeriodEnd },
      intereses: { start: yearPeriodStart, end: yearPeriodEnd },
    };

    setBenefitStates(prev => ({
      ...prev,
      [type]: { ...prev[type], status: 'processing', progress: 0, processedCount: 0 },
    }));

    const period = periodConfig[type];
    const benefitType = benefitTypeMap[type];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < employees.length; i++) {
      const employee = employees[i];
      
      try {
        const result = await SocialBenefitsService.calculateAndSave({
          employeeId: employee.id,
          benefitType,
          periodStart: period.start,
          periodEnd: period.end,
          periodId: selectedPeriod?.id,
          notes: `Liquidación masiva - ${type}`,
        });

        if (result.success) {
          successCount++;
        } else {
          errorCount++;
          console.error(`Error liquidating ${type} for employee ${employee.id}:`, result);
        }
      } catch (error) {
        errorCount++;
        console.error(`Error liquidating ${type} for employee ${employee.id}:`, error);
      }

      const progress = Math.round(((i + 1) / employees.length) * 100);
      setBenefitStates(prev => ({
        ...prev,
        [type]: { ...prev[type], progress, processedCount: i + 1 },
      }));
    }

    setBenefitStates(prev => ({
      ...prev,
      [type]: { ...prev[type], status: 'completed', progress: 100 },
    }));

    const benefitLabels = {
      prima: 'Prima de Servicios',
      cesantias: 'Cesantías',
      intereses: 'Intereses de Cesantías',
    };

    if (errorCount === 0) {
      toast({
        title: `${benefitLabels[type]} liquidada`,
        description: `Se procesaron ${successCount} empleados exitosamente`,
        className: 'border-green-200 bg-green-50',
      });
    } else {
      toast({
        title: `${benefitLabels[type]} - Proceso completado`,
        description: `${successCount} exitosos, ${errorCount} con errores`,
        variant: errorCount > successCount ? 'destructive' : 'default',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderCard = (
    type: BenefitKey,
    title: string,
    period: string,
    icon: React.ReactNode,
    colorClass: string,
    bgClass: string
  ) => {
    const state = benefitStates[type];

    return (
      <Card className={`${bgClass} border-2 transition-all duration-200`}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg bg-white/80 ${colorClass}`}>
                {icon}
              </div>
              <div>
                <h3 className="font-semibold text-sm">{title}</h3>
                <p className="text-xs text-muted-foreground">{period}</p>
              </div>
            </div>
            {state.status === 'completed' && (
              <Badge className="bg-green-500 hover:bg-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Liquidada
              </Badge>
            )}
          </div>

          <div className="space-y-1">
            <p className={`text-xl font-bold ${colorClass}`}>
              {formatCurrency(state.estimatedAmount)}
            </p>
            <p className="text-xs text-muted-foreground">
              {employees.length} empleados
            </p>
          </div>

          {state.status === 'processing' && (
            <div className="space-y-2">
              <Progress value={state.progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Procesando... {state.processedCount}/{state.totalCount}
              </p>
            </div>
          )}

          {state.status === 'pending' && (
            <Button
              onClick={() => handleBenefitClick(type)}
              disabled={employees.length === 0}
              className="w-full"
              size="sm"
            >
              Liquidar {title}
            </Button>
          )}

          {state.status === 'completed' && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {/* TODO: Navigate to details */}}
            >
              <Eye className="h-4 w-4 mr-2" />
              Ver Detalles
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Nómina Card */}
        <Card 
          className={`${isPayrollLiquidated ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'} border-2 cursor-pointer transition-all duration-200 hover:shadow-md`}
          onClick={onPayrollClick}
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg bg-white/80 ${isPayrollLiquidated ? 'text-green-600' : 'text-blue-600'}`}>
                  <Calculator className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Nómina</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedPeriod?.label || 'Sin período'}
                  </p>
                </div>
              </div>
              {isPayrollLiquidated && (
                <Badge className="bg-green-500 hover:bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Liquidada
                </Badge>
              )}
            </div>

            <div className="space-y-1">
              <p className={`text-xl font-bold ${isPayrollLiquidated ? 'text-green-600' : 'text-blue-600'}`}>
                {formatCurrency(employees.reduce((sum, emp) => sum + (emp.neto_pagado || emp.salario_base || 0), 0))}
              </p>
              <p className="text-xs text-muted-foreground">
                {employees.length} empleados
              </p>
            </div>

            <Button
              variant={isPayrollLiquidated ? 'outline' : 'default'}
              size="sm"
              className="w-full"
            >
              {isPayrollLiquidated ? (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Detalles
                </>
              ) : (
                'Liquidar Nómina'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Prima Card */}
        {renderCard(
          'prima',
          'Prima',
          `${semesterLabel} ${currentYear}`,
          <Gift className="h-5 w-5" />,
          'text-emerald-600',
          'bg-emerald-50 border-emerald-200 hover:shadow-md'
        )}

        {/* Cesantías Card */}
        {renderCard(
          'cesantias',
          'Cesantías',
          `Año ${currentYear}`,
          <Package className="h-5 w-5" />,
          'text-amber-600',
          'bg-amber-50 border-amber-200 hover:shadow-md'
        )}

        {/* Intereses Card */}
        {renderCard(
          'intereses',
          'Intereses',
          `Año ${currentYear}`,
          <Percent className="h-5 w-5" />,
          'text-purple-600',
          'bg-purple-50 border-purple-200 hover:shadow-md'
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDialog.type && executeBulkLiquidation(confirmDialog.type)}
            >
              Liquidar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
