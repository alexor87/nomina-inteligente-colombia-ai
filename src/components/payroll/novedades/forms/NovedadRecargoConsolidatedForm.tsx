
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, Calculator, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useMultipleNovedadEntries } from '@/hooks/useMultipleNovedadEntries';

interface RecargoEntry {
  id: string;
  tipo_novedad: string;
  subtipo: string;
  horas: number;
  valor: number;
  observacion?: string;
}

interface NovedadRecargoConsolidatedFormProps {
  onBack: () => void;
  onSubmit: (formDataArray: any[]) => void;
  employeeSalary: number;
  calculateSuggestedValue?: (
    tipoNovedad: string,
    subtipo: string | undefined,
    horas?: number,
    dias?: number
  ) => number | null;
}

const RECARGO_SUBTIPOS = [
  { value: 'nocturno', label: 'Nocturno (35%)', description: '10:00 PM - 6:00 AM' },
  { value: 'dominical', label: 'Dominical (80%)', description: 'Trabajo en domingo' },
  { value: 'nocturno_dominical', label: 'Nocturno Dominical (115%)', description: 'Domingo 10:00 PM - 6:00 AM' },
  { value: 'festivo', label: 'Festivo (75%)', description: 'Trabajo en día festivo' },
  { value: 'nocturno_festivo', label: 'Nocturno Festivo (110%)', description: 'Festivo 10:00 PM - 6:00 AM' }
];

export const NovedadRecargoConsolidatedForm: React.FC<NovedadRecargoConsolidatedFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary,
  calculateSuggestedValue
}) => {
  const { entries, addEntry, updateEntry, removeEntry, getTotalValue } = useMultipleNovedadEntries<RecargoEntry>();
  
  const [newEntry, setNewEntry] = useState({
    subtipo: 'nocturno',
    horas: '',
    valor: '',
    observacion: ''
  });

  const calculateValueForEntry = (subtipo: string, horas: number) => {
    if (calculateSuggestedValue) {
      return calculateSuggestedValue('recargo_nocturno', subtipo, horas, undefined);
    }
    return null;
  };

  const handleAddEntry = () => {
    if (!newEntry.subtipo || !newEntry.horas || parseFloat(newEntry.horas) <= 0) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    const horas = parseFloat(newEntry.horas);
    const calculatedValue = calculateValueForEntry(newEntry.subtipo, horas);
    const valor = newEntry.valor ? parseFloat(newEntry.valor) : (calculatedValue || 0);

    if (valor <= 0) {
      alert('El valor debe ser mayor a 0');
      return;
    }

    addEntry({
      tipo_novedad: 'recargo_nocturno',
      subtipo: newEntry.subtipo,
      horas: horas,
      valor: valor,
      observacion: newEntry.observacion || undefined
    });

    // Reset form
    setNewEntry({
      subtipo: 'nocturno',
      horas: '',
      valor: '',
      observacion: ''
    });
  };

  const handleSubmit = () => {
    if (entries.length === 0) {
      alert('Agregue al menos un recargo');
      return;
    }

    const formDataArray = entries.map(entry => ({
      tipo_novedad: 'recargo_nocturno',
      subtipo: entry.subtipo,
      horas: entry.horas,
      valor: entry.valor,
      observacion: entry.observacion
    }));

    onSubmit(formDataArray);
  };

  const getSubtipoInfo = (subtipo: string) => {
    return RECARGO_SUBTIPOS.find(s => s.value === subtipo);
  };

  const totalValue = getTotalValue();

  // Calculate suggested value when hours or subtipo change
  React.useEffect(() => {
    if (newEntry.subtipo && newEntry.horas && parseFloat(newEntry.horas) > 0) {
      const calculatedValue = calculateValueForEntry(newEntry.subtipo, parseFloat(newEntry.horas));
      if (calculatedValue && calculatedValue > 0 && !newEntry.valor) {
        setNewEntry(prev => ({ ...prev, valor: calculatedValue.toString() }));
      }
    }
  }, [newEntry.subtipo, newEntry.horas]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b bg-white">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold text-gray-900">Recargos</h3>
      </div>

      {/* Form to add new entry */}
      <div className="bg-blue-50 p-4 rounded-lg space-y-4">
        <h4 className="text-blue-800 font-medium">Agregar Nuevo Recargo</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="tipo" className="text-gray-700">Tipo de Recargo</Label>
            <Select 
              value={newEntry.subtipo} 
              onValueChange={(value) => setNewEntry(prev => ({ ...prev, subtipo: value }))}
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
          </div>

          <div>
            <Label htmlFor="horas" className="text-gray-700">Cantidad de Horas</Label>
            <Input
              type="number"
              placeholder="0"
              value={newEntry.horas}
              onChange={(e) => setNewEntry(prev => ({ ...prev, horas: e.target.value }))}
              min="0"
              max="8"
              step="0.5"
            />
            <div className="text-xs text-gray-500 mt-1">
              Máximo 8 horas por jornada
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="valor" className="text-gray-700">Valor</Label>
          <Input
            type="number"
            placeholder="0"
            value={newEntry.valor}
            onChange={(e) => setNewEntry(prev => ({ ...prev, valor: e.target.value }))}
            min="0"
            step="1000"
          />
          {newEntry.valor && parseFloat(newEntry.valor) > 0 && (
            <div className="mt-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {formatCurrency(parseFloat(newEntry.valor))}
              </Badge>
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="observacion" className="text-gray-700">Observaciones</Label>
          <Textarea
            placeholder="Turno, horario específico, etc..."
            value={newEntry.observacion}
            onChange={(e) => setNewEntry(prev => ({ ...prev, observacion: e.target.value }))}
            rows={2}
          />
        </div>

        <Button 
          onClick={handleAddEntry}
          disabled={!newEntry.subtipo || !newEntry.horas || parseFloat(newEntry.horas) <= 0}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar Recargo
        </Button>
      </div>

      {/* List of added entries */}
      {entries.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Recargos Agregados ({entries.length})</h4>
          
          <div className="space-y-2">
            {entries.map((entry) => {
              const typeInfo = getSubtipoInfo(entry.subtipo);

              return (
                <div key={entry.id} className="flex justify-between items-start p-3 border rounded-lg bg-white">
                  <div className="flex-1">
                    <div className="font-medium">{typeInfo?.label}</div>
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
                    onClick={() => removeEntry(entry.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex justify-between items-center font-semibold">
              <span>Total Recargos:</span>
              <div className="text-right">
                <div className="text-xl font-bold text-blue-700">
                  {formatCurrency(totalValue)}
                </div>
                <div className="text-sm text-gray-600">
                  {entries.reduce((sum, entry) => sum + entry.horas, 0)} horas totales
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={entries.length === 0}
          className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
        >
          Guardar {entries.length} Recargo{entries.length !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
};
