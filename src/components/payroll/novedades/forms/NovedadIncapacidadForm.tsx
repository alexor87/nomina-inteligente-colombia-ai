
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calculator, Info, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useNovedadBackendCalculation } from '@/hooks/useNovedadBackendCalculation';
import { NovedadType } from '@/types/novedades-enhanced';
import { calculateDaysBetween, isValidDateRange } from '@/utils/dateUtils';
import { IncapacidadDebugger } from '../IncapacidadDebugger';

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

  // ✅ LOGGING V2.0: Exhaustivo para rastrear flujo completo
  console.log('🔍 [INCAP FORM V2.0] Estado actual:', {
    subtipo: formData.subtipo,
    fechaInicio: formData.fecha_inicio,
    fechaFin: formData.fecha_fin,
    calculatedDays,
    isValidRange,
    employeeSalary,
    valorActual: formData.valor,
    periodoFecha: periodoFecha?.toISOString(),
    timestamp: new Date().toISOString()
  });

  // ✅ LOGGING V2.0: Rastrear cambios en calculatedDays
  useEffect(() => {
    console.log('📊 [INCAP V2.0] calculatedDays cambió:', {
      previous: 'N/A',
      current: calculatedDays,
      fechas: {
        inicio: formData.fecha_inicio,
        fin: formData.fecha_fin
      },
      timestamp: new Date().toISOString()
    });
  }, [calculatedDays]);

  // ✅ CORRECCIÓN: Cálculo automático con validación estricta
  useEffect(() => {
    console.log('🚀 [INCAP FORM V2.0] useEffect cálculo disparado:', {
      hasStartDate: !!formData.fecha_inicio,
      hasEndDate: !!formData.fecha_fin,
      isValidRange,
      calculatedDays,
      employeeSalary,
      subtipo: formData.subtipo,
      timestamp: new Date().toISOString()
    });

    // Validaciones críticas
    if (!formData.fecha_inicio || !formData.fecha_fin) {
      console.log('⏳ [INCAP V2.0] Esperando fechas completas');
      return;
    }

    if (!isValidRange) {
      console.log('❌ [INCAP V2.0] Rango de fechas inválido');
      setFormData(prev => ({ ...prev, valor: 0 }));
      return;
    }

    if (calculatedDays <= 0) {
      console.log('❌ [INCAP V2.0] Días calculados <= 0:', calculatedDays);
      setFormData(prev => ({ ...prev, valor: 0 }));
      return;
    }

    if (!employeeSalary || employeeSalary <= 0) {
      console.log('❌ [INCAP V2.0] Salario inválido:', employeeSalary);
      setFormData(prev => ({ ...prev, valor: 0 }));
      return;
    }

    // ✅ CORRECCIÓN CRÍTICA: Formateo correcto de fecha
    const fechaPeriodoISO = periodoFecha ? periodoFecha.toISOString() : new Date().toISOString();
    
    console.log('🎯 [INCAP V2.0] ENVIANDO AL BACKEND:', {
      tipoNovedad: 'incapacidad',
      subtipo: formData.subtipo,
      salarioBase: employeeSalary,
      dias: calculatedDays, // ✅ CRÍTICO: Enviar días calculados
      fechaPeriodo: fechaPeriodoISO,
      timestamp: new Date().toISOString()
    });
    
    // ✅ ENVÍO INMEDIATO PARA TESTING
    calculateNovedadDebounced(
      {
        tipoNovedad: 'incapacidad' as NovedadType,
        subtipo: formData.subtipo,
        salarioBase: employeeSalary,
        dias: calculatedDays, // ✅ CRÍTICO: días calculados correctos
        fechaPeriodo: fechaPeriodoISO
      },
      (result) => {
        console.log('📊 [INCAP V2.0] RESULTADO DEL BACKEND:', {
          result,
          diasEnviados: calculatedDays,
          valorRecibido: result?.valor,
          timestamp: new Date().toISOString()
        });
        
        if (result && typeof result.valor === 'number') {
          console.log('✅ [INCAP V2.0] Valor calculado exitoso:', result.valor);
          setFormData(prev => ({ 
            ...prev, 
            valor: result.valor 
          }));
        } else {
          console.log('❌ [INCAP V2.0] Error en cálculo:', result);
          setFormData(prev => ({ 
            ...prev, 
            valor: 0 
          }));
        }
      },
      0 // Sin delay para testing inmediato
    );
  }, [formData.subtipo, formData.fecha_inicio, formData.fecha_fin, calculatedDays, isValidRange, employeeSalary, calculateNovedadDebounced, periodoFecha]);

  const handleInputChange = (field: string, value: any) => {
    console.log('🔄 [INCAP V2.0] Campo actualizado:', field, '=', value, 'timestamp:', new Date().toISOString());
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // ✅ CORRECCIÓN CRÍTICA V2.0: Validación y envío de días correctos con logging exhaustivo
  const handleSubmit = () => {
    console.log('📤 [INCAP V2.0] ===== INICIANDO ENVÍO =====');
    console.log('📤 [INCAP V2.0] Estado del formulario:', {
      formData,
      calculatedDays,
      isValidRange,
      timestamp: new Date().toISOString()
    });

    // Validaciones básicas
    if (!formData.fecha_inicio) {
      console.error('❌ [INCAP V2.0] Falta fecha de inicio');
      alert('Por favor seleccione la fecha de inicio');
      return;
    }

    if (!formData.fecha_fin) {
      console.error('❌ [INCAP V2.0] Falta fecha de fin');
      alert('Por favor seleccione la fecha de fin');
      return;
    }

    if (!isValidRange) {
      console.error('❌ [INCAP V2.0] Rango inválido');
      alert('La fecha de fin debe ser igual o posterior a la fecha de inicio');
      return;
    }

    if (calculatedDays <= 0) {
      console.error('❌ [INCAP V2.0] Días calculados inválidos:', calculatedDays);
      alert('El rango de fechas debe generar días válidos');
      return;
    }

    // ✅ CORRECCIÓN CRÍTICA V2.0: Construcción de datos con logging
    const submitData = {
      tipo_novedad: 'incapacidad',
      subtipo: formData.subtipo,
      dias: calculatedDays, // ✅ CRÍTICO: días calculados, NO formData.dias
      fecha_inicio: formData.fecha_inicio,
      fecha_fin: formData.fecha_fin,
      valor: formData.valor, // Valor calculado por backend
      observacion: formData.observacion || undefined
    };

    console.log('📤 [INCAP V2.0] ===== DATOS FINALES DE ENVÍO =====');
    console.log('📤 [INCAP V2.0] submitData completo:', JSON.stringify(submitData, null, 2));
    console.log('📤 [INCAP V2.0] Verificación crítica:', {
      'submitData.dias': submitData.dias,
      'calculatedDays': calculatedDays,
      'son_iguales': submitData.dias === calculatedDays,
      'tipo_submitData_dias': typeof submitData.dias,
      'tipo_calculatedDays': typeof calculatedDays,
      timestamp: new Date().toISOString()
    });
    
    // ✅ VALIDACIÓN FINAL ANTES DE ENVÍO
    if (submitData.dias !== calculatedDays) {
      console.error('🚨 [INCAP V2.0] INCONSISTENCIA CRÍTICA: submitData.dias != calculatedDays');
      console.error('🚨 [INCAP V2.0] Valores:', {
        submitData_dias: submitData.dias,
        calculatedDays: calculatedDays
      });
      alert('Error crítico: inconsistencia en cálculo de días. Revisar con desarrollo.');
      return;
    }

    console.log('📤 [INCAP V2.0] ===== LLAMANDO A onSubmit =====');
    onSubmit(submitData);
  };

  const getCurrentSubtipoInfo = () => {
    return INCAPACIDAD_SUBTIPOS.find(s => s.value === formData.subtipo);
  };

  const currentSubtipoInfo = getCurrentSubtipoInfo();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b bg-white">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold text-gray-900">Incapacidad</h3>
      </div>

      {/* ✅ NUEVO V2.0: Debug panel visible para tracking */}
      <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
        <h4 className="text-yellow-800 font-medium text-sm mb-2">🔍 Debug V2.0 - Tracking de Días</h4>
        <div className="text-xs text-yellow-700 space-y-1">
          <div>Fecha inicio: <strong>{formData.fecha_inicio || 'No seleccionada'}</strong></div>
          <div>Fecha fin: <strong>{formData.fecha_fin || 'No seleccionada'}</strong></div>
          <div>Días calculados: <strong className={calculatedDays > 0 ? 'text-green-600' : 'text-red-600'}>{calculatedDays}</strong></div>
          <div>Valor calculado: <strong>${formData.valor.toLocaleString()}</strong></div>
          <div>Estado: <strong>{isValidRange ? '✅ Válido' : '❌ Inválido'}</strong></div>
        </div>
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

        {/* ✅ MEJORADO: Días calculados con validación visual */}
        {formData.fecha_inicio && formData.fecha_fin && (
          <div className="bg-white p-3 rounded border border-blue-200">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                Días calculados: 
              </span>
              {isValidRange ? (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {calculatedDays} días
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Rango inválido
                </Badge>
              )}
            </div>
            {isValidRange && (
              <div className="text-xs text-gray-600 mt-1">
                Del {formData.fecha_inicio} al {formData.fecha_fin} (ambos días incluidos)
              </div>
            )}
          </div>
        )}

        {/* ✅ MEJORADO: Estado del cálculo con más detalle */}
        {isLoading && calculatedDays > 0 && (
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-600 animate-spin" />
              <span className="text-sm text-blue-700">
                Calculando incapacidad {formData.subtipo} para {calculatedDays} días...
              </span>
            </div>
            <div className="text-xs text-blue-600 mt-1">
              Salario base: {formatCurrency(employeeSalary)} | Tipo: {currentSubtipoInfo?.label}
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
          {/* ✅ MEJORADO: Feedback más claro para valor 0 */}
          {formData.valor === 0 && calculatedDays > 0 && !isLoading && (
            <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {currentSubtipoInfo?.value === 'general' && calculatedDays <= 3 ? 
                'Valor $0 correcto: empleador paga primeros 3 días directamente' :
                'Recalculando... Si persiste en $0, verificar configuración'
              }
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

        {/* ✅ Preview mejorado con validación de consistencia */}
        {formData.valor > 0 && calculatedDays > 0 && (
          <div className="bg-green-50 p-3 rounded text-center border border-green-200">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <Badge variant="secondary" className="bg-green-100 text-green-800 text-base px-4 py-2">
                +{formatCurrency(formData.valor)}
              </Badge>
            </div>
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

      {/* ✅ NUEVO: Debugger para desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <IncapacidadDebugger
          formData={formData}
          employeeSalary={employeeSalary}
          calculatedDays={calculatedDays}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};
