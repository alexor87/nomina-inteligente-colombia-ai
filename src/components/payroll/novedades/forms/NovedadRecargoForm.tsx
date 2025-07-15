
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calculator, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { NovedadType } from '@/types/novedades-enhanced';
import { RecargosCalculationService } from '@/services/RecargosCalculationService';

interface NovedadRecargoFormProps {
  onBack: () => void;
  onSubmit: (formData: any) => void;
  employeeSalary: number;
  periodoFecha?: Date;
  calculateSuggestedValue?: (
    tipoNovedad: NovedadType,
    subtipo: string | undefined,
    horas?: number,
    dias?: number
  ) => number | null;
}

// ✅ KISS: Mapeo correcto de tipos de recargo (CORREGIDO)
const RECARGO_SUBTIPOS = [
  { value: 'nocturno', label: 'Nocturno (35%)', description: '10:00 PM - 6:00 AM' },
  { value: 'dominical', label: 'Dominical (80%)', description: 'Trabajo en domingo' },
  { value: 'festivo', label: 'Festivo (80%)', description: 'Trabajo en día festivo' },
  { value: 'nocturno_dominical', label: 'Nocturno Dominical (108%)', description: 'Domingo 10:00 PM - 6:00 AM' },
  { value: 'nocturno_festivo', label: 'Nocturno Festivo (108%)', description: 'Festivo 10:00 PM - 6:00 AM' }
];

