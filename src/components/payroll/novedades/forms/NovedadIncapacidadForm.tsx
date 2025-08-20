
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calculator, Info, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useNovedadBackendCalculation } from '@/hooks/useNovedadBackendCalculation';
import { NovedadType } from '@/types/novedades-enhanced';
import { calculateDaysBetween, isValidDateRange } from '@/utils/dateUtils';

interface NovedadIncapacidadFormProps {
  onBack: () => void;
  onSubmit: (formData: any) => void;
  employeeSalary: number;
  isSubmitting: boolean;
  periodoFecha?: Date;
  periodStartDate?: string;
  periodEndDate?: string;
}

const INCAPACIDAD_SUBTIPOS = [
  { 
    value: 'general', 
    label: 'Común - EPS', 
    description: 'Días 1-2: empleador 100% | Días 3+: EPS 66.67%',
    porcentaje: '100% / 66.67%',
    normativa: 'Ley 100/1993 Art. 227 - Días 1-2 empleador, días 3+ EPS'
  },
  { 
    value: 'laboral', 
    label: 'Laboral - ARL (100%)', 
    description: 'ARL paga desde el día 1 al 100%',
    porcentaje: 100,
    normativa: 'Decreto 1295/1994 - ARL asume desde el primer día'
  }
];

export const NovedadIncapacidadForm: React.FC<NovedadIncapacidadFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary,
  isSubmitting,
  periodoFecha,
  periodStartDate,
  periodEndDate
}) => {
  const [formData, setFormData] = useState({
    subtipo: 'general',
    fecha_inicio: '',
    fecha_fin: '',
    valor: 0,
    observacion: ''
  });

  const { calculateNovedadDebounced, isLoading } = useNovedadBackendCalculation();
  const [dateRangeError, setDateRangeError] = useState<string>('');

  // ✅ KISS: Validación simple de rango de fechas (ahora solo advertencia, no bloquea)
  const isDateRangeInPeriod = (startDate: string, endDate: string): boolean => {
    if (!startDate || !endDate || !periodStartDate || !periodEndDate) return true;
    
    const incapacityStart = new Date(startDate + 'T00:00:00');
    const incapacityEnd = new Date(endDate + 'T00:00:00');
    const periodStart = new Date(periodStartDate + 'T00:00:00');
    const periodEnd = new Date(periodEndDate + 'T00:00:00');
    
    return incapacityStart >= periodStart && incapacityEnd <= periodEnd;
  };

  // ✅ Calcular días automáticamente basado en las fechas
  const calculatedDays = calculateDaysBetween(formData.fecha_inicio, formData.fecha_fin);
  const isValidRange = isValidDateRange(formData.fecha_inicio, formData.fecha_fin);

  // ✅ NUEVA FUNCIÓN: Calcular valor de incapacidad según normativa
  const calculateIncapacityValue = useCallback((days: number, subtipo: string): number => {
    if (days <= 0 || !employeeSalary) return 0;
    
    const dailySalary = employeeSalary / 30;
    
    switch (subtipo) {
      case 'general':
        // ✅ NORMATIVA CORREGIDA: Días 1-2 al 100%, días 3+ al 66.67%
        if (days <= 2) {
          return dailySalary * days; // 100% todos los días
        } else {
          // Días 1-2 al 100% + días 3+ al 66.67%
          const first2Days = dailySalary * 2; // 100%
          const remainingDays = dailySalary * (days - 2) * 0.6667; // 66.67%
          return first2Days + remainingDays;
        }
      
      case 'laboral':
        // ARL paga desde día 1 al 100%
        return dailySalary * days;
      
      default:
        return 0;
    }
  }, [employeeSalary]);

  // ✅ CORRECCIÓN: Cálculo automático cuando cambien fechas o subtipo
  useEffect(() => {
    // Advertir si el rango se sale del período, pero no bloquear
    if (formData.fecha_inicio && formData.fecha_fin && isValidRange) {
      if (!isDateRangeInPeriod(formData.fecha_inicio, formData.fecha_fin)) {
        const startFormatted = periodStartDate ? new Date(periodStartDate).toLocaleDateString('es-CO') : '';
        const endFormatted = periodEndDate ? new Date(periodEndDate).toLocaleDateString('es-CO') : '';
        setDateRangeError(`La incapacidad cruza el período de liquidación (${startFormatted} - ${endFormatted}). Se fraccionará en la liquidación.`);
      } else {
        setDateRangeError('');
      }
    } else {
      setDateRangeError('');
    }

    // ✅ NUEVO CÁLCULO LOCAL CON NORMATIVA CORRECTA
    if (calculatedDays > 0 && isValidRange && formData.subtipo && employeeSalary > 0) {
      const calculatedValue = calculateIncapacityValue(calculatedDays, formData.subtipo);
      
      console.log('🏥 Calculating incapacity locally:', {
        subtipo: formData.subtipo,
        dias: calculatedDays,
        salario: employeeSalary,
        valor: calculatedValue,
        fechaInicio: formData.fecha_inicio,
        fechaFin: formData.fecha_fin
      });
      
      setFormData(prev => ({ 
        ...prev, 
        valor: Math.round(calculatedValue)
      }));
    } else if (calculatedDays === 0 || !isValidRange) {
      // ✅ Limpiar valor cuando no hay días válidos
      setFormData(prev => ({ 
        ...prev, 
        valor: 0 
      }));
    }
  }, [formData.subtipo, formData.fecha_inicio, formData.fecha_fin, calculatedDays, isValidRange, employeeSalary, calculateIncapacityValue, periodStartDate, periodEndDate]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.fecha_inicio) {
      alert('Por favor seleccione la fecha de inicio');
      return;
    }

    if (!formData.fecha_fin) {
      alert('Por favor seleccione la fecha de fin');
      return;
    }

    if (!isValidRange) {
      alert('La fecha de fin debe ser igual o posterior a la fecha de inicio');
      return;
    }

    if (calculatedDays <= 0) {
      alert('El rango de fechas debe ser válido');
      return;
    }

    if (formData.valor <= 0) {
      alert('El valor debe ser mayor a 0');
      return;
    }

    const submitData = {
      tipo_novedad: 'incapacidad',
      subtipo: formData.subtipo,
      dias: calculatedDays, // ✅ Usar días calculados automáticamente
      fecha_inicio: formData.fecha_inicio,
      fecha_fin: formData.fecha_fin,
      valor: formData.valor,
      observacion: formData.observacion || undefined
    };

    console.log('📤 Submitting incapacidad:', submitData);
    onSubmit(submitData);
  };

  const getSubtipoInfo = (subtipo: string) => {
    return INCAPACIDAD_SUBTIPOS.find(s => s.value === subtipo);
  };

  const currentSubtipoInfo = getSubtipoInfo(formData.subtipo);

  // ✅ NUEVA FUNCIÓN: Calcular desglose para UI
  const getIncapacityBreakdown = (days: number, subtipo: string) => {
    if (days <= 0 || subtipo !== 'general') return null;
    
    const dailySalary = employeeSalary / 30;
    
    if (days <= 2) {
      return {
        employerDays: days,
        employerAmount: dailySalary * days,
        epsDays: 0,
        epsAmount: 0,
        total: dailySalary * days
      };
    } else {
      const employerAmount = dailySalary * 2; // Días 1-2 al 100%
      const epsAmount = dailySalary * (days - 2) * 0.6667; // Días 3+ al 66.67%
      
      return {
        employerDays: 2,
        employerAmount,
        epsDays: days - 2,
        epsAmount,
        total: employerAmount + epsAmount
      };
    }
  };

  const breakdown = calculatedDays > 0 ? getIncapacityBreakdown(calculatedDays, formData.subtipo) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b bg-white">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold text-gray-900">Incapacidad</h3>
      </div>

      {/* Form Section */}
      <div className="bg-blue-50 p-4 rounded-lg space-y-4">
        <h4 className="text-blue-800 font-medium">Información de la Incapacidad</h4>
        
        <div>
          <Label htmlFor="subtipo" className="text-gray-700">Tipo de Incapacidad</Label>
          <Select
            value={formData.subtipo}
            onValueChange={(value) => handleInputChange('subtipo', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INCAPACIDAD_SUBTIPOS.map((subtipo) => (
                <SelectItem key={subtipo.value} value={subtipo.value}>
                  <div>
                    <div className="font-medium">{subtipo.label}</div>
                    <div className="text-xs text-gray-500">{subtipo.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* ✅ INFORMACIÓN NORMATIVA ACTUALIZADA */}
          {currentSubtipoInfo && (
            <div className="mt-2 p-3 bg-blue-100 rounded text-xs">
              <div className="flex items-start gap-2">
                <Info className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-blue-800">
                    {formData.subtipo === 'general' 
                      ? 'Días 1-2: 100% (empleador) | Días 3+: 66.67% (EPS)'
                      : `Cobertura: ${currentSubtipoInfo.porcentaje}%`
                    }
                  </div>
                  <div className="text-blue-700 mt-1">
                    {currentSubtipoInfo.normativa}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="fecha_inicio" className="text-gray-700">Fecha Inicio *</Label>
            <Input
              type="date"
              value={formData.fecha_inicio}
              onChange={(e) => handleInputChange('fecha_inicio', e.target.value)}
              className={dateRangeError ? 'border-red-500' : ''}
            />
          </div>

          <div>
            <Label htmlFor="fecha_fin" className="text-gray-700">Fecha Fin *</Label>
            <Input
              type="date"
              value={formData.fecha_fin}
              onChange={(e) => handleInputChange('fecha_fin', e.target.value)}
              className={dateRangeError ? 'border-red-500' : ''}
            />
            {!isValidRange && formData.fecha_inicio && formData.fecha_fin && (
              <div className="text-xs text-red-600 mt-1">
                La fecha de fin debe ser igual o posterior a la fecha de inicio
              </div>
            )}
            {dateRangeError && (
              <div className="text-xs text-red-600 mt-1">
                {dateRangeError}
              </div>
            )}
          </div>
        </div>

        {/* ✅ MOSTRAR DÍAS CALCULADOS */}
        {formData.fecha_inicio && formData.fecha_fin && (
          <div className="bg-white p-3 rounded border border-blue-200">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                Días calculados: 
              </span>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {isValidRange ? `${calculatedDays} días` : 'Rango inválido'}
              </Badge>
            </div>
            {isValidRange && (
              <div className="text-xs text-gray-600 mt-1">
                Del {formData.fecha_inicio} al {formData.fecha_fin} (ambos días incluidos)
              </div>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="valor" className="text-gray-700">
            Valor Calculado *
            {formData.valor > 0 && currentSubtipoInfo && (
              <span className="text-xs text-green-600 ml-2">
                (según normativa colombiana)
              </span>
            )}
          </Label>
          <Input
            type="number"
            min="0"
            step="1000"
            value={formData.valor}
            onChange={(e) => handleInputChange('valor', parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="text-lg font-medium"
          />
        </div>

        <div>
          <Label htmlFor="observacion" className="text-gray-700">Observaciones</Label>
          <Textarea
            value={formData.observacion}
            onChange={(e) => handleInputChange('observacion', e.target.value)}
            placeholder="Número de incapacidad, diagnóstico, entidad que la expide..."
            rows={3}
            className="resize-none"
          />
        </div>

        {/* ✅ NUEVO: Desglose detallado para incapacidad general */}
        {breakdown && formData.subtipo === 'general' && (
          <div className="bg-white p-4 rounded border border-blue-200">
            <h5 className="text-sm font-medium text-gray-700 mb-3">Desglose Normativo (Incapacidad General)</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Días 1-2 (Empleador al 100%):</span>
                <span className="font-medium">{formatCurrency(breakdown.employerAmount)}</span>
              </div>
              {breakdown.epsDays > 0 && (
                <div className="flex justify-between">
                  <span>Días 3-{calculatedDays} (EPS al 66.67%):</span>
                  <span className="font-medium">{formatCurrency(breakdown.epsAmount)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total:</span>
                <span>{formatCurrency(breakdown.total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ✅ Preview mejorado */}
        {formData.valor > 0 && calculatedDays > 0 && (
          <div className="bg-green-50 p-3 rounded text-center border border-green-200">
            <Badge variant="secondary" className="bg-green-100 text-green-800 text-base px-4 py-2">
              +{formatCurrency(formData.valor)}
            </Badge>
            <div className="text-sm text-gray-700 mt-2">
              {calculatedDays} días de incapacidad {currentSubtipoInfo?.label.toLowerCase()}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Calculado según normativa colombiana
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!formData.fecha_inicio || !formData.fecha_fin || !isValidRange || calculatedDays <= 0 || formData.valor <= 0 || isSubmitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? 'Guardando...' : 'Guardar Incapacidad'}
        </Button>
      </div>
    </div>
  );
};
