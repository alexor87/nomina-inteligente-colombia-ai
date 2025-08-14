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

  // ✅ V8.0: Cálculo de días con logging exhaustivo ACTIVADO
  const calculatedDays = React.useMemo(() => {
    console.log('🔍 [FORM V8.0] ===== CALCULANDO DÍAS (DEBUGGING ACTIVADO) =====');
    console.log('🔍 [FORM V8.0] Input para cálculo:', {
      fecha_inicio: formData.fecha_inicio,
      fecha_fin: formData.fecha_fin,
      timestamp: new Date().toISOString()
    });
    
    const days = calculateDaysBetween(formData.fecha_inicio, formData.fecha_fin);
    
    console.log('🔍 [FORM V8.0] Resultado calculateDaysBetween:', {
      resultado: days,
      tipo: typeof days,
      es_numero: !isNaN(days),
      es_positivo: days > 0,
      caso_test: formData.fecha_inicio === '2025-08-05' && formData.fecha_fin === '2025-08-08' ? `CASO TEST - debería ser 4, obtuvo: ${days}` : 'otro caso',
      timestamp: new Date().toISOString()
    });
    
    return days;
  }, [formData.fecha_inicio, formData.fecha_fin]);

  const isValidRange = isValidDateRange(formData.fecha_inicio, formData.fecha_fin);

  // ✅ V8.0: Logging exhaustivo del estado
  console.log('🔍 [FORM V8.0] Estado actual completo:', {
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

  // ✅ V8.0: useEffect mejorado con validación específica
  useEffect(() => {
    console.log('🚀 [FORM V8.0] useEffect cálculo disparado:', {
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
      console.log('⏳ [FORM V8.0] Esperando fechas completas');
      return;
    }

    if (!isValidRange) {
      console.log('❌ [FORM V8.0] Rango de fechas inválido');
      setFormData(prev => ({ ...prev, valor: 0 }));
      return;
    }

    if (calculatedDays < 0) {
      console.log('❌ [FORM V8.0] Días calculados < 0:', calculatedDays);
      setFormData(prev => ({ ...prev, valor: 0 }));
      return;
    }

    if (!employeeSalary || employeeSalary <= 0) {
      console.log('❌ [FORM V8.0] Salario inválido:', employeeSalary);
      setFormData(prev => ({ ...prev, valor: 0 }));
      return;
    }

    // ✅ V8.0: Formateo correcto de fecha
    const fechaPeriodoISO = periodoFecha ? periodoFecha.toISOString() : new Date().toISOString();
    
    console.log('🎯 [FORM V8.0] ENVIANDO AL BACKEND (corregido):', {
      tipoNovedad: 'incapacidad',
      subtipo: formData.subtipo,
      salarioBase: employeeSalary,
      dias: calculatedDays,
      fechaPeriodo: fechaPeriodoISO,
      testCase: calculatedDays === 4 && formData.fecha_inicio === '2025-08-05' && formData.fecha_fin === '2025-08-08' ? 'CASO DE PRUEBA 4 DÍAS' : 'OTRO CASO',
      timestamp: new Date().toISOString()
    });
    
    // ✅ V8.0: ENVÍO INMEDIATO con días corregidos
    calculateNovedadDebounced(
      {
        tipoNovedad: 'incapacidad' as NovedadType,
        subtipo: formData.subtipo,
        salarioBase: employeeSalary,
        dias: calculatedDays, // ✅ V8.0: días calculados correctamente
        fechaPeriodo: fechaPeriodoISO
      },
      (result) => {
        console.log('📊 [FORM V8.0] RESULTADO DEL BACKEND (corregido):', {
          result,
          diasEnviados: calculatedDays,
          valorRecibido: result?.valor,
          detalleCalculo: result?.detalleCalculo,
          esCasoTest: calculatedDays === 4 ? 'SÍ - DEBE SER > $0' : 'NO',
          timestamp: new Date().toISOString()
        });
        
        if (result && typeof result.valor === 'number') {
          console.log('✅ [FORM V8.0] Valor calculado exitoso:', result.valor);
          setFormData(prev => ({ 
            ...prev, 
            valor: result.valor 
          }));
        } else {
          console.log('❌ [FORM V8.0] Error en cálculo:', result);
          setFormData(prev => ({ 
            ...prev, 
            valor: 0 
          }));
        }
      },
      0 // Sin delay para respuesta inmediata
    );
  }, [formData.subtipo, formData.fecha_inicio, formData.fecha_fin, calculatedDays, isValidRange, employeeSalary, calculateNovedadDebounced, periodoFecha]);

  const handleInputChange = (field: string, value: any) => {
    console.log('🔄 [FORM V8.0] Campo actualizado:', field, '=', value, 'timestamp:', new Date().toISOString());
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 🔍 V9.0: handleSubmit con logging crítico de diagnóstico
  const handleSubmit = () => {
    console.log('🔍 [V9.0] ===== INCAPACIDAD FORM SUBMIT - INICIANDO DIAGNÓSTICO =====');
    console.log('🔍 [V9.0] formData completo:', JSON.stringify(formData, null, 2));
    console.log('🔍 [V9.0] calculatedDays:', calculatedDays);
    console.log('🔍 [V9.0] isValidRange:', isValidRange);
    console.log('🔍 [V9.0] employeeSalary:', employeeSalary);

    // Validaciones básicas
    if (!formData.fecha_inicio) {
      console.error('❌ [FORM V8.0] Falta fecha de inicio');
      alert('Por favor seleccione la fecha de inicio');
      return;
    }

    if (!formData.fecha_fin) {
      console.error('❌ [FORM V8.0] Falta fecha de fin');
      alert('Por favor seleccione la fecha de fin');
      return;
    }

    if (!isValidRange) {
      console.error('❌ [FORM V8.0] Rango inválido');
      alert('La fecha de fin debe ser igual o posterior a la fecha de inicio');
      return;
    }

    if (calculatedDays < 0) {
      console.error('❌ [FORM V8.0] Días calculados inválidos:', calculatedDays);
      alert('El rango de fechas debe generar días válidos');
      return;
    }

    // ✅ V8.0: CONSTRUCCIÓN DE DATOS CON LOGGING CRÍTICO
    const submitData = {
      tipo_novedad: 'incapacidad',
      subtipo: formData.subtipo,
      dias: calculatedDays, // ✅ V8.0: Valor calculado correctamente
      calculatedDays: calculatedDays, // ✅ V8.0: BACKUP explícito
      fecha_inicio: formData.fecha_inicio,
      fecha_fin: formData.fecha_fin,
      valor: formData.valor,
      observacion: formData.observacion || undefined
    };

    console.log('🔍 [V9.0] ===== DATOS FINALES CONSTRUIDOS PARA MODAL =====');
    console.log('🔍 [V9.0] submitData completo:', JSON.stringify(submitData, null, 2));
    console.log('🔍 [V9.0] verificación crítica:', {
      'submitData.dias': submitData.dias,
      'submitData.valor': submitData.valor,
      'calculatedDays': calculatedDays,
      'formData.valor': formData.valor,
      'empleado_salary': employeeSalary,
      'tipo_dias': typeof submitData.dias,
      'tipo_valor': typeof submitData.valor,
      'dias_positivo': submitData.dias > 0,
      'valor_positivo': submitData.valor > 0
    });

    // 🔍 V9.0: VALIDACIÓN FINAL ANTES DE ENVÍO
    if (submitData.dias === undefined || submitData.dias === null || submitData.dias <= 0) {
      console.error('🔍 [V9.0] VALIDACIÓN FINAL FALLÓ - DÍAS INVÁLIDOS:', {
        dias: submitData.dias,
        calculatedDays: calculatedDays,
        formData_valor: formData.valor,
        error: 'Días inválidos detectados en formulario antes de envío'
      });
      
      alert(`Error crítico: Días calculados inválidos (${submitData.dias}). Verificar cálculo de fechas.`);
      return;
    }
    
    console.log('🔍 [V9.0] ===== ENVIANDO A MODAL =====');
    console.log('🔍 [V9.0] llamando onSubmit con submitData:', submitData);
    onSubmit(submitData);
    console.log('🔍 [V9.0] ===== onSubmit EJECUTADO =====');
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

      {/* ✅ V8.0: Debug panel con información crítica actualizada */}
      <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
        <h4 className="text-red-800 font-medium text-sm mb-2">🔍 Debug V8.0 ACTIVO - Logging Exhaustivo</h4>
        <div className="text-xs text-red-700 space-y-1">
          <div>Fecha inicio: <strong>{formData.fecha_inicio || 'No seleccionada'}</strong></div>
          <div>Fecha fin: <strong>{formData.fecha_fin || 'No seleccionada'}</strong></div>
          <div>Días calculados: <strong className={calculatedDays >= 0 ? calculatedDays === 4 ? 'text-green-600' : 'text-blue-600' : 'text-red-600'}>{calculatedDays}</strong></div>
          <div>Valor calculado: <strong>${formData.valor.toLocaleString()}</strong></div>
          <div>Estado: <strong>{isValidRange ? '✅ Válido' : '❌ Inválido'}</strong></div>
          <div>Caso test (5-8 ago): <strong className={formData.fecha_inicio === '2025-08-05' && formData.fecha_fin === '2025-08-08' ? calculatedDays === 4 ? 'text-green-600' : 'text-red-600' : 'text-gray-600'}>
            {formData.fecha_inicio === '2025-08-05' && formData.fecha_fin === '2025-08-08' ? 
              (calculatedDays === 4 ? '✅ CORRECTO (4 días)' : `❌ INCORRECTO (${calculatedDays} días)`) : 
              'N/A'
            }
          </strong></div>
          <div className="text-red-800 font-bold">📊 DEBUGGING: Revisa la consola para logs detallados</div>
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

        {/* ✅ V4.0: Días calculados con validación visual mejorada */}
        {formData.fecha_inicio && formData.fecha_fin && (
          <div className="bg-white p-3 rounded border border-blue-200">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                Días calculados: 
              </span>
              {isValidRange ? (
                <Badge variant="secondary" className={
                  calculatedDays === 4 ? "bg-green-100 text-green-800" : 
                  calculatedDays > 0 ? "bg-blue-100 text-blue-800" : 
                  "bg-gray-100 text-gray-800"
                }>
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

        {/* ✅ V4.0: Estado del cálculo con información específica */}
        {isLoading && calculatedDays >= 0 && (
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
            {formData.valor >= 0 && currentSubtipoInfo && (
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
          {/* ✅ V4.0: Feedback mejorado con casos específicos */}
          {formData.valor === 0 && calculatedDays >= 0 && !isLoading && (
            <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {currentSubtipoInfo?.value === 'general' && calculatedDays <= 3 ? 
                'Valor $0 correcto: empleador paga primeros 3 días directamente (Ley 100/1993)' :
                calculatedDays > 3 ? 'Si es >3 días y persiste en $0, verificar cálculo de días en dateUtils.ts' : 'Valor calculado'
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

        {/* ✅ V3.0: Preview con validación de lógica normativa */}
        {formData.valor >= 0 && calculatedDays >= 0 && (
          <div className="bg-green-50 p-3 rounded text-center border border-green-200">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <Badge variant="secondary" className="bg-green-100 text-green-800 text-base px-4 py-2">
                {formData.valor > 0 ? `+${formatCurrency(formData.valor)}` : '$0'}
              </Badge>
            </div>
            <div className="text-sm text-gray-700 mt-2">
              {calculatedDays} días de incapacidad {currentSubtipoInfo?.label.toLowerCase()}
            </div>
            {currentSubtipoInfo && (
              <div className="text-xs text-gray-600 mt-1">
                {formData.valor === 0 && calculatedDays <= 3 && currentSubtipoInfo.value === 'general' ?
                  'Empleador paga directamente según Ley 100/1993' :
                  `Calculado al ${currentSubtipoInfo.porcentaje}% según normativa colombiana`
                }
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
          disabled={!formData.fecha_inicio || !formData.fecha_fin || !isValidRange || calculatedDays < 0 || isSubmitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? 'Guardando...' : 'Guardar Incapacidad'}
        </Button>
      </div>

      {/* ✅ Debugger para desarrollo */}
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
