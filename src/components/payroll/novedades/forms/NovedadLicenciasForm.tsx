import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Info, Calendar } from 'lucide-react';
import { calculateDaysBetween, isValidDateRange } from '@/utils/dateUtils';
import { PeriodValidationService } from '@/services/PeriodValidationService';

interface NovedadLicenciasFormProps {
  onBack: () => void;
  onSubmit: (formData: any) => void;
  employeeSalary: number;
  calculateSuggestedValue?: (tipoNovedad: string, subtipo: string | undefined, horas?: number, dias?: number) => Promise<number | null>;
  isSubmitting: boolean;
  periodStartDate?: string;
  periodEndDate?: string;
}

export const NovedadLicenciasForm: React.FC<NovedadLicenciasFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary,
  calculateSuggestedValue,
  isSubmitting,
  periodStartDate,
  periodEndDate
}) => {
  const [formData, setFormData] = useState({
    subtipo: 'paternidad',
    fecha_inicio: '',
    fecha_fin: '',
    valor: 0,
    observacion: ''
  });

  // ✅ NUEVO: Estado para validación de fechas
  const [dateValidation, setDateValidation] = useState<{
    isValid: boolean;
    message: string;
  }>({ isValid: true, message: '' });

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
        'licencia_remunerada',
        `${periodStartDate} - ${periodEndDate}`
      );
      
      setDateValidation({
        isValid: validation.isValid,
        message: validation.message
      });
      
      console.log('🔍 Date validation for licencia:', validation);
    } else if (formData.fecha_inicio || formData.fecha_fin) {
      setDateValidation({
        isValid: false,
        message: 'Complete ambas fechas para validar'
      });
    } else {
      setDateValidation({ isValid: true, message: '' });
    }
  }, [formData.fecha_inicio, formData.fecha_fin, periodStartDate, periodEndDate]);

  // ✅ Calculate value when dates or subtype change
  useEffect(() => {
    if (calculatedDays > 0 && isValidRange && dateValidation.isValid && formData.subtipo && calculateSuggestedValue) {
      calculateSuggestedValue('licencia_remunerada', formData.subtipo, undefined, calculatedDays)
        .then(valor => {
          if (valor && valor > 0) {
            setFormData(prev => ({ ...prev, valor }));
          }
        });
    } else if (calculatedDays === 0 || !isValidRange || !dateValidation.isValid) {
      setFormData(prev => ({ ...prev, valor: 0 }));
    }
  }, [formData.subtipo, calculatedDays, isValidRange, dateValidation.isValid, calculateSuggestedValue]);

  const handleSubmit = () => {
    if (!formData.fecha_inicio || !formData.fecha_fin) {
      alert('Por favor complete ambas fechas');
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
      tipo_novedad: 'licencia_remunerada',
      subtipo: formData.subtipo,
      dias: calculatedDays,
      fecha_inicio: formData.fecha_inicio,
      fecha_fin: formData.fecha_fin,
      valor: formData.valor,
      observacion: formData.observacion || undefined
    };

    console.log('📤 Submitting licencia:', submitData);
    onSubmit(submitData);
  };

  const getSubtipoInfo = (subtipo: string) => {
    // Implementar lógica para obtener información del subtipo
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b bg-white">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold text-gray-900">Licencia Remunerada</h3>
      </div>

      {/* ✅ NUEVO: Información del período */}
      {periodStartDate && periodEndDate && (
        <div className="bg-green-50 p-3 rounded border border-green-200">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Período de liquidación: {periodStartDate} - {periodEndDate}
            </span>
          </div>
          <div className="text-xs text-green-700 mt-1">
            La licencia debe estar dentro de estas fechas
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-green-50 p-4 rounded-lg space-y-4">
        <div>
          <Label htmlFor="subtipo" className="text-gray-700">Tipo de Licencia</Label>
          <Select
            value={formData.subtipo}
            onValueChange={(value) => setFormData(prev => ({ ...prev, subtipo: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paternidad">Paternidad</SelectItem>
              <SelectItem value="maternidad">Maternidad</SelectItem>
              {/* Add more options as needed */}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="fecha_inicio" className="text-gray-700">Fecha Inicio *</Label>
            <Input
              type="date"
              value={formData.fecha_inicio}
              onChange={(e) => setFormData(prev => ({ ...prev, fecha_inicio: e.target.value }))}
              className={`${!dateValidation.isValid && formData.fecha_inicio ? 'border-red-300 bg-red-50' : ''}`}
            />
          </div>

          <div>
            <Label htmlFor="fecha_fin" className="text-gray-700">Fecha Fin *</Label>
            <Input
              type="date"
              value={formData.fecha_fin}
              onChange={(e) => setFormData(prev => ({ ...prev, fecha_fin: e.target.value }))}
              className={`${!dateValidation.isValid && formData.fecha_fin ? 'border-red-300 bg-red-50' : ''}`}
            />
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

        {/* Days calculation with validation */}
        {formData.fecha_inicio && formData.fecha_fin && (
          <div className={`p-3 rounded border ${dateValidation.isValid ? 'bg-white border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Días calculados:</span>
              <Badge variant="secondary" className={`${dateValidation.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {isValidRange ? `${calculatedDays} días` : 'Rango inválido'}
              </Badge>
              {dateValidation.isValid && (<span className="text-green-600 text-sm">✅</span>)}
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="valor" className="text-gray-700">Valor</Label>
          <Input
            type="number"
            value={formData.valor}
            onChange={(e) => setFormData(prev => ({ ...prev, valor: parseFloat(e.target.value) || 0 }))}
          />
        </div>

        <div>
          <Label htmlFor="observacion" className="text-gray-700">Observación</Label>
          <Textarea
            value={formData.observacion}
            onChange={(e) => setFormData(prev => ({ ...prev, observacion: e.target.value }))}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!formData.fecha_inicio || !formData.fecha_fin || !isValidRange || !dateValidation.isValid || calculatedDays <= 0 || formData.valor <= 0 || isSubmitting}
          className="bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? 'Guardando...' : 'Guardar Licencia'}
        </Button>
      </div>
    </div>
  );
};
