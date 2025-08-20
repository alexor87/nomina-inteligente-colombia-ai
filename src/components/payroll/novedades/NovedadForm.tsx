
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Calculator, Info, CheckCircle2 } from 'lucide-react';
import { CreateNovedadData, NovedadType, NOVEDAD_CATEGORIES } from '@/types/novedades-enhanced';
import { useNovedadBackendCalculation } from '@/hooks/useNovedadBackendCalculation';
import { formatCurrency } from '@/lib/utils';
import { NovedadBreakdownDisplay } from './NovedadBreakdownDisplay';

interface NovedadFormProps {
  formData: CreateNovedadData;
  onFormDataChange: (data: CreateNovedadData) => void;
  employeeSalary: number;
  modalType?: 'devengado' | 'deduccion';
  showCalculationDetails?: boolean;
}

export const NovedadForm: React.FC<NovedadFormProps> = ({
  formData,
  onFormDataChange,
  employeeSalary,
  modalType,
  showCalculationDetails = true
}) => {
  const { calculateNovedadDebounced, isLoading } = useNovedadBackendCalculation();
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);

  // ✅ UNIFIED CALCULATION: Always use backend for consistency
  const triggerBackendCalculation = useCallback(() => {
    if (!employeeSalary || employeeSalary <= 0) {
      console.log('⚠️ No valid salary for calculation');
      return;
    }

    setIsCalculating(true);
    setCalculationError(null);

    const calculationInput = {
      tipoNovedad: formData.tipo_novedad,
      subtipo: formData.subtipo,
      salarioBase: employeeSalary,
      horas: formData.horas ? Number(formData.horas) : undefined,
      dias: formData.dias ? Number(formData.dias) : undefined,
      valorManual: formData.valor ? Number(formData.valor) : undefined,
      fechaPeriodo: new Date().toISOString() // Current period for policy lookup
    };

    console.log('🎯 Triggering unified backend calculation:', calculationInput);

    calculateNovedadDebounced(calculationInput, (result) => {
      setIsCalculating(false);
      
      if (result) {
        console.log('✅ Backend calculation result:', result);
        setCalculationResult(result);
        
        // ✅ STORE DETAILED BREAKDOWN: Update form with calculated value and breakdown
        const updatedFormData = {
          ...formData,
          valor: result.valor, // Use backend-calculated value
          base_calculo: {
            salario_base: employeeSalary,
            valor_original_usuario: formData.valor || 0,
            valor_calculado: result.valor,
            factor_calculo: result.factorCalculo,
            detalle_calculo: result.detalleCalculo,
            breakdown: result.jornadaInfo || {},
            policy_snapshot: {
              calculation_date: new Date().toISOString(),
              salary_used: employeeSalary,
              days_used: formData.dias,
              hours_used: formData.horas
            }
          }
        };
        
        onFormDataChange(updatedFormData);
      } else {
        setCalculationError('Error en el cálculo backend');
      }
    }, 300);
  }, [formData.tipo_novedad, formData.subtipo, employeeSalary, formData.horas, formData.dias, formData.valor, calculateNovedadDebounced, onFormDataChange, formData]);

  // Trigger calculation when relevant fields change
  useEffect(() => {
    if (shouldTriggerAutoCalculation()) {
      triggerBackendCalculation();
    }
  }, [formData.tipo_novedad, formData.subtipo, formData.horas, formData.dias, employeeSalary, triggerBackendCalculation]);

  const shouldTriggerAutoCalculation = () => {
    const requiresHours = ['horas_extra', 'recargo_nocturno'].includes(formData.tipo_novedad);
    const requiresDays = ['vacaciones', 'incapacidad', 'licencia_remunerada', 'licencia_no_remunerada', 'ausencia'].includes(formData.tipo_novedad);

    if (requiresHours && (!formData.horas || formData.horas <= 0)) return false;
    if (requiresDays && (!formData.dias || formData.dias <= 0)) return false;
    
    return employeeSalary > 0;
  };

  const getFilteredCategories = () => {
    if (modalType === 'devengado') {
      return NOVEDAD_CATEGORIES.devengados;
    } else if (modalType === 'deduccion') {
      return NOVEDAD_CATEGORIES.deducciones;
    }
    // Return both categories if no specific modal type
    return {
      ...NOVEDAD_CATEGORIES.devengados,
      ...NOVEDAD_CATEGORIES.deducciones
    };
  };

  const categories = getFilteredCategories();
  // ✅ FIXED: Access types property correctly based on structure
  const tipoOptions = modalType ? 
    Object.entries(categories.types || {}) :
    [
      ...Object.entries(NOVEDAD_CATEGORIES.devengados.types || {}),
      ...Object.entries(NOVEDAD_CATEGORIES.deducciones.types || {})
    ];

  const showCalculationBreakdown = showCalculationDetails && calculationResult && !isCalculating;
  const hasValueAdjustment = calculationResult && formData.base_calculo?.valor_original_usuario !== calculationResult.valor;

  return (
    <div className="space-y-6">
      {/* Tipo de Novedad */}
      <div className="space-y-2">
        <Label htmlFor="tipo_novedad">Tipo de Novedad *</Label>
        <Select 
          value={formData.tipo_novedad} 
          onValueChange={(value: NovedadType) => {
            onFormDataChange({ 
              ...formData, 
              tipo_novedad: value,
              subtipo: undefined, // Reset subtipo when changing type
              valor: 0 // Reset value for recalculation
            });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar tipo" />
          </SelectTrigger>
          <SelectContent>
            {tipoOptions.map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {(config as any).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subtipo (conditional) */}
      {formData.tipo_novedad === 'incapacidad' && (
        <div className="space-y-2">
          <Label htmlFor="subtipo">Subtipo de Incapacidad *</Label>
          <Select 
            value={formData.subtipo || ''} 
            onValueChange={(value) => onFormDataChange({ ...formData, subtipo: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar subtipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General (EPS)</SelectItem>
              <SelectItem value="laboral">Laboral (ARL)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Días (conditional) */}
      {['vacaciones', 'incapacidad', 'licencia_remunerada', 'licencia_no_remunerada', 'ausencia'].includes(formData.tipo_novedad) && (
        <div className="space-y-2">
          <Label htmlFor="dias">Días *</Label>
          <Input
            id="dias"
            type="number"
            min="0"
            step="1"
            value={formData.dias || ''}
            onChange={(e) => onFormDataChange({ 
              ...formData, 
              dias: e.target.value ? Number(e.target.value) : undefined 
            })}
            placeholder="Número de días"
          />
        </div>
      )}

      {/* Horas (conditional) */}
      {['horas_extra', 'recargo_nocturno'].includes(formData.tipo_novedad) && (
        <div className="space-y-2">
          <Label htmlFor="horas">Horas *</Label>
          <Input
            id="horas"
            type="number"
            min="0"
            step="0.5"
            value={formData.horas || ''}
            onChange={(e) => onFormDataChange({ 
              ...formData, 
              horas: e.target.value ? Number(e.target.value) : undefined 
            })}
            placeholder="Número de horas"
          />
        </div>
      )}

      {/* ✅ UNIFIED VALUE DISPLAY: Show backend-calculated value */}
      <div className="space-y-2">
        <Label htmlFor="valor">Valor Calculado</Label>
        <div className="relative">
          <Input
            id="valor"
            type="number"
            value={formData.valor || ''}
            onChange={(e) => onFormDataChange({ 
              ...formData, 
              valor: e.target.value ? Number(e.target.value) : 0 
            })}
            placeholder="Valor será calculado automáticamente"
            className={hasValueAdjustment ? 'border-orange-300 bg-orange-50' : ''}
          />
          {isCalculating && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
        
        {hasValueAdjustment && (
          <div className="flex items-center gap-2 text-sm text-orange-600">
            <AlertTriangle className="h-4 w-4" />
            <span>Valor ajustado por política empresarial</span>
          </div>
        )}
      </div>

      {/* ✅ ENHANCED BREAKDOWN DISPLAY */}
      {showCalculationBreakdown && formData.base_calculo && (
        <NovedadBreakdownDisplay baseCalculo={formData.base_calculo} />
      )}

      {calculationError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>{calculationError}</span>
          </div>
        </div>
      )}

      {/* Manual recalculation button */}
      {employeeSalary > 0 && !isCalculating && (
        <Button 
          type="button"
          variant="outline" 
          onClick={triggerBackendCalculation}
          className="w-full"
        >
          <Calculator className="h-4 w-4 mr-2" />
          Recalcular con Política Actual
        </Button>
      )}

      {/* Observaciones */}
      <div className="space-y-2">
        <Label htmlFor="observacion">Observaciones</Label>
        <Textarea
          id="observacion"
          value={formData.observacion || ''}
          onChange={(e) => onFormDataChange({ ...formData, observacion: e.target.value })}
          placeholder="Observaciones adicionales (opcional)"
          rows={3}
        />
      </div>
    </div>
  );
};
