
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface NovedadIncapacidadFormSimpleProps {
  onBack: () => void;
  onSubmit: (data: any) => void;
  employeeSalary: number;
  isSubmitting: boolean;
}

const INCAPACIDAD_SUBTIPOS = [
  { 
    value: 'general', 
    label: 'Común - EPS (66.7%)', 
    description: 'EPS paga desde el día 4 al 66.7%'
  },
  { 
    value: 'laboral', 
    label: 'Laboral - ARL (100%)', 
    description: 'ARL paga desde el día 1 al 100%'
  }
];

export const NovedadIncapacidadFormSimple: React.FC<NovedadIncapacidadFormSimpleProps> = ({
  onBack,
  onSubmit,
  employeeSalary,
  isSubmitting
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    subtipo: 'general',
    fecha_inicio: '',
    fecha_fin: '',
    dias: '',
    valor: '',
    observacion: ''
  });

  const handleInputChange = (field: string, value: any) => {
    console.log('📝 SIMPLE FORM: Input change -', field, ':', value);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    console.log('🔥 SIMPLE FORM: Starting validation and submit process');
    console.log('🔥 SIMPLE FORM: Current formData:', formData);

    // Validaciones básicas
    if (!formData.fecha_inicio || !formData.fecha_fin) {
      toast({
        title: "Fechas requeridas",
        description: "Por favor completa las fechas de inicio y fin.",
        variant: "destructive",
      });
      return;
    }

    // ✅ V20.1: Conversión explícita y validación mejorada
    const diasNumber = parseInt(formData.dias, 10);
    const valorNumber = parseFloat(formData.valor);

    console.log('🔢 SIMPLE FORM: Number conversions -', {
      diasOriginal: formData.dias,
      diasConverted: diasNumber,
      valorOriginal: formData.valor,
      valorConverted: valorNumber
    });

    if (!formData.dias || isNaN(diasNumber) || diasNumber <= 0) {
      console.error('❌ SIMPLE FORM: Invalid dias:', formData.dias, 'converted to:', diasNumber);
      toast({
        title: "Días inválidos",
        description: "Por favor ingresa un número válido de días.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.valor || isNaN(valorNumber) || valorNumber <= 0) {
      console.error('❌ SIMPLE FORM: Invalid valor:', formData.valor, 'converted to:', valorNumber);
      toast({
        title: "Valor inválido",
        description: "Por favor ingresa un valor mayor a 0.",
        variant: "destructive",
      });
      return;
    }

    // ✅ V20.1: Datos con conversiones explícitas y verificadas
    const submitData = {
      tipo_novedad: 'incapacidad',
      subtipo: formData.subtipo,
      dias: diasNumber, // ✅ Guaranteed to be a valid number
      fecha_inicio: formData.fecha_inicio,
      fecha_fin: formData.fecha_fin,
      valor: valorNumber, // ✅ Guaranteed to be a valid number
      observacion: formData.observacion || undefined
    };

    console.log('🚀 V20.1 SIMPLE FORM: Final submit data with verified conversions:', {
      ...submitData,
      diasType: typeof submitData.dias,
      valorType: typeof submitData.valor,
      timestamp: new Date().toISOString()
    });

    onSubmit(submitData);
  };

  // ✅ V20.1: Validación mejorada con conversión explícita
  const diasNumber = parseInt(formData.dias, 10);
  const valorNumber = parseFloat(formData.valor);
  
  const isValid = formData.fecha_inicio && 
                  formData.fecha_fin && 
                  formData.dias && 
                  !isNaN(diasNumber) &&
                  diasNumber > 0 &&
                  formData.valor && 
                  !isNaN(valorNumber) &&
                  valorNumber > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b bg-white">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold text-gray-900">Incapacidad (Versión Simple)</h3>
      </div>

      {/* Información */}
      <div className="bg-blue-50 p-4 rounded-lg space-y-2">
        <h4 className="text-blue-800 font-medium">Formulario Simplificado</h4>
        <p className="text-blue-700 text-sm">
          Ingresa manualmente todos los valores. Sin cálculos automáticos.
        </p>
      </div>

      {/* Form */}
      <div className="space-y-4">
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
          </div>
        </div>

        <div>
          <Label htmlFor="dias" className="text-gray-700">Días de Incapacidad *</Label>
          <Input
            id="dias"
            type="number"
            min="1"
            value={formData.dias}
            onChange={(e) => handleInputChange('dias', e.target.value)}
            placeholder="Ejemplo: 5"
          />
          {formData.dias && isNaN(parseInt(formData.dias, 10)) && (
            <p className="text-xs text-red-500 mt-1">
              Ingresa un número válido de días
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="valor" className="text-gray-700">Valor Total *</Label>
          <Input
            id="valor"
            type="number"
            min="0"
            step="1000"
            value={formData.valor}
            onChange={(e) => handleInputChange('valor', e.target.value)}
            placeholder="Ejemplo: 150000"
            className="text-lg font-medium"
          />
          <p className="text-xs text-gray-500 mt-1">
            Ingresa el valor total que debe recibir el empleado
          </p>
          {formData.valor && isNaN(parseFloat(formData.valor)) && (
            <p className="text-xs text-red-500 mt-1">
              Ingresa un valor numérico válido
            </p>
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

        {/* Preview */}
        {formData.valor && !isNaN(parseFloat(formData.valor)) && parseFloat(formData.valor) > 0 && (
          <div className="bg-green-50 p-3 rounded text-center border border-green-200">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-800 text-lg">
                +{formatCurrency(parseFloat(formData.valor))}
              </span>
            </div>
            <div className="text-sm text-gray-700">
              {formData.dias && !isNaN(parseInt(formData.dias, 10)) ? `${parseInt(formData.dias, 10)} días` : 'Días por definir'} de incapacidad {formData.subtipo === 'general' ? 'común' : 'laboral'}
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
          disabled={!isValid || isSubmitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? 'Guardando...' : 'Guardar Incapacidad'}
        </Button>
      </div>
    </div>
  );
};
