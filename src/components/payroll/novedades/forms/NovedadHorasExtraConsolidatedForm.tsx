
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, Plus, Trash2, Calculator } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { NovedadType } from '@/types/novedades-enhanced';

interface HorasExtraEntry {
  id: string;
  fecha: string;
  tipo: string;
  horas: number;
  valor: number;
  observacion?: string;
}

const tiposHorasExtra = [
  { value: 'diurnas', label: 'Diurnas (25%)', factor: 1.25 },
  { value: 'nocturnas', label: 'Nocturnas (75%)', factor: 1.75 },
  { value: 'dominicales_diurnas', label: 'Dominicales Diurnas (100%)', factor: 2.0 },
  { value: 'dominicales_nocturnas', label: 'Dominicales Nocturnas (150%)', factor: 2.5 },
  { value: 'festivas_diurnas', label: 'Festivas Diurnas (100%)', factor: 2.0 },
  { value: 'festivas_nocturnas', label: 'Festivas Nocturnas (150%)', factor: 2.5 }
];

interface NovedadHorasExtraConsolidatedFormProps {
  onBack: () => void;
  onSubmit: (entries: HorasExtraEntry[]) => void;
  employeeSalary: number;
  isSubmitting?: boolean;
  periodoFecha?: Date;
  calculateSuggestedValue?: (
    tipoNovedad: NovedadType,
    subtipo: string | undefined,
    horas?: number,
    dias?: number
  ) => Promise<number | null>;
}

export const NovedadHorasExtraConsolidatedForm: React.FC<NovedadHorasExtraConsolidatedFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary,
  isSubmitting = false,
  periodoFecha,
  calculateSuggestedValue
}) => {
  const [entries, setEntries] = useState<HorasExtraEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState({
    fecha: '',
    tipo: '',
    horas: '',
    observacion: ''
  });

  const [isCalculating, setIsCalculating] = useState(false);

  // ✅ KISS: Función async de cálculo usando la prop
  const calculateHorasExtraValue = async (tipo: string, horas: number, fecha: string): Promise<number> => {
    if (!tipo || horas <= 0 || !fecha || !calculateSuggestedValue) {
      console.log('🔧 KISS: No se puede calcular - datos incompletos');
      return 0;
    }

    try {
      console.log('🧮 KISS: Calculando horas extra:', { tipo, horas, fecha });
      
      const result = await calculateSuggestedValue('horas_extra', tipo, horas);
      const valor = result || 0;
      
      console.log('✅ KISS: Resultado calculado:', valor);
      return valor;
    } catch (error) {
      console.error('❌ KISS: Error en cálculo:', error);
      return 0;
    }
  };

  const handleAddEntry = async () => {
    if (!currentEntry.fecha || !currentEntry.tipo || !currentEntry.horas || parseFloat(currentEntry.horas) <= 0) {
      return;
    }

    setIsCalculating(true);
    const horas = parseFloat(currentEntry.horas);
    const valor = await calculateHorasExtraValue(currentEntry.tipo, horas, currentEntry.fecha);

    const newEntry: HorasExtraEntry = {
      id: Date.now().toString(),
      fecha: currentEntry.fecha,
      tipo: currentEntry.tipo,
      horas: horas,
      valor: valor,
      observacion: currentEntry.observacion
    };

    setEntries(prev => [...prev, newEntry]);
    setCurrentEntry({
      fecha: '',
      tipo: '',
      horas: '',
      observacion: ''
    });
    setIsCalculating(false);
  };

  const handleRemoveEntry = (id: string) => {
    setEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const handleSubmit = () => {
    if (entries.length === 0) return;
    onSubmit(entries);
  };

  const totalHoras = entries.reduce((sum, entry) => sum + entry.horas, 0);
  const totalValor = entries.reduce((sum, entry) => sum + entry.valor, 0);

  const getTipoLabel = (tipo: string) => {
    return tiposHorasExtra.find(t => t.value === tipo)?.label || tipo;
  };

  // ✅ KISS: Debug simple
  console.log('🔍 KISS: Estado actual horas extra:', {
    employeeSalary,
    periodoFecha,
    hasCalculateFunction: !!calculateSuggestedValue,
    entriesCount: entries.length
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Horas Extra</h3>
      </div>

      {/* ✅ KISS: Debug info visible en desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 p-3 rounded text-xs">
          <strong>DEBUG:</strong> Salario: {employeeSalary}, Fecha: {periodoFecha?.toISOString().split('T')[0]}, 
          Función cálculo: {calculateSuggestedValue ? 'Disponible' : 'No disponible'}
        </div>
      )}

      {/* Current Entry Form */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h4 className="font-medium text-blue-800">Agregar Horas Extra</h4>
          
          {!calculateSuggestedValue && (
            <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-700">
              <Calculator className="h-4 w-4 inline mr-2" />
              Función de cálculo no disponible. Los valores deberán ingresarse manualmente.
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha *</Label>
              <Input
                type="date"
                value={currentEntry.fecha}
                onChange={(e) => setCurrentEntry(prev => ({ ...prev, fecha: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Horas Extra *</Label>
              <Select value={currentEntry.tipo} onValueChange={(value) => setCurrentEntry(prev => ({ ...prev, tipo: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposHorasExtra.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Horas *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={currentEntry.horas}
                  onChange={(e) => setCurrentEntry(prev => ({ ...prev, horas: e.target.value }))}
                  className="pl-10"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Input
                value={currentEntry.observacion}
                onChange={(e) => setCurrentEntry(prev => ({ ...prev, observacion: e.target.value }))}
                placeholder="Descripción opcional"
              />
            </div>
          </div>

          <Button 
            onClick={handleAddEntry}
            disabled={!currentEntry.fecha || !currentEntry.tipo || !currentEntry.horas || parseFloat(currentEntry.horas) <= 0 || isCalculating}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            {isCalculating ? 'Calculando...' : 'Agregar Entrada'}
          </Button>
        </CardContent>
      </Card>

      {/* Entries List */}
      {entries.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium text-green-800 mb-4">Horas Extra Registradas ({entries.length})</h4>
            
            <div className="space-y-3">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {entry.fecha}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {getTipoLabel(entry.tipo)}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      {entry.horas} horas - {formatCurrency(entry.valor)}
                      {entry.observacion && (
                        <span className="block text-xs mt-1 italic">{entry.observacion}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveEntry(entry.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-4 pt-4 border-t bg-green-50 p-3 rounded">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total:</span>
                <div className="text-right">
                  <div className="font-medium">{totalHoras} horas</div>
                  <div className="text-lg font-bold text-green-700">
                    {formatCurrency(totalValor)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={entries.length === 0 || isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 min-w-[140px]"
        >
          {isSubmitting ? 'Guardando...' : `Guardar ${entries.length} Entrada${entries.length > 1 ? 's' : ''}`}
        </Button>
      </div>
    </div>
  );
};
