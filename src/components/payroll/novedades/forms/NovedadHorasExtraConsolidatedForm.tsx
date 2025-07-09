
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, Calculator } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useNovedadCalculation } from '@/hooks/useNovedadCalculation';
import { NovedadType } from '@/types/novedades-enhanced';

interface HorasExtraEntry {
  id: string;
  subtipo: string;
  horas: number;
  valor: number;
  observacion?: string;
}

interface NovedadHorasExtraConsolidatedFormProps {
  onBack: () => void;
  onSubmit: (formDataArray: any[]) => void;
  employeeSalary: number;
  calculateSuggestedValue?: (
    tipoNovedad: NovedadType,
    subtipo: string | undefined,
    horas?: number,
    dias?: number
  ) => number | null;
}

const HORAS_EXTRA_SUBTIPOS = [
  { value: 'diurnas', label: 'Diurnas (25%)', description: '6:00 AM - 10:00 PM' },
  { value: 'nocturnas', label: 'Nocturnas (75%)', description: '10:00 PM - 6:00 AM' },
  { value: 'dominicales_diurnas', label: 'Dominicales Diurnas (100%)', description: 'Domingos 6:00 AM - 10:00 PM' },
  { value: 'dominicales_nocturnas', label: 'Dominicales Nocturnas (150%)', description: 'Domingos 10:00 PM - 6:00 AM' },
  { value: 'festivas_diurnas', label: 'Festivas Diurnas (100%)', description: 'Festivos 6:00 AM - 10:00 PM' },
  { value: 'festivas_nocturnas', label: 'Festivas Nocturnas (150%)', description: 'Festivos 10:00 PM - 6:00 AM' }
];

export const NovedadHorasExtraConsolidatedForm: React.FC<NovedadHorasExtraConsolidatedFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary,
  calculateSuggestedValue
}) => {
  const [entries, setEntries] = useState<HorasExtraEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState({
    subtipo: 'diurnas',
    horas: '',
    observacion: ''
  });

  const { calculatedValue, calculateValue } = useNovedadCalculation({
    employeeSalary,
    calculateSuggestedValue
  });

  // 🔧 CORRECCIÓN: Recálculo automático siempre cuando cambien horas o subtipo
  useEffect(() => {
    if (currentEntry.horas && parseFloat(currentEntry.horas) > 0) {
      console.log('🔄 Auto-calculando valor para horas extra:', {
        subtipo: currentEntry.subtipo,
        horas: parseFloat(currentEntry.horas)
      });
      
      calculateValue(
        'horas_extra' as NovedadType,
        currentEntry.subtipo,
        parseFloat(currentEntry.horas),
        undefined
      );
    } else {
      // Limpiar el valor calculado si no hay horas válidas
      calculateValue('horas_extra' as NovedadType, currentEntry.subtipo, 0, undefined);
    }
  }, [currentEntry.subtipo, currentEntry.horas, calculateValue]);

  const handleAddEntry = () => {
    if (!currentEntry.horas || parseFloat(currentEntry.horas) <= 0) {
      alert('Por favor ingrese las horas');
      return;
    }

    if (!calculatedValue || calculatedValue <= 0) {
      alert('Error en el cálculo del valor');
      return;
    }

    const newEntry: HorasExtraEntry = {
      id: Date.now().toString(),
      subtipo: currentEntry.subtipo,
      horas: parseFloat(currentEntry.horas),
      valor: calculatedValue,
      observacion: currentEntry.observacion || undefined
    };

    console.log('➕ Adding horas extra entry:', newEntry);
    setEntries(prev => [...prev, newEntry]);
    
    // Reset form
    setCurrentEntry({
      subtipo: 'diurnas',
      horas: '',
      observacion: ''
    });
  };

  const handleRemoveEntry = (id: string) => {
    setEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const handleSubmit = () => {
    if (entries.length === 0) {
      alert('Agregue al menos una entrada de horas extra');
      return;
    }

    const formDataArray = entries.map(entry => ({
      tipo_novedad: 'horas_extra',
      subtipo: entry.subtipo,
      horas: entry.horas,
      valor: entry.valor,
      observacion: entry.observacion
    }));

    console.log('📤 Submitting horas extra entries:', formDataArray);
    onSubmit(formDataArray);
  };

  const getTotalValue = () => {
    return entries.reduce((sum, entry) => sum + entry.valor, 0);
  };

  const getTotalHours = () => {
    return entries.reduce((sum, entry) => sum + entry.horas, 0);
  };

  const getSubtipoLabel = (subtipo: string) => {
    return HORAS_EXTRA_SUBTIPOS.find(s => s.value === subtipo)?.label || subtipo;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Horas Extra - Registro Consolidado</h3>
      </div>

      {/* Formulario para nueva entrada */}
      <div className="bg-blue-50 p-4 rounded-lg space-y-4">
        <h4 className="font-medium text-blue-800">Agregar Horas Extra</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo de Horas Extra</Label>
            <Select
              value={currentEntry.subtipo}
              onValueChange={(value) => setCurrentEntry(prev => ({ ...prev, subtipo: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HORAS_EXTRA_SUBTIPOS.map((subtipo) => (
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

          <div className="space-y-2">
            <Label>Cantidad de Horas</Label>
            <Input
              type="number"
              min="0"
              max="12"
              step="0.5"
              value={currentEntry.horas}
              onChange={(e) => setCurrentEntry(prev => ({ ...prev, horas: e.target.value }))}
              placeholder="0"
            />
          </div>
        </div>

        {/* Valor calculado */}
        {calculatedValue && calculatedValue > 0 && (
          <div className="flex items-center justify-between bg-green-50 p-3 rounded">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">Valor calculado:</span>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {formatCurrency(calculatedValue)}
            </Badge>
          </div>
        )}

        <div className="space-y-2">
          <Label>Observaciones (opcional)</Label>
          <Textarea
            value={currentEntry.observacion}
            onChange={(e) => setCurrentEntry(prev => ({ ...prev, observacion: e.target.value }))}
            placeholder="Observaciones adicionales..."
            rows={2}
          />
        </div>

        <Button 
          onClick={handleAddEntry}
          disabled={!currentEntry.horas || !calculatedValue}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar Entrada
        </Button>
      </div>

      {/* Lista de entradas agregadas */}
      {entries.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium">Entradas Agregadas ({entries.length})</h4>
          
          <div className="space-y-2">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{getSubtipoLabel(entry.subtipo)}</div>
                  <div className="text-sm text-gray-600">
                    {entry.horas} horas - {formatCurrency(entry.valor)}
                  </div>
                  {entry.observacion && (
                    <div className="text-xs text-gray-500 mt-1">{entry.observacion}</div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveEntry(entry.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Resumen total */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">Total: {getTotalHours()} horas</div>
                <div className="text-sm text-gray-600">{entries.length} entradas</div>
              </div>
              <div className="text-xl font-bold text-blue-700">
                {formatCurrency(getTotalValue())}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={entries.length === 0}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Guardar Horas Extra ({entries.length})
        </Button>
      </div>
    </div>
  );
};
