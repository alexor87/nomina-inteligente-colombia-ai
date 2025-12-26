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

type QuickPeriodType = 'sem1' | 'sem2' | 'custom';

export const BenefitCalculatorBase = ({
  benefitType,
  title,
  description,
  defaultPeriod
}: BenefitCalculatorBaseProps) => {
  const currentYear = new Date().getFullYear();
  
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [periodStart, setPeriodStart] = useState(defaultPeriod?.start || '');
  const [periodEnd, setPeriodEnd] = useState(defaultPeriod?.end || '');
  const [notes, setNotes] = useState('');
  const [quickPeriod, setQuickPeriod] = useState<QuickPeriodType>('custom');

  const { data: employees = [], isLoading: employeesLoading } = useSecureEmployees();
  const { isCalculating, previewResult, calculatePreview, calculateAndSave, clearPreview } = useSocialBenefits();

  const handleQuickPeriodSelect = (type: QuickPeriodType) => {
    setQuickPeriod(type);
    if (type === 'sem1') {
      setPeriodStart(`${currentYear}-01-01`);
      setPeriodEnd(`${currentYear}-06-30`);
    } else if (type === 'sem2') {
      setPeriodStart(`${currentYear}-07-01`);
      setPeriodEnd(`${currentYear}-12-31`);
    }
    // 'custom' keeps current values
  };

  // Auto-calculate preview when inputs change
  useEffect(() => {
    if (selectedEmployee && periodStart && periodEnd && benefitType) {
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

  // ✅ Renderizado del preview con desglose detallado
  const renderPreview = () => {
    if (!previewResult || !previewResult.success) return null;

    const { amount, calculated_values } = previewResult;
    
    return (
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <h3 className="text-lg font-medium text-gray-900">Vista Previa del Cálculo</h3>
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(amount)}
          </div>
        </div>

        {/* ✅ Desglose detallado para intereses de cesantías */}
        {benefitType === 'intereses_cesantias' && calculated_values?.calculation_detail && (
          <div className="space-y-2 text-sm">
            <div className="font-medium text-gray-700">Desglose del Cálculo Legal:</div>
            <div className="pl-4 space-y-1 text-gray-600">
              <div>• <strong>Base de prestaciones:</strong> {formatCurrency(calculated_values.base_prestaciones || 0)}</div>
              <div>• <strong>Días del período:</strong> {calculated_values.dias}</div>
              <div>• <strong>1. Cesantía del período:</strong> {calculated_values.calculation_detail.step1_cesantia}</div>
              <div>• <strong>2. Intereses (12% anual):</strong> {calculated_values.calculation_detail.step2_intereses}</div>
              <div className="pt-2 border-t">
                <strong>Fundamento legal:</strong> {calculated_values.legal_basis || 'Ley 50/1990 Art. 99'}
              </div>
            </div>
          </div>
        )}

        {/* ✅ Información estándar para otros beneficios */}
        {benefitType !== 'intereses_cesantias' && (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-600">Base de cálculo:</span>
                <div className="font-medium">{formatCurrency(calculated_values?.base_prestaciones || 0)}</div>
              </div>
              <div>
                <span className="text-gray-600">Días del período:</span>
                <div className="font-medium">{calculated_values?.dias}</div>
              </div>
            </div>
            <div className="text-gray-600 text-xs pt-2 border-t">
              <strong>Fórmula:</strong> {calculated_values?.formula}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600">{description}</p>
        
        {/* ✅ Información legal específica para intereses */}
        {benefitType === 'intereses_cesantias' && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-800">
              <strong>Marco Legal:</strong> Ley 50 de 1990, Artículo 99. Los intereses de cesantías corresponden al 12% anual 
              sobre el valor de las cesantías del período. Se calculan como: <code>Intereses = Cesantía del período × 0.12</code>
            </div>
          </div>
        )}
      </div>

      {/* Selector rápido de período - solo para prima */}
      {benefitType === 'prima' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Período de Liquidación
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={quickPeriod === 'sem1' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleQuickPeriodSelect('sem1')}
            >
              1er Semestre (Ene-Jun)
            </Button>
            <Button
              type="button"
              variant={quickPeriod === 'sem2' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleQuickPeriodSelect('sem2')}
            >
              2do Semestre (Jul-Dic)
            </Button>
            <Button
              type="button"
              variant={quickPeriod === 'custom' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleQuickPeriodSelect('custom')}
            >
              Personalizado
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="employee" className="block text-sm font-medium text-gray-700 mb-2">
              Empleado
            </label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee} disabled={employeesLoading}>
              <SelectTrigger>
                <SelectValue placeholder={employeesLoading ? "Cargando empleados..." : "Selecciona un empleado"} />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee: any) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.nombre} {employee.apellido} - {formatCurrency(employee.salario_base)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="period-start" className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Inicio
              </label>
              <Input
                id="period-start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="period-end" className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Fin
              </label>
              <Input
                id="period-end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notas (Opcional)
            </label>
            <Input
              id="notes"
              placeholder="Observaciones adicionales..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          {isFormValid && (
            <>
              {isCalculating ? (
                <div className="flex items-center space-x-2 text-gray-600">
                  <Calculator className="h-4 w-4 animate-pulse" />
                  <span>Calculando...</span>
                </div>
              ) : previewResult ? (
                previewResult.success ? (
                  renderPreview()
                ) : (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {!previewResult.success && 'error' in previewResult 
                        ? previewResult.error 
                        : "Error en el cálculo"
                      }
                    </AlertDescription>
                  </Alert>
                )
              ) : null}
            </>
          )}

          <div className="space-y-3">
            <Button
              onClick={() => {
                if (isFormValid) {
                  calculatePreview(selectedEmployee, benefitType, periodStart, periodEnd);
                }
              }}
              disabled={!isFormValid || isCalculating}
              variant="outline"
              className="w-full"
            >
              <Eye className="h-4 w-4 mr-2" />
              Vista Previa
            </Button>

            <Button
              onClick={handleSave}
              disabled={!isFormValid || isCalculating || (!previewResult || !previewResult.success)}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {isCalculating ? 'Guardando...' : 'Calcular y Guardar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
