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
import { PeriodValidationService } from '@/services/PeriodValidationService';

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
    label: 'Común - EPS (66.7%)', 
    description: 'EPS paga desde el día 4 al 66.7%',
    porcentaje: 66.7,
    normativa: 'Ley 100/1993 Art. 227 - Empleador paga los primeros 3 días'
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

  const [dateValidation, setDateValidation] = useState<{
    isValid: boolean;
    message: string;
  }>({ isValid: true, message: '' });

  const { calculateNovedadDebounced, isLoading } = useNovedadBackendCalculation();

  // ✅ Calcular días automáticamente basado en las fechas
  const calculatedDays = calculateDaysBetween(formData.fecha_inicio, formData.fecha_fin);
  const isValidRange = isValidDateRange(formData.fecha_inicio, formData.fecha_fin);

  // ✅ NUEVA: Validación en tiempo real de fechas contra período
  useEffect(() => {
    if (formData.fecha_inicio && formData.fecha_fin && periodStartDate && periodEndDate) {
      const validation = PeriodValidationService.validateDateRangeInPeriod(
        formData.fecha_inicio,
        formData.fecha_fin,
        periodStartDate,
        periodEndDate,
        'incapacidad',
        `${periodStartDate} - ${periodEndDate}`
      );
      
      setDateValidation({
        isValid: validation.isValid,
        message: validation.message
      });
      
      console.log('🔍 Date validation for incapacidad:', validation);
    } else if (formData.fecha_inicio || formData.fecha_fin) {
      setDateValidation({
        isValid: false,
        message: 'Complete ambas fechas para validar'
      });
    } else {
      setDateValidation({ isValid: true, message: '' });
    }
  }, [formData.fecha_inicio, formData.fecha_fin, periodStartDate, periodEndDate]);

  // ✅ CORRECCIÓN: Cálculo automático cuando cambien fechas o subtipo
  useEffect(() => {
    if (calculatedDays > 0 && isValidRange && dateValidation.isValid && formData.subtipo && employeeSalary > 0) {
      console.log('🔄 Triggering calculation for incapacidad:', {
        subtipo: formData.subtipo,
        dias: calculatedDays,
        salario: employeeSalary,
        fechaInicio: formData.fecha_inicio,
        fechaFin: formData.fecha_fin,
        periodo: periodoFecha
      });
      
      // ✅ KISS: Callback directo que actualiza el estado inmediatamente
      calculateNovedadDebounced(
        {
          tipoNovedad: 'incapacidad' as NovedadType,
          subtipo: formData.subtipo,
          salarioBase: employeeSalary,
          dias: calculatedDays,
          fechaPeriodo: (periodoFecha || new Date()).toISOString()
        },
        (result) => {
          if (result && result.valor > 0) {
            console.log('💰 Updating calculated value for', calculatedDays, 'days:', result.valor);
            
            // ✅ CORRECCIÓN CRÍTICA: Actualizar inmediatamente sin condiciones
            setFormData(prev => ({ 
              ...prev, 
              valor: result.valor 
            }));
          } else if (result && result.valor === 0) {
            console.log('⚠️ Calculation returned zero value');
            setFormData(prev => ({ 
              ...prev, 
              valor: 0 
            }));
          }
        }
      );
    } else if (calculatedDays === 0 || !isValidRange || !dateValidation.isValid) {
      // ✅ Limpiar valor cuando no hay días válidos o fechas fuera del período
      setFormData(prev => ({ 
        ...prev, 
        valor: 0 
      }));
    }
  }, [formData.subtipo, formData.fecha_inicio, formData.fecha_fin, calculatedDays, isValidRange, dateValidation.isValid, employeeSalary, calculateNovedadDebounced, periodoFecha]);

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

    // ✅ NUEVA: Validación de período antes del submit
    if (!dateValidation.isValid) {
      alert(dateValidation.message);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b bg-white">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold text-gray-900">Incapacidad</h3>
      </div>

      {/* ✅ NUEVO: Información del período */}
      {periodStartDate && periodEndDate && (
        <div className="bg-blue-50 p-3 rounded border border-blue-200">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              Período de liquidación: {periodStartDate} - {periodEndDate}
            </span>
          </div>
          <div className="text-xs text-blue-700 mt-1">
            La incapacidad debe estar dentro de estas fechas
          </div>
        </div>
      )}

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
          
          {/* ✅ MEJORA UX: Información normativa clara */}
          {currentSubtipoInfo && (
            <div className="mt-2 p-2 bg-blue-100 rounded text-xs">
              <div className="flex items-start gap-2">
                <Info className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-blue-800">
                    Cobertura: {currentSubtipoInfo.porcentaje}%
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
              className={`${!dateValidation.isValid && formData.fecha_inicio ? 'border-red-300 bg-red-50' : ''}`}
            />
          </div>

          <div>
            <Label htmlFor="fecha_fin" className="text-gray-700">Fecha Fin *</Label>
            <Input
              type="date"
              value={formData.fecha_fin}
              onChange={(e) => handleInputChange('fecha_fin', e.target.value)}
              className={`${!dateValidation.isValid && formData.fecha_fin ? 'border-red-300 bg-red-50' : ''}`}
            />
            {!isValidRange && formData.fecha_inicio && formData.fecha_fin && (
              <div className="text-xs text-red-600 mt-1">
                La fecha de fin debe ser igual o posterior a la fecha de inicio
              </div>
            )}
          </div>
        </div>

        {/* ✅ NUEVA: Validación visual de fechas */}
        {!dateValidation.isValid && formData.fecha_inicio && formData.fecha_fin && (
          <div className="bg-red-50 p-3 rounded border border-red-200">
            <div className="flex items-center gap-2">
              <span className="text-red-600">❌</span>
              <span className="text-sm text-red-700 font-medium">
                Fechas fuera del período
              </span>
            </div>
            <div className="text-xs text-red-600 mt-1">
              {dateValidation.message}
            </div>
          </div>
        )}

        {/* ✅ ACTUALIZADO: Mostrar días calculados con validación */}
        {formData.fecha_inicio && formData.fecha_fin && (
          <div className={`p-3 rounded border ${dateValidation.isValid ? 'bg-white border-blue-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                Días calculados: 
              </span>
              <Badge variant="secondary" className={`${dateValidation.isValid ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                {isValidRange ? `${calculatedDays} días` : 'Rango inválido'}
              </Badge>
              {dateValidation.isValid && (
                <span className="text-green-600 text-sm">✅</span>
              )}
            </div>
            {isValidRange && dateValidation.isValid && (
              <div className="text-xs text-gray-600 mt-1">
                Del {formData.fecha_inicio} al {formData.fecha_fin} (ambos días incluidos)
              </div>
            )}
          </div>
        )}

        {/* ✅ MEJORA UX: Feedback de cálculo más claro */}
        {isLoading && calculatedDays > 0 && (
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-600 animate-spin" />
              <span className="text-sm text-blue-700">
                Calculando valor para {calculatedDays} días según normativa colombiana...
              </span>
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="valor" className="text-gray-700">
            Valor Calculado *
            {formData.valor > 0 && currentSubtipoInfo && (
              <span className="text-xs text-green-600 ml-2">
                ({currentSubtipoInfo.porcentaje}% del salario proporcional)
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

        {/* ✅ Preview mejorado */}
        {formData.valor > 0 && calculatedDays > 0 && (
          <div className="bg-green-50 p-3 rounded text-center border border-green-200">
            <Badge variant="secondary" className="bg-green-100 text-green-800 text-base px-4 py-2">
              +{formatCurrency(formData.valor)}
            </Badge>
            <div className="text-sm text-gray-700 mt-2">
              {calculatedDays} días de incapacidad {currentSubtipoInfo?.label.toLowerCase()}
            </div>
            {currentSubtipoInfo && (
              <div className="text-xs text-gray-600 mt-1">
                Calculado al {currentSubtipoInfo.porcentaje}% según normativa colombiana
              </div>
            )}
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
          disabled={!formData.fecha_inicio || !formData.fecha_fin || !isValidRange || !dateValidation.isValid || calculatedDays <= 0 || formData.valor <= 0 || isSubmitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? 'Guardando...' : 'Guardar Incapacidad'}
        </Button>
      </div>
    </div>
  );
};
