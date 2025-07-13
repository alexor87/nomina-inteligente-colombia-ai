
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, Calculator, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { useNovedadBackendCalculation } from '@/hooks/useNovedadBackendCalculation';

interface RecargoEntry {
  id: string;
  fecha: string;
  tipo: string;
  horas: number;
  valor: number;
  observacion?: string;
}

const tiposRecargo = [
  { value: 'nocturno', label: 'Recargo Nocturno (35%)', factor: 0.35 },
  { value: 'nocturno_dominical', label: 'Nocturno Dominical', factor: 0.35 },
  { value: 'nocturno_festivo', label: 'Nocturno Festivo', factor: 0.35 }
];

interface NovedadRecargoConsolidatedFormProps {
  onBack: () => void;
  onSubmit: (entries: RecargoEntry[]) => void;
  employeeSalary: number;
  isSubmitting?: boolean;
  periodoFecha?: Date;
}

export const NovedadRecargoConsolidatedForm: React.FC<NovedadRecargoConsolidatedFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary,
  isSubmitting = false,
  periodoFecha
}) => {
  const [entries, setEntries] = useState<RecargoEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState({
    fecha: '',
    tipo: 'nocturno',
    horas: '',
    observacion: ''
  });

  const { calculateNovedad, isLoading: isCalculating } = useNovedadBackendCalculation();

  const calculateRecargoValue = async (tipo: string, horas: number) => {
    if (!tipo || horas <= 0) return 0;

    try {
      const result = await calculateNovedad({
        tipoNovedad: 'recargo_nocturno',
        subtipo: tipo,
        salarioBase: employeeSalary,
        horas: horas,
        fechaPeriodo: periodoFecha || new Date()
      });

      return result?.valor || 0;
    } catch (error) {
      console.error('Error calculating recargo:', error);
      return 0;
    }
  };

  const handleAddEntry = async () => {
    if (!currentEntry.fecha || !currentEntry.tipo || !currentEntry.horas || parseFloat(currentEntry.horas) <= 0) {
      return;
    }

    const horas = parseFloat(currentEntry.horas);
    const valor = await calculateRecargoValue(currentEntry.tipo, horas);

    const newEntry: RecargoEntry = {
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
      tipo: 'nocturno',
      horas: '',
      observacion: ''
    });
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
    return tiposRecargo.find(t => t.value === tipo)?.label || tipo;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Recargo Nocturno</h3>
      </div>

      {/* Current Entry Form */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h4 className="font-medium text-blue-800">Agregar Recargo Nocturno</h4>
          
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
              <Label>Tipo de Recargo *</Label>
              <Select value={currentEntry.tipo} onValueChange={(value) => setCurrentEntry(prev => ({ ...prev, tipo: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposRecargo.map((tipo) => (
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
            <h4 className="font-medium text-green-800 mb-4">Recargos Registrados ({entries.length})</h4>
            
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
