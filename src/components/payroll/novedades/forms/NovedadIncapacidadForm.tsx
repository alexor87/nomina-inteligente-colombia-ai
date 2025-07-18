
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calculator, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useNovedadBackendCalculation } from '@/hooks/useNovedadBackendCalculation';
import { NovedadType } from '@/types/novedades-enhanced';

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
  },
  { 
    value: 'maternidad', 
    label: 'Maternidad - EPS (100%)', 
    description: 'EPS paga al 100%',
    porcentaje: 100,
    normativa: 'Ley 1822/2017 - 18 semanas de licencia remunerada'
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
    dias: '',
    fecha_inicio: '',
    fecha_fin: '',
    valor: 0,
    observacion: ''
  });

  const { calculateNovedadDebounced, isLoading } = useNovedadBackendCalculation();

  // ✅ CORRECCIÓN SINCRONIZACIÓN: useEffect optimizado sin race conditions
  useEffect(() => {
    const diasNum = parseInt(formData.dias);
    
    if (diasNum > 0 && formData.subtipo && employeeSalary > 0) {
      console.log('🔄 Triggering calculation for incapacidad:', {
        subtipo: formData.subtipo,
        dias: diasNum,
        salario: employeeSalary,
        periodo: periodoFecha
      });
      
      // ✅ KISS: Callback directo que actualiza el estado inmediatamente
      calculateNovedadDebounced(
        {
          tipoNovedad: 'incapacidad' as NovedadType,
          subtipo: formData.subtipo,
          salarioBase: employeeSalary,
          dias: diasNum,
          fechaPeriodo: periodoFecha || new Date()
        },
        (result) => {
          if (result && result.valor > 0) {
            console.log('💰 Updating calculated value:', result.valor);
            
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
    } else if (diasNum === 0 || !formData.dias) {
      // ✅ Limpiar valor cuando no hay días
      setFormData(prev => ({ 
        ...prev, 
        valor: 0 
      }));
    }
  }, [formData.subtipo, formData.dias, employeeSalary, calculateNovedadDebounced, periodoFecha]);

  // ✅ MEJORA UX: Calcular fechas automáticamente
  const calculateEndDate = useCallback((startDate: string, days: number) => {
    if (!startDate || days <= 0) return '';
    
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + days - 1); // -1 porque incluye el día inicial
    
    return end.toISOString().split('T')[0];
  }, []);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // ✅ Auto-calcular fecha fin cuando cambie inicio o días
      if (field === 'fecha_inicio' || field === 'dias') {
        const dias = field === 'dias' ? parseInt(value) || 0 : parseInt(prev.dias) || 0;
        const fechaInicio = field === 'fecha_inicio' ? value : prev.fecha_inicio;
        
        if (fechaInicio && dias > 0) {
          newData.fecha_fin = calculateEndDate(fechaInicio, dias);
        }
      }
      
      return newData;
    });
  };

  const handleSubmit = () => {
    if (!formData.dias || parseInt(formData.dias) <= 0) {
      alert('Por favor ingrese los días de incapacidad');
      return;
    }

    if (!formData.fecha_inicio) {
      alert('Por favor seleccione la fecha de inicio');
      return;
    }

    if (!formData.fecha_fin) {
      alert('Por favor seleccione la fecha de fin');
      return;
    }

    if (formData.valor <= 0) {
      alert('El valor debe ser mayor a 0');
      return;
    }

    const submitData = {
      tipo_novedad: 'incapacidad',
      subtipo: formData.subtipo,
      dias: parseInt(formData.dias),
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

        <div>
          <Label htmlFor="dias" className="text-gray-700">Días de Incapacidad *</Label>
          <Input
            type="number"
            min="1"
            value={formData.dias}
            onChange={(e) => handleInputChange('dias', e.target.value)}
            placeholder="0"
          />
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
            <Label htmlFor="fecha_fin" className="text-gray-700">
              Fecha Fin * 
              {formData.fecha_inicio && formData.dias && (
                <span className="text-xs text-gray-500 ml-1">(calculada automáticamente)</span>
              )}
            </Label>
            <Input
              type="date"
              value={formData.fecha_fin}
              onChange={(e) => handleInputChange('fecha_fin', e.target.value)}
            />
          </div>
        </div>

        {/* ✅ MEJORA UX: Feedback de cálculo más claro */}
        {isLoading && (
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-600 animate-spin" />
              <span className="text-sm text-blue-700">Calculando valor según normativa colombiana...</span>
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
        {formData.valor > 0 && (
          <div className="bg-green-50 p-3 rounded text-center border border-green-200">
            <Badge variant="secondary" className="bg-green-100 text-green-800 text-base px-4 py-2">
              +{formatCurrency(formData.valor)}
            </Badge>
            <div className="text-sm text-gray-700 mt-2">
              {formData.dias} días de incapacidad {currentSubtipoInfo?.label.toLowerCase()}
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
          disabled={!formData.dias || !formData.fecha_inicio || !formData.fecha_fin || formData.valor <= 0 || isSubmitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? 'Guardando...' : 'Guardar Incapacidad'}
        </Button>
      </div>
    </div>
  );
};