export const NovedadRecargoForm: React.FC<NovedadRecargoFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary,
  periodoFecha
}) => {
  // ✅ FIX: Estado inicial con valor correcto
  const [formData, setFormData] = useState({
    subtipo: 'nocturno',
    horas: '',
    valor: 0,
    observacion: ''
  });

  const [calculatedValue, setCalculatedValue] = useState<number | null>(null);
  const [jornadaInfo, setJornadaInfo] = useState<any>(null);

  // ✅ FIX: Función de cálculo mejorada con validaciones
  const calculateRecargoValue = (subtipo: string, horas: number) => {
    console.log('🔧 FIX: Iniciando cálculo con parámetros:', {
      subtipo,
      horas,
      employeeSalary,
      periodoFecha: periodoFecha?.toISOString().split('T')[0]
    });

    // ✅ FIX: Validaciones estrictas
    if (!employeeSalary || employeeSalary <= 0) {
      console.error('❌ FIX: Salario inválido:', employeeSalary);
      return null;
    }

    if (!horas || horas <= 0) {
      console.error('❌ FIX: Horas inválidas:', horas);
      return null;
    }

    if (!periodoFecha) {
      console.error('❌ FIX: Fecha de período no válida:', periodoFecha);
      return null;
    }

    try {
      console.log('💰 FIX: Calculando recargo con datos válidos:', {
        subtipo,
        tipoRecargo: subtipo,
        horas,
        salarioBase: employeeSalary,
        fechaPeriodo: periodoFecha
      });
      
      const result = RecargosCalculationService.calcularRecargo({
        salarioBase: employeeSalary,
        tipoRecargo: subtipo as any,
        horas: horas,
        fechaPeriodo: periodoFecha
      });
      
      console.log('✅ FIX: Resultado del cálculo:', {
        valorCalculado: result.valorRecargo,
        factorAplicado: result.factorRecargo,
        detalleCalculo: result.detalleCalculo,
        jornadaInfo: result.jornadaInfo
      });
      
      setJornadaInfo(result.jornadaInfo);
      return result.valorRecargo;
    } catch (error) {
      console.error('❌ FIX: Error en cálculo:', error);
      return null;
    }
  };

  // ✅ FIX: Effect mejorado para calcular valor automáticamente
  useEffect(() => {
    console.log('🔄 FIX: useEffect disparado con:', {
      horas: formData.horas,
      subtipo: formData.subtipo,
      employeeSalary,
      periodoFecha
    });

    if (formData.horas && parseFloat(formData.horas) > 0 && employeeSalary > 0) {
      const horasNum = parseFloat(formData.horas);
      console.log('🧮 FIX: Ejecutando cálculo automático...');
      
      const calculated = calculateRecargoValue(formData.subtipo, horasNum);
      console.log('📊 FIX: Valor calculado:', calculated);
      
      setCalculatedValue(calculated);
    } else {
      console.log('⏳ FIX: No se puede calcular - datos incompletos');
      setCalculatedValue(null);
    }
  }, [formData.subtipo, formData.horas, employeeSalary, periodoFecha]);

  // ✅ FIX: Effect mejorado para aplicar valor calculado
  useEffect(() => {
    console.log('💫 FIX: Aplicando valor calculado:', {
      calculatedValue,
      currentFormValue: formData.valor
    });

    if (calculatedValue !== null && calculatedValue > 0) {
      console.log('✅ FIX: Aplicando valor calculado al formulario:', calculatedValue);
      setFormData(prev => ({ 
        ...prev, 
        valor: calculatedValue 
      }));
    } else if (calculatedValue === 0) {
      console.warn('⚠️ FIX: Valor calculado es 0 - verificar datos');
    }
  }, [calculatedValue]);

  const handleInputChange = (field: string, value: any) => {
    console.log('📝 FIX: Cambiando campo:', field, 'a valor:', value);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    console.log('🚀 FIX: Intentando enviar formulario:', formData);

    if (!formData.horas || parseFloat(formData.horas) <= 0) {
      alert('Por favor ingrese las horas de recargo');
      return;
    }

    if (formData.valor <= 0) {
      alert('El valor debe ser mayor a 0. Valor actual: ' + formData.valor);
      return;
    }

    const submitData = {
      tipo_novedad: 'recargo_nocturno',
      subtipo: formData.subtipo,
      horas: parseFloat(formData.horas),
      valor: formData.valor,
      observacion: formData.observacion || undefined
    };

    console.log('📤 FIX: Enviando datos corregidos:', submitData);
    onSubmit(submitData);
  };

  const getSubtipoInfo = (subtipo: string) => {
    return RECARGO_SUBTIPOS.find(s => s.value === subtipo);
  };

  const currentSubtipoInfo = getSubtipoInfo(formData.subtipo);

  // ✅ FIX: Debug de datos de entrada
  console.log('🔍 FIX: Estado actual del componente:', {
    employeeSalary,
    periodoFecha,
    formData,
    calculatedValue,
    jornadaInfo
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Recargo</h3>
      </div>

      {/* ✅ FIX: Debug info visible */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 p-3 rounded text-xs">
          <strong>DEBUG:</strong> Salario: {employeeSalary}, Fecha: {periodoFecha?.toISOString().split('T')[0]}, 
          Valor calculado: {calculatedValue}, Valor formulario: {formData.valor}
        </div>
      )}

      {/* Información de jornada legal usada */}
      {jornadaInfo && (
        <div className="flex items-center gap-2 bg-blue-50 p-3 rounded text-sm text-blue-700">
          <Info className="h-4 w-4" />
          <span>
            Jornada legal: {jornadaInfo.horasSemanales}h semanales = {jornadaInfo.divisorHorario}h mensuales
            {periodoFecha && ` (vigente desde ${periodoFecha.toLocaleDateString()})`}
          </span>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Tipo de Recargo</Label>
          <Select
            value={formData.subtipo}
            onValueChange={(value) => handleInputChange('subtipo', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RECARGO_SUBTIPOS.map((subtipo) => (
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
            <div className="text-sm text-blue-600">
              <strong>Horario:</strong> {currentSubtipoInfo.description}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Cantidad de Horas *</Label>
          <Input
            type="number"
            min="0"
            max="8"
            step="0.5"
            value={formData.horas}
            onChange={(e) => handleInputChange('horas', e.target.value)}
            placeholder="0"
          />
          <div className="text-xs text-gray-500">
            Máximo 8 horas por jornada
          </div>
        </div>

        {/* ✅ FIX: Mostrar valor calculado con más información */}
        {calculatedValue !== null && calculatedValue > 0 && (
          <div className="flex items-center justify-between bg-green-50 p-3 rounded">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">Valor calculado automáticamente:</span>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {formatCurrency(calculatedValue)}
            </Badge>
          </div>
        )}

        {/* ✅ FIX: Mostrar advertencia si valor es 0 */}
        {calculatedValue === 0 && formData.horas && parseFloat(formData.horas) > 0 && (
          <div className="flex items-center gap-2 bg-yellow-50 p-3 rounded text-sm text-yellow-700">
            <Info className="h-4 w-4" />
            <span>Advertencia: El cálculo resultó en $0. Verifica los datos.</span>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Valor *</Label>
            {calculatedValue && calculatedValue !== formData.valor && calculatedValue > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleInputChange('valor', calculatedValue)}
                className="text-xs h-7 px-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
              >
                <Calculator className="h-3 w-3 mr-1" />
                Usar calculado: {formatCurrency(calculatedValue)}
              </Button>
            )}
          </div>

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

        <div className="space-y-2">
          <Label>Observaciones</Label>
          <Textarea
            value={formData.observacion}
            onChange={(e) => handleInputChange('observacion', e.target.value)}
            placeholder="Turno, horario específico, etc..."
            rows={3}
          />
        </div>

        {/* Preview */}
        {formData.valor > 0 && (
          <div className="p-3 bg-gray-50 rounded text-center">
            <Badge variant="default" className="text-sm px-3 py-1">
              +{formatCurrency(formData.valor)}
            </Badge>
            <div className="text-xs text-gray-500 mt-1">
              {formData.horas} horas de recargo {formData.subtipo}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!formData.horas || formData.valor <= 0}
        >
          Guardar Recargo
        </Button>
      </div>
    </div>
  );
};
