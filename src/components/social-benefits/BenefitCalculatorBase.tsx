
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarDays, Calculator, Save, Eye, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useSocialBenefits } from '@/hooks/useSocialBenefits';
import { useSecureEmployees } from '@/hooks/useSecureQuery';
import type { BenefitType } from '@/types/social-benefits';

interface BenefitCalculatorBaseProps {
  benefitType: BenefitType;
  title: string;
  description: string;
  defaultPeriod?: {
    start: string;
    end: string;
  };
}

export const BenefitCalculatorBase: React.FC<BenefitCalculatorBaseProps> = ({
  benefitType,
  title,
  description,
  defaultPeriod
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [periodStart, setPeriodStart] = useState(defaultPeriod?.start || '');
  const [periodEnd, setPeriodEnd] = useState(defaultPeriod?.end || '');
  const [notes, setNotes] = useState('');

  const { data: employees = [], isLoading: employeesLoading } = useSecureEmployees();
  const { isCalculating, previewResult, calculatePreview, calculateAndSave, clearPreview } = useSocialBenefits();

  // Auto-calculate preview when inputs change
  useEffect(() => {
    if (selectedEmployee && periodStart && periodEnd) {
      calculatePreview(selectedEmployee, benefitType, periodStart, periodEnd);
    } else {
      clearPreview();
    }
  }, [selectedEmployee, periodStart, periodEnd, benefitType, calculatePreview, clearPreview]);

  const handleSave = async () => {
    if (!selectedEmployee || !periodStart || !periodEnd) return;

    await calculateAndSave(selectedEmployee, benefitType, periodStart, periodEnd, notes);
  };

  const isFormValid = selectedEmployee && periodStart && periodEnd;
  const hasValidPreview = previewResult?.success && 'amount' in previewResult;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Employee Selection */}
        <div className="space-y-2">
          <Label htmlFor="employee">Empleado</Label>
          <Select
            value={selectedEmployee}
            onValueChange={setSelectedEmployee}
            disabled={employeesLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={employeesLoading ? "Cargando empleados..." : "Selecciona un empleado"} />
            </SelectTrigger>
            <SelectContent>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.nombre} {employee.apellido} - {employee.cargo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Period Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="periodStart">Fecha inicio</Label>
            <Input
              id="periodStart"
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="periodEnd">Fecha fin</Label>
            <Input
              id="periodEnd"
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </div>
        </div>

        {/* Preview Section */}
        {isFormValid && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span className="font-medium">Vista previa del cálculo</span>
              </div>

              {isCalculating ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  <span>Calculando...</span>
                </div>
              ) : previewResult ? (
                previewResult.success && hasValidPreview ? (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium text-green-800">
                        Valor calculado: {formatCurrency(previewResult.amount)}
                      </div>
                      <div className="text-sm text-green-600 mt-1">
                        {/* 🔧 NEW: Show interest calculation details for intereses_cesantias */}
                        {benefitType === 'intereses_cesantias' && previewResult.calculated_values?.rate_applied && (
                          <span>
                            Tasa aplicada: {(previewResult.calculated_values.rate_applied * 100).toFixed(3)}% 
                            ({previewResult.calculated_values.periodicity_used || 'período'})
                          </span>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {!previewResult.success && 'error' in previewResult ? (
                        previewResult.error === 'MISSING_CESANTIAS_PERIOD' ? (
                          <div>
                            <div className="font-medium">Cesantías requeridas</div>
                            <div className="text-sm mt-1">
                              Para calcular los intereses de cesantías, primero debes calcular y guardar 
                              las cesantías del mismo período.
                            </div>
                          </div>
                        ) : (
                          previewResult.error
                        )
                      ) : (
                        'Error en el cálculo'
                      )}
                    </AlertDescription>
                  </Alert>
                )
              ) : null}
            </div>
          </>
        )}

        {/* Notes Section */}
        <div className="space-y-2">
          <Label htmlFor="notes">Observaciones (opcional)</Label>
          <Textarea
            id="notes"
            placeholder="Agrega cualquier observación sobre este cálculo..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleSave}
            disabled={!isFormValid || !hasValidPreview || isCalculating}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Calcular y Guardar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
