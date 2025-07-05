
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Vacaciones</h3>
      </div>

      {/* Form to add new entry */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Agregar Período de Vacaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Fecha Inicio</Label>
              <Input
                type="date"
                value={newEntry.fecha_inicio}
                onChange={(e) => setNewEntry(prev => ({ ...prev, fecha_inicio: e.target.value }))}
              />
            </div>

            <div>
              <Label>Fecha Fin</Label>
              <Input
                type="date"
                value={newEntry.fecha_fin}
                onChange={(e) => setNewEntry(prev => ({ ...prev, fecha_fin: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label>Días de Vacaciones</Label>
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
            <Label>Valor</Label>
            <Input
              type="number"
              placeholder="0"
              value={newEntry.valor}
              onChange={(e) => setNewEntry(prev => ({ ...prev, valor: e.target.value }))}
              min="0"
              step="1000"
            />
          </div>

          <div>
            <Label>Observaciones</Label>
            <Textarea
              placeholder="Período de vacaciones, resolución, etc..."
              value={newEntry.observacion}
              onChange={(e) => setNewEntry(prev => ({ ...prev, observacion: e.target.value }))}
              rows={2}
            />
          </div>

          <Button 
            onClick={handleAddEntry}
            disabled={!newEntry.fecha_inicio || !newEntry.fecha_fin}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Período
          </Button>
        </CardContent>
      </Card>

      {/* List of added entries */}
      {entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Períodos de Vacaciones Agregados ({entries.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {entries.map((entry) => {
              return (
                <div key={entry.id} className="flex justify-between items-start p-3 border rounded-lg">
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

            {/* Total */}
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between items-center font-semibold">
                <span>Total Vacaciones:</span>
                <div className="text-right">
                  <div>{formatCurrency(totalValue)}</div>
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
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={entries.length === 0}
        >
          Guardar {entries.length} Período{entries.length !== 1 ? 's' : ''} de Vacaciones
        </Button>
      </div>
    </div>
  );
};
