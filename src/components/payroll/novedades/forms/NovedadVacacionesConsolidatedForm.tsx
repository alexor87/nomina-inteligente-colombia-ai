
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, Calendar, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useMultipleNovedadEntries } from '@/hooks/useMultipleNovedadEntries';

interface VacacionesEntry {
  id: string;
  tipo_novedad: string;
  dias: number;
  fecha_inicio: string;
  fecha_fin: string;
  valor: number;
  observacion?: string;
}

interface NovedadVacacionesConsolidatedFormProps {
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

export const NovedadVacacionesConsolidatedForm: React.FC<NovedadVacacionesConsolidatedFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary,
  calculateSuggestedValue
}) => {
  const { entries, addEntry, updateEntry, removeEntry, getTotalValue } = useMultipleNovedadEntries<VacacionesEntry>();
  
  const [newEntry, setNewEntry] = useState({
    dias: '',
    fecha_inicio: '',
    fecha_fin: '',
    valor: '',
    observacion: ''
  });

  const calculateValueForEntry = (dias: number) => {
    if (calculateSuggestedValue) {
      return calculateSuggestedValue('vacaciones', undefined, undefined, dias);
    }
    return null;
  };

  const calculateDaysBetweenDates = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
    
    return Math.max(0, diffDays);
  };

  const handleAddEntry = () => {
    if (!newEntry.fecha_inicio || !newEntry.fecha_fin) {
      alert('Por favor seleccione las fechas de inicio y fin');
      return;
    }

    const calculatedDays = newEntry.dias ? parseInt(newEntry.dias) : calculateDaysBetweenDates(newEntry.fecha_inicio, newEntry.fecha_fin);
    
    if (calculatedDays <= 0) {
      alert('Los días de vacaciones deben ser mayor a 0');
      return;
    }

    if (calculatedDays > 15) {
      if (!window.confirm(`Las vacaciones exceden 15 días hábiles (${calculatedDays} días). ¿Desea continuar?`)) {
        return;
      }
    }

    const calculatedValue = calculateValueForEntry(calculatedDays);
    const valor = newEntry.valor ? parseFloat(newEntry.valor) : (calculatedValue || 0);

    if (valor <= 0) {
      alert('El valor debe ser mayor a 0');
      return;
    }

    addEntry({
      tipo_novedad: 'vacaciones',
      dias: calculatedDays,
      fecha_inicio: newEntry.fecha_inicio,
      fecha_fin: newEntry.fecha_fin,
      valor: valor,
      observacion: newEntry.observacion || undefined
    });

    // Reset form
    setNewEntry({
      dias: '',
      fecha_inicio: '',
      fecha_fin: '',
      valor: '',
      observacion: ''
    });
  };

  const handleSubmit = () => {
    if (entries.length === 0) {
      alert('Agregue al menos un período de vacaciones');
      return;
    }

    const totalDays = entries.reduce((sum, entry) => sum + entry.dias, 0);
    if (totalDays > 30) {
      if (!window.confirm(`El total de días de vacaciones (${totalDays}) excede 30 días por año. ¿Desea continuar?`)) {
        return;
      }
    }

    const formDataArray = entries.map(entry => ({
      tipo_novedad: 'vacaciones',
      dias: entry.dias,
      fecha_inicio: entry.fecha_inicio,
      fecha_fin: entry.fecha_fin,
      valor: entry.valor,
      observacion: entry.observacion
    }));

    onSubmit(formDataArray);
  };

  const totalValue = getTotalValue();
  const totalDays = entries.reduce((sum, entry) => sum + entry.dias, 0);

  // Auto-calculate days when dates change
  React.useEffect(() => {
    if (newEntry.fecha_inicio && newEntry.fecha_fin) {
      const calculatedDays = calculateDaysBetweenDates(newEntry.fecha_inicio, newEntry.fecha_fin);
      if (calculatedDays > 0) {
        setNewEntry(prev => ({ ...prev, dias: calculatedDays.toString() }));
        
        // Auto-calculate value if available
        const calculatedValue = calculateValueForEntry(calculatedDays);
        if (calculatedValue && calculatedValue > 0 && !newEntry.valor) {
          setNewEntry(prev => ({ ...prev, valor: calculatedValue.toString() }));
        }
      }
    }
  }, [newEntry.fecha_inicio, newEntry.fecha_fin]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b bg-white">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold text-gray-900">Vacaciones</h3>
      </div>

      {/* Form to add new entry */}
      <div className="bg-blue-50 p-4 rounded-lg space-y-4">
        <h4 className="text-blue-800 font-medium">Agregar Período de Vacaciones</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="fecha_inicio" className="text-gray-700">Fecha Inicio</Label>
            <Input
              type="date"
              value={newEntry.fecha_inicio}
              onChange={(e) => setNewEntry(prev => ({ ...prev, fecha_inicio: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="fecha_fin" className="text-gray-700">Fecha Fin</Label>
            <Input
              type="date"
              value={newEntry.fecha_fin}
              onChange={(e) => setNewEntry(prev => ({ ...prev, fecha_fin: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="dias" className="text-gray-700">Días de Vacaciones</Label>
          <Input
            type="number"
            placeholder="0"
            value={newEntry.dias}
            onChange={(e) => setNewEntry(prev => ({ ...prev, dias: e.target.value }))}
            min="1"
            max="15"
          />
          <div className="text-xs text-gray-500 mt-1">
            Máximo 15 días hábiles por período. Se calcula automáticamente según las fechas.
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
            placeholder="Período de vacaciones, resolución, etc..."
            value={newEntry.observacion}
            onChange={(e) => setNewEntry(prev => ({ ...prev, observacion: e.target.value }))}
            rows={2}
            className="resize-none"
          />
        </div>

        <Button 
          onClick={handleAddEntry}
          disabled={!newEntry.fecha_inicio || !newEntry.fecha_fin}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar Período
        </Button>
      </div>

      {/* List of added entries */}
      {entries.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Períodos de Vacaciones Agregados ({entries.length})</h4>
          
          <div className="space-y-2">
            {entries.map((entry) => {
              return (
                <div key={entry.id} className="flex justify-between items-start p-3 border rounded-lg bg-white">
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {entry.dias} días de vacaciones
                    </div>
                    <div className="text-sm text-gray-600">
                      {entry.fecha_inicio} al {entry.fecha_fin}
                    </div>
                    <div className="text-sm font-medium text-green-600">
                      {formatCurrency(entry.valor)}
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
              <span>Total Vacaciones:</span>
              <div className="text-right">
                <div className="text-xl font-bold text-blue-700">
                  {formatCurrency(totalValue)}
                </div>
                <div className="text-sm text-gray-600">
                  {totalDays} días totales
                </div>
              </div>
            </div>
            
            {totalDays > 30 && (
              <div className="mt-2 p-2 bg-amber-50 rounded text-amber-700 text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                El total excede 30 días anuales de vacaciones
              </div>
            )}
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
          Guardar {entries.length} Período{entries.length !== 1 ? 's' : ''} de Vacaciones
        </Button>
      </div>
    </div>
  );
};
