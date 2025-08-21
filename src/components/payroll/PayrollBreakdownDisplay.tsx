
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Info } from 'lucide-react';
import { PayrollBreakdown } from '@/types/payroll';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PayrollBreakdownDisplayProps {
  breakdown: PayrollBreakdown;
  employeeName: string;
  baseSalary: number;
}

export const PayrollBreakdownDisplay: React.FC<PayrollBreakdownDisplayProps> = ({
  breakdown,
  employeeName,
  baseSalary
}) => {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);

  const getPolicyDescription = (policy: string) => {
    switch (policy) {
      case 'standard_2d_100_rest_66':
        return 'Primeros 2 días 100%, resto 66.67% (sin piso SMLDV)';
      case 'from_day1_66_with_floor':
        return 'Desde día 1 al 66.67% con piso SMLDV';
      default:
        return policy;
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Eye className="h-4 w-4" />
          Ver cálculo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalle del cálculo - {employeeName}
            <Badge variant="outline">
              {breakdown.ibcMode === 'incapacity' ? 'Con incapacidad' : 'Sin incapacidad'}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Información básica */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Información básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Salario base mensual:</span>
                <span className="font-medium">{formatCurrency(baseSalary)}</span>
              </div>
              <div className="flex justify-between">
                <span>Días efectivos trabajados:</span>
                <span className="font-medium">{breakdown.effectiveWorkedDays} días</span>
              </div>
              {breakdown.totalIncapacityDays > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>Días de incapacidad:</span>
                  <span className="font-medium">{breakdown.totalIncapacityDays} días</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Devengados */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-700">
                Devengados constitutivos (base para IBC)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Salario por días trabajados:</span>
                <span className="font-medium">{formatCurrency(breakdown.salaryForWorkedDays)}</span>
              </div>
              
              {breakdown.incapacityPay > 0 && (
                <div className="flex justify-between">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-1 cursor-help">
                          Pago por incapacidad
                          <Info className="h-3 w-3" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Política: {getPolicyDescription(breakdown.policy)}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="font-medium text-blue-600">{formatCurrency(breakdown.incapacityPay)}</span>
                </div>
              )}
              
              {breakdown.otherConstitutive > 0 && (
                <div className="flex justify-between">
                  <span>Otros constitutivos (horas extra, bonos):</span>
                  <span className="font-medium">{formatCurrency(breakdown.otherConstitutive)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Devengados no constitutivos */}
          {(breakdown.transportAllowance > 0 || breakdown.nonConstitutive > 0) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-700">
                  Devengados no constitutivos (no base para IBC)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {breakdown.transportAllowance > 0 && (
                  <div className="flex justify-between">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center gap-1 cursor-help">
                            Auxilio de transporte
                            <Info className="h-3 w-3" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Prorrateado por días efectivos trabajados</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className="font-medium">{formatCurrency(breakdown.transportAllowance)}</span>
                  </div>
                )}
                
                {breakdown.nonConstitutive > 0 && (
                  <div className="flex justify-between">
                    <span>Otros no constitutivos:</span>
                    <span className="font-medium">{formatCurrency(breakdown.nonConstitutive)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Resumen final */}
          <Card className="border-2 border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Resumen final</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between font-medium">
                <span>Total devengado:</span>
                <span className="text-green-600">{formatCurrency(breakdown.totalGross)}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Total deducciones:</span>
                <span className="text-red-600">{formatCurrency(breakdown.totalDeductions)}</span>
              </div>
              
              <div className="border-t pt-2">
                <div className="flex justify-between font-bold text-base">
                  <span>Neto a pagar:</span>
                  <span className="text-blue-600">{formatCurrency(breakdown.netPay)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nota sobre incapacidad */}
          {breakdown.totalIncapacityDays > 0 && breakdown.incapacityPay > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Incapacidad aplicada:</p>
                  <p>
                    El empleado no trabajó {breakdown.totalIncapacityDays} días por incapacidad, 
                    por lo que no recibe salario por esos días, pero sí el subsidio correspondiente 
                    según la política de la empresa: {getPolicyDescription(breakdown.policy)}.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
