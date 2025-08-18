import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Textarea } from '@/components/ui/textarea';
import { useEmployeeData } from '@/hooks/useEmployeeData';
import { useSocialBenefits } from '@/hooks/useSocialBenefits';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Calculator, Save } from 'lucide-react';
import type { BenefitType } from '@/types/social-benefits';

interface BenefitCalculatorBaseProps {
  benefitType: BenefitType;
  title: string;
  description: string;
  defaultPeriod?: { start: string; end: string };
}

export const BenefitCalculatorBase: React.FC<BenefitCalculatorBaseProps> = ({
  benefitType,
  title,
  description,
  defaultPeriod
}) => {
  const { employees, isLoading: loadingEmployees } = useEmployeeData();
  const { isCalculating, previewResult, calculatePreview, calculateAndSave, clearPreview } = useSocialBenefits();
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [periodStart, setPeriodStart] = useState(defaultPeriod?.start || '');
  const [periodEnd, setPeriodEnd] = useState(defaultPeriod?.end || '');
  const [notes, setNotes] = useState('');

  const handleDateRangeChange = (start: string, end: string, days: number) => {
    setPeriodStart(start);
    setPeriodEnd(end);
    clearPreview(); // Limpiar preview cuando cambien las fechas
  };

  const handlePreview = async () => {
    if (!selectedEmployeeId || !periodStart || !periodEnd) {
      return;
    }

    await calculatePreview(selectedEmployeeId, benefitType, periodStart, periodEnd);
  };

  const handleSave = async () => {
    if (!selectedEmployeeId || !periodStart || !periodEnd) {
      return;
    }

    const result = await calculateAndSave(selectedEmployeeId, benefitType, periodStart, periodEnd, notes);
    
    if (result.success) {
      // Limpiar formulario después de guardar exitosamente
      setSelectedEmployeeId('');
      setPeriodStart(defaultPeriod?.start || '');
      setPeriodEnd(defaultPeriod?.end || '');
      setNotes('');
    }
  };

  const canCalculate = selectedEmployeeId && periodStart && periodEnd && !isCalculating;
  const hasPreview = previewResult && previewResult.success;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selector de empleado */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Empleado</label>
            <Select value={selectedEmployeeId} onValueChange={(value) => {
              setSelectedEmployeeId(value);
              clearPreview();
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar empleado" />
              </SelectTrigger>
              <SelectContent>
                {loadingEmployees ? (
                  <SelectItem value="" disabled>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Cargando empleados...
                  </SelectItem>
                ) : (
                  employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.nombre} {employee.apellido} - {employee.cargo}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Selector de período */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Período de cálculo</label>
            <DateRangePicker
              startDate={periodStart}
              endDate={periodEnd}
              onDateRangeChange={handleDateRangeChange}
              placeholder="Seleccionar período"
            />
          </div>

          {/* Notas opcionales */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Notas (opcional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones adicionales sobre este cálculo..."
              rows={3}
            />
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3">
            <Button
              onClick={handlePreview}
              disabled={!canCalculate}
              variant="outline"
              className="flex-1"
            >
              {isCalculating ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Calculator className="mr-2 h-4 w-4" />
              )}
              Vista Previa
            </Button>

            {hasPreview && (
              <Button
                onClick={handleSave}
                disabled={isCalculating}
                className="flex-1"
              >
                <Save className="mr-2 h-4 w-4" />
                Guardar Cálculo
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resultado del cálculo */}
      {hasPreview && previewResult.success && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-700">Resultado del Cálculo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="text-sm text-green-600 font-medium">Valor Calculado</div>
                <div className="text-2xl font-bold text-green-700">
                  ${previewResult.amount.toLocaleString('es-CO')}
                </div>
              </div>
              
              {previewResult.calculated_values && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-600 font-medium">Días del Período</div>
                  <div className="text-2xl font-bold text-blue-700">
                    {previewResult.calculated_values.days} días
                  </div>
                </div>
              )}
            </div>

            {previewResult.calculated_values?.formula && (
              <div className="mt-4 p-3 bg-gray-50 rounded border">
                <div className="text-sm font-medium text-gray-700">Fórmula aplicada:</div>
                <div className="text-sm text-gray-600 font-mono">
                  {previewResult.calculated_values.formula}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error en el cálculo */}
      {previewResult && !previewResult.success && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-700">Error en el Cálculo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="text-red-700">
                {'error' in previewResult ? previewResult.error : 'Error desconocido'}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
