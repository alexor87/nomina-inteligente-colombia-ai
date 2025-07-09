
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calculator, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useNovedadCalculation } from '@/hooks/useNovedadCalculation';
import { NovedadType } from '@/types/novedades-enhanced';

interface NovedadBonificacionFormProps {
  onBack: () => void;
  onSubmit: (formData: any) => void;
  employeeSalary: number;
  calculateSuggestedValue?: (
    tipoNovedad: NovedadType,
    subtipo: string | undefined,
    horas?: number,
    dias?: number
  ) => number | null;
}

export const NovedadBonificacionForm: React.FC<NovedadBonificacionFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary,
  calculateSuggestedValue
}) => {
  const [formData, setFormData] = useState({
    tipo_novedad: 'bonificacion' as NovedadType,
    subtipo: 'bonificacion_desempeno',
    valor: '',
    observacion: '',
    constitutivo_salario: false, // ✅ NUEVO: Campo para bonificaciones constitutivas
    base_calculo: ''
  });

  const { calculatedValue, calculateValue } = useNovedadCalculation({
    employeeSalary,
    calculateSuggestedValue
  });

  const BONIFICACION_SUBTIPOS = [
    { value: 'bonificacion_desempeno', label: 'Bonificación por Desempeño', description: 'Reconocimiento por metas alcanzadas' },
    { value: 'bonificacion_productividad', label: 'Bonificación por Productividad', description: 'Incentivo por rendimiento superior' },
    { value: 'bonificacion_ventas', label: 'Bonificación por Ventas', description: 'Comisión adicional por ventas' },
    { value: 'bonificacion_especial', label: 'Bonificación Especial', description: 'Otros tipos de bonificaciones' },
    { value: 'auxilio_alimentacion', label: 'Auxilio de Alimentación', description: 'Subsidio para alimentación' },
    { value: 'auxilio_educacion', label: 'Auxilio de Educación', description: 'Subsidio educativo para empleado o familia' },
    { value: 'auxilio_vivienda', label: 'Auxilio de Vivienda', description: 'Subsidio para gastos de vivienda' }
  ];

  // Calcular valor sugerido automáticamente
  useEffect(() => {
    if (formData.subtipo && formData.valor && parseFloat(formData.valor) > 0) {
      calculateValue(
        formData.tipo_novedad,
        formData.subtipo,
        undefined,
        undefined
      );
    }
  }, [formData.subtipo, formData.valor, calculateValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.valor || parseFloat(formData.valor) <= 0) {
      alert('Por favor ingrese un valor válido');
      return;
    }

    // ✅ ENVIAR DATOS CON CAMPO CONSTITUTIVO_SALARIO
    const submitData = {
      tipo_novedad: formData.tipo_novedad,
      subtipo: formData.subtipo,
      valor: parseFloat(formData.valor),
      observacion: formData.observacion,
      constitutivo_salario: formData.constitutivo_salario, // ✅ NUEVO: Incluir flag constitutivo
      base_calculo: formData.base_calculo
    };

    console.log('📋 Enviando bonificación:', submitData);
    onSubmit(submitData);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getSubtipoInfo = (subtipo: string) => {
    return BONIFICACION_SUBTIPOS.find(s => s.value === subtipo);
  };

  const currentSubtipo = getSubtipoInfo(formData.subtipo);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Bonificaciones y Auxilios</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tipo de bonificación */}
        <div className="space-y-2">
          <Label>Tipo de Bonificación</Label>
          <select
            className="w-full p-2 border rounded-md"
            value={formData.subtipo}
            onChange={(e) => handleInputChange('subtipo', e.target.value)}
          >
            {BONIFICACION_SUBTIPOS.map((subtipo) => (
              <option key={subtipo.value} value={subtipo.value}>
                {subtipo.label}
              </option>
            ))}
          </select>
          {currentSubtipo && (
            <p className="text-sm text-gray-600">{currentSubtipo.description}</p>
          )}
        </div>

        {/* Valor */}
        <div className="space-y-2">
          <Label>Valor de la Bonificación</Label>
          <Input
            type="number"
            min="0"
            step="1000"
            value={formData.valor}
            onChange={(e) => handleInputChange('valor', e.target.value)}
            placeholder="0"
          />
          {formData.valor && parseFloat(formData.valor) > 0 && (
            <div className="mt-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {formatCurrency(parseFloat(formData.valor))}
              </Badge>
            </div>
          )}
        </div>

        {/* ✅ NUEVO: Checkbox constitutivo de salario */}
        <div className="space-y-3 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="constitutivo_salario"
              checked={formData.constitutivo_salario}
              onCheckedChange={(checked) => handleInputChange('constitutivo_salario', checked)}
              className="mt-1"
            />
            <div className="flex-1">
              <Label 
                htmlFor="constitutivo_salario" 
                className="text-sm font-medium text-blue-800 cursor-pointer"
              >
                ¿Es constitutivo de salario?
              </Label>
              <p className="text-sm text-blue-700 mt-1">
                Este campo es crítico porque afecta directamente el cálculo de prestaciones sociales, aportes y retención.
              </p>
            </div>
          </div>
          
          {/* Explicación dinámica */}
          <div className="mt-3 p-3 rounded bg-white border">
            {formData.constitutivo_salario ? (
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800">Si se marca:</p>
                  <p className="text-xs text-green-700 mt-1">
                    El valor se suma al salario base para calcular: cesantías, intereses de cesantías, prima, vacaciones y seguridad social.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Si no se marca:</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Solo se refleja como un devengo no constitutivo de salario (no suma para liquidaciones ni aportes).
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Base de cálculo */}
        <div className="space-y-2">
          <Label>Base de Cálculo (opcional)</Label>
          <Input
            type="text"
            value={formData.base_calculo}
            onChange={(e) => handleInputChange('base_calculo', e.target.value)}
            placeholder="Ej: 15% del salario base, metas mensuales, etc."
          />
        </div>

        {/* Observaciones */}
        <div className="space-y-2">
          <Label>Observaciones</Label>
          <Textarea
            value={formData.observacion}
            onChange={(e) => handleInputChange('observacion', e.target.value)}
            placeholder="Detalles adicionales sobre la bonificación..."
            rows={3}
          />
        </div>

        {/* Botones de acción */}
        <div className="flex justify-between pt-4 border-t">
          <Button type="button" variant="outline" onClick={onBack}>
            Cancelar
          </Button>
          <Button 
            type="submit"
            disabled={!formData.valor || parseFloat(formData.valor) <= 0}
            className="bg-green-600 hover:bg-green-700"
          >
            Agregar Bonificación
          </Button>
        </div>
      </form>
    </div>
  );
};
