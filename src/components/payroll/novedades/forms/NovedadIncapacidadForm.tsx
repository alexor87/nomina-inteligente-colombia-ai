
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calculator, Info, Calendar, AlertTriangle } from 'lucide-react';
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
  periodoFecha
}) => {
  const [formData, setFormData] = useState({
    subtipo: 'general',
    fecha_inicio: '',
    fecha_fin: '',
    valor: 0,
    observacion: ''
  });

  const { calculateNovedadDebounced, isLoading } = useNovedadBackendCalculation();

  // ✅ CORRECCIÓN CRÍTICA: Calcular días automáticamente
  const calculatedDays = calculateDaysBetween(formData.fecha_inicio, formData.fecha_fin);
  const isValidRange = isValidDateRange(formData.fecha_inicio, formData.fecha_fin);

  console.log('🔍 AUDIT - Form state:', {
    subtipo: formData.subtipo,
    fechaInicio: formData.fecha_inicio,
    fechaFin: formData.fecha_fin,
    calculatedDays,
    isValidRange,
    employeeSalary,
    valor: formData.valor,
    periodoFecha: periodoFecha?.toISOString()
  });

  // ✅ CORRECCIÓN: Cálculo automático simplificado con logging detallado
  useEffect(() => {
    console.log('🚀 AUDIT - useEffect triggered:', {
      hasStartDate: !!formData.fecha_inicio,
      hasEndDate: !!formData.fecha_fin,
      isValidRange,
      calculatedDays,
      employeeSalary,
      subtipo: formData.subtipo
    });

    // ✅ VALIDACIÓN ESENCIAL ÚNICAMENTE
    if (!formData.fecha_inicio || !formData.fecha_fin) {
      console.log('⏳ AUDIT - Esperando fechas completas');
      return;
    }

    if (!isValidRange) {
      console.log('❌ AUDIT - Rango de fechas inválido');
      return;
    }

    if (calculatedDays <= 0) {
      console.log('❌ AUDIT - Días calculados <= 0:', calculatedDays);
      return;
    }

    if (!employeeSalary || employeeSalary <= 0) {
      console.log('❌ AUDIT - Salario inválido:', employeeSalary);
      return;
    }

    // ✅ FORMATEO CORRECTO DE FECHA
    const fechaPeriodoISO = periodoFecha ? periodoFecha.toISOString() : new Date().toISOString();
    
    console.log('🎯 AUDIT - Iniciando cálculo:', {
      tipoNovedad: 'incapacidad',
      subtipo: formData.subtipo,
      salarioBase: employeeSalary,
      dias: calculatedDays,
      fechaPeriodo: fechaPeriodoISO
    });
    
    // ✅ CORRECCIÓN: Llamada inmediata sin debounce para debugging
    calculateNovedadDebounced(
      {
        tipoNovedad: 'incapacidad' as NovedadType,
        subtipo: formData.subtipo,
        salarioBase: employeeSalary,
        dias: calculatedDays,
        fechaPeriodo: fechaPeriodoISO
      },
      (result) => {
        console.log('📊 AUDIT - Resultado recibido:', result);
        
        if (result && typeof result.valor === 'number') {
          if (result.valor >= 0) { // ✅ CORRECCIÓN: Permitir valor 0 temporalmente
            console.log('✅ AUDIT - Valor calculado:', result.valor);
            setFormData(prev => ({ 
              ...prev, 
              valor: result.valor 
            }));
          } else {
            console.log('⚠️ AUDIT - Valor negativo recibido:', result.valor);
            setFormData(prev => ({ 
              ...prev, 
              valor: 0 
            }));
          }
        } else {
          console.log('❌ AUDIT - Resultado inválido o nulo:', result);
          setFormData(prev => ({ 
            ...prev, 
            valor: 0 
          }));
        }
      },
      0 // Sin delay para debugging inmediato
    );
  }, [formData.subtipo, formData.fecha_inicio, formData.fecha_fin, calculatedDays, isValidRange, employeeSalary, calculateNovedadDebounced, periodoFecha]);

  const handleInputChange = (field: string, value: any) => {
    console.log('🔄 AUDIT - Campo actualizado:', field, '=', value);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // ✅ CORRECCIÓN CRÍTICA: Validación menos restrictiva y envío correcto de días
  const handleSubmit = () => {
    console.log('📤 AUDIT - Iniciando validación de envío:', {
      fecha_inicio: formData.fecha_inicio,
      fecha_fin: formData.fecha_fin,
      isValidRange,
      calculatedDays,
      valor: formData.valor,
      subtipo: formData.subtipo
    });

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

    // ✅ CORRECCIÓN CRÍTICA: Permitir envío con valor 0 para recalcular después
    // if (formData.valor <= 0) {
    //   alert('El valor debe ser mayor a 0');
    //   return;
    // }

    // ✅ CORRECCIÓN CRÍTICA: Asegurar que se envíen los días calculados
    const submitData = {
      tipo_novedad: 'incapacidad',
      subtipo: formData.subtipo,
      dias: calculatedDays, // ✅ CRÍTICO: Usar calculatedDays, no formData.dias
      fecha_inicio: formData.fecha_inicio,
      fecha_fin: formData.fecha_fin,
      valor: formData.valor,
      observacion: formData.observacion || undefined
    };

    console.log('📤 AUDIT - Datos de envío finales:', submitData);
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
            />
          </div>

          <div>
            <Label htmlFor="fecha_fin" className="text-gray-700">Fecha Fin *</Label>
            <Input
              type="date"
              value={formData.fecha_fin}
              onChange={(e) => handleInputChange('fecha_fin', e.target.value)}
            />
            {!isValidRange && formData.fecha_inicio && formData.fecha_fin && (
              <div className="text-xs text-red-600 mt-1">
                La fecha de fin debe ser igual o posterior a la fecha de inicio
              </div>
            )}
          </div>
        </div>

        {/* Días calculados automáticamente */}
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

        {/* ✅ AUDIT: Mostrar estado del cálculo con más detalle */}
        {isLoading && calculatedDays > 0 && (
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-600 animate-spin" />
              <span className="text-sm text-blue-700">
                Calculando incapacidad {formData.subtipo} para {calculatedDays} días...
              </span>
            </div>
            <div className="text-xs text-blue-600 mt-1">
              Salario base: {formatCurrency(employeeSalary)} | Subtipo: {formData.subtipo}
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="valor" className="text-gray-700">
            Valor Calculado *
            {formData.valor > 0 && currentSubtipoInfo && (
              <span className="text-xs text-green-600 ml-2">
                ({currentSubtipoInfo.porcentaje}% según normativa colombiana)
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
          {/* ✅ AUDIT: Mejorar feedback para valor 0 */}
          {formData.valor === 0 && calculatedDays > 0 && (
            <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Valor en $0 - Se recalculará automáticamente después de guardar
            </div>
          )}
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

        {/* Preview mejorado */}
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
          disabled={!formData.fecha_inicio || !formData.fecha_fin || !isValidRange || calculatedDays <= 0 || isSubmitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? 'Guardando...' : 'Guardar Incapacidad'}
        </Button>
      </div>
    </div>
  );
};
