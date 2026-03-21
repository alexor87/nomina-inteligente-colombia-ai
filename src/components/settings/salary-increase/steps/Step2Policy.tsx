import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { SalaryIncreaseProposal, SalaryIncreaseService } from '@/services/employees/SalaryIncreaseService';
import { PolicyType } from '../hooks/useSalaryIncreaseWizard';

interface Props {
  proposals: SalaryIncreaseProposal[];
  smlmv: number;
  policyType: PolicyType;
  uniformPercentage: number;
  rolePercentages: Record<string, number>;
  onPolicyTypeChange: (t: PolicyType) => void;
  onUniformPercentageChange: (v: number) => void;
  onRolePercentageChange: (cargo: string, v: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step2Policy({
  proposals,
  smlmv,
  policyType,
  uniformPercentage,
  rolePercentages,
  onPolicyTypeChange,
  onUniformPercentageChange,
  onRolePercentageChange,
  onNext,
  onBack,
}: Props) {
  // Employees that are NOT legally required (policy applies to them)
  const nonRequired = proposals.filter(p => !p.isLegallyRequired);
  const uniqueRoles = useMemo(
    () => [...new Set(nonRequired.map(p => p.cargo ?? 'Sin cargo'))],
    [nonRequired]
  );

  // Preview: projected monthly cost delta
  const preview = useMemo(() => {
    if (policyType === 'uniform') {
      return SalaryIncreaseService.applyUniformPercentage(proposals, uniformPercentage, smlmv);
    } else if (policyType === 'by-role') {
      return SalaryIncreaseService.applyRolePercentages(proposals, rolePercentages, smlmv);
    }
    return proposals;
  }, [proposals, smlmv, policyType, uniformPercentage, rolePercentages]);

  const currentMonthlyCost = proposals.reduce((s, p) => s + p.currentSalary, 0);
  const newMonthlyCost = preview.reduce((s, p) => s + p.proposedSalary, 0);
  const costDelta = newMonthlyCost - currentMonthlyCost;

  // Warn if any non-required employee ends up below SMLMV after increment
  const belowMinCount = preview.filter(p => !p.isLegallyRequired && p.proposedSalary < smlmv).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Política de incremento</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Define cómo se incrementarán los salarios de los {nonRequired.length} empleados sin ajuste obligatorio.
        </p>
      </div>

      <RadioGroup
        value={policyType}
        onValueChange={(v) => onPolicyTypeChange(v as PolicyType)}
        className="space-y-3"
      >
        <div className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
          <RadioGroupItem value="uniform" id="policy-uniform" className="mt-1" />
          <div className="flex-1">
            <Label htmlFor="policy-uniform" className="font-medium cursor-pointer">
              Porcentaje uniforme
            </Label>
            <p className="text-sm text-muted-foreground">Mismo porcentaje para todos los empleados.</p>
            {policyType === 'uniform' && (
              <div className="mt-3 flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={uniformPercentage}
                  onChange={e => onUniformPercentageChange(parseFloat(e.target.value) || 0)}
                  className="w-28"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
          <RadioGroupItem value="by-role" id="policy-role" className="mt-1" />
          <div className="flex-1">
            <Label htmlFor="policy-role" className="font-medium cursor-pointer">
              Por cargo
            </Label>
            <p className="text-sm text-muted-foreground">Define un porcentaje diferente por cargo.</p>
            {policyType === 'by-role' && (
              <div className="mt-3 rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cargo</TableHead>
                      <TableHead className="w-36">Incremento (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uniqueRoles.map(role => (
                      <TableRow key={role}>
                        <TableCell>{role}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.1}
                            value={rolePercentages[role] ?? 0}
                            onChange={e => onRolePercentageChange(role, parseFloat(e.target.value) || 0)}
                            className="w-24"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
          <RadioGroupItem value="individual" id="policy-individual" className="mt-1" />
          <div className="flex-1">
            <Label htmlFor="policy-individual" className="font-medium cursor-pointer">
              Revisión individual
            </Label>
            <p className="text-sm text-muted-foreground">
              Ajustarás cada empleado manualmente en el siguiente paso.
            </p>
          </div>
        </div>
      </RadioGroup>

      {belowMinCount > 0 && (
        <Alert variant="destructive" className="border-orange-200 bg-orange-50 text-orange-900">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Con este incremento, {belowMinCount} empleado{belowMinCount > 1 ? 's quedarían' : ' quedaría'} por
            debajo del SMLMV. Se ajustarán automáticamente al mínimo legal.
          </AlertDescription>
        </Alert>
      )}

      {policyType !== 'individual' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Impacto proyectado en costo mensual</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Costo actual</p>
              <p className="font-semibold">{formatCurrency(currentMonthlyCost)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Costo nuevo</p>
              <p className="font-semibold">{formatCurrency(newMonthlyCost)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Diferencia</p>
              <p className={`font-semibold ${costDelta >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {costDelta >= 0 ? '+' : ''}{formatCurrency(costDelta)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <Button onClick={onNext}>
          Revisar y confirmar
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
