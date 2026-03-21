import React from 'react';
import { AlertTriangle, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/utils';
import { YearTransitionAnalysis } from '@/services/employees/SalaryIncreaseService';

interface Props {
  analysis: YearTransitionAnalysis;
  year: number;
  onNext: () => void;
}

const RISK_BADGE: Record<string, { label: string; className: string }> = {
  required: { label: 'Ajuste obligatorio', className: 'bg-red-100 text-red-800 border-red-200' },
  warning: { label: 'Zona de riesgo', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  safe: { label: 'Sin riesgo', className: 'bg-green-100 text-green-800 border-green-200' },
};

export function Step1RiskAnalysis({ analysis, year, onNext }: Props) {
  const { proposals, smlmv, requiredCount, warningCount } = analysis;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Análisis de riesgo legal — {year}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          SMLMV {year}: <strong>{formatCurrency(smlmv)}</strong>
        </p>
      </div>

      {(requiredCount > 0 || warningCount > 0) && (
        <Alert variant="destructive" className="border-orange-200 bg-orange-50 text-orange-900">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {requiredCount > 0 && (
              <span><strong>{requiredCount} empleado{requiredCount > 1 ? 's' : ''}</strong> con ajuste obligatorio (salario ≤ SMLMV). </span>
            )}
            {warningCount > 0 && (
              <span><strong>{warningCount}</strong> en zona de riesgo (salario &lt; SMLMV × 1.05).</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <TooltipProvider>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead className="text-right">Salario actual</TableHead>
                <TableHead className="text-right">Salario propuesto</TableHead>
                <TableHead className="text-right">Diferencia</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.map(p => {
                const badge = RISK_BADGE[p.riskLevel];
                const diff = p.proposedSalary - p.currentSalary;
                return (
                  <TableRow key={p.employeeId}>
                    <TableCell className="font-medium">{p.employeeName}</TableCell>
                    <TableCell className="text-muted-foreground">{p.cargo ?? '—'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.currentSalary)}</TableCell>
                    <TableCell className="text-right">
                      {p.isLegallyRequired
                        ? <span className="font-semibold text-red-700">{formatCurrency(p.proposedSalary)}</span>
                        : <span className="text-muted-foreground">—</span>
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      {p.isLegallyRequired
                        ? <span className="text-red-700">+{formatCurrency(diff)}</span>
                        : '—'
                      }
                    </TableCell>
                    <TableCell>
                      {p.riskLevel === 'warning' ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className={badge.className + ' cursor-help'}>
                              {badge.label}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            Salario dentro del 5% del SMLMV. Recomendamos incrementarlo para evitar riesgos legales.
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Badge variant="outline" className={badge.className}>
                          {badge.label}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </TooltipProvider>

      <div className="flex justify-end">
        <Button onClick={onNext}>
          Continuar — Política de incremento
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
