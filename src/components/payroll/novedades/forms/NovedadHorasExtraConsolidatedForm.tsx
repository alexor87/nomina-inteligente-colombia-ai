
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, Plus, Trash2, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/utils';
import { useNovedadBackendCalculation } from '@/hooks/useNovedadBackendCalculation';
import { formatDateForDisplay } from '@/utils/dateUtils';

interface HorasExtraEntry {
  id: string;
  fecha: string;
  tipo: string;
  horas: number;
  valor: number;
  factor: number;
  observacion?: string;
}

// Factores dinámicos según Ley 2466/2025 (recargo dominical progresivo)
const getRecargoDominical = (fecha: Date): number => {
  if (fecha < new Date('2025-07-01')) return 0.75;
  if (fecha < new Date('2026-07-01')) return 0.80;
  if (fecha < new Date('2027-07-01')) return 0.90;
  return 1.00;
};

const getTiposHorasExtraLocal = (fechaPeriodo: Date) => {
  const rd = getRecargoDominical(fechaPeriodo);
  return [
    { value: 'diurnas', label: 'Diurnas', factor: 1.25 },
    { value: 'nocturnas', label: 'Nocturnas', factor: 1.75 },
    { value: 'dominicales_diurnas', label: 'Dominicales Diurnas', factor: +(1.25 + rd).toFixed(2) },
    { value: 'dominicales_nocturnas', label: 'Dominicales Nocturnas', factor: +(1.75 + rd).toFixed(2) },
    { value: 'festivas_diurnas', label: 'Festivas Diurnas', factor: +(1.25 + rd).toFixed(2) },
    { value: 'festivas_nocturnas', label: 'Festivas Nocturnas', factor: +(1.75 + rd).toFixed(2) },
  ];
};

// Jornada legal según Ley 2101/2021
const getHorasSemanales = (fecha: Date): number => {
  if (fecha >= new Date('2026-07-15')) return 42;
  if (fecha >= new Date('2025-07-15')) return 44;
  if (fecha >= new Date('2024-07-15')) return 46;
  if (fecha >= new Date('2023-07-15')) return 47;
  return 48;
};

interface NovedadHorasExtraConsolidatedFormProps {
  onBack: () => void;
  onSubmit: (formDataArray: any[]) => void;
  employeeSalary: number;
  isSubmitting?: boolean;
  periodoFecha?: Date;
  periodStartDate?: string;
  periodEndDate?: string;
}

export const NovedadHorasExtraConsolidatedForm: React.FC<NovedadHorasExtraConsolidatedFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary,
  isSubmitting = false,
  periodoFecha,
  periodStartDate,
  periodEndDate
}) => {
  const [entries, setEntries] = useState<HorasExtraEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState({
    fecha: '',
    tipo: '',
    horas: '',
    observacion: ''
  });
  const [dateError, setDateError] = useState<string>('');

  const { calculateNovedad, isLoading: isCalculating } = useNovedadBackendCalculation();

  const fechaRef = periodoFecha || new Date();
  const tiposHorasExtra = useMemo(() => getTiposHorasExtraLocal(fechaRef), [fechaRef]);

  // Valor hora ordinaria para mostrar en fórmulas
  const horasSemanales = getHorasSemanales(fechaRef);
  const valorHoraOrdinaria = Math.round(employeeSalary / 30 / (horasSemanales / 6));

  const isDateInPeriod = (fecha: string): boolean => {
    if (!fecha || !periodStartDate || !periodEndDate) return true;
    const selectedDate = new Date(fecha);
    const startDate = new Date(periodStartDate);
    const endDate = new Date(periodEndDate);
    return selectedDate >= startDate && selectedDate <= endDate;
  };

  const calculateHorasExtraValue = async (tipo: string, horas: number, fecha: string) => {
    if (!tipo || horas <= 0 || !fecha) return 0;

    try {
      const fechaCalculo = new Date(fecha);
      const result = await calculateNovedad({
        tipoNovedad: 'horas_extra',
        subtipo: tipo,
        salarioBase: employeeSalary,
        horas: horas,
        fechaPeriodo: fechaCalculo.toISOString()
      });

      if (result?.valor) {
        return result.valor;
      }
      return 0;
    } catch (error) {
      console.error('❌ Error calculando horas extra:', error);
      return 0;
    }
  };

  const handleAddEntry = async () => {
    setDateError('');

    if (!currentEntry.fecha || !currentEntry.tipo || !currentEntry.horas || parseFloat(currentEntry.horas) <= 0) {
      return;
    }

    if (!isDateInPeriod(currentEntry.fecha)) {
      const startFormatted = periodStartDate ? formatDateForDisplay(periodStartDate) : '';
      const endFormatted = periodEndDate ? formatDateForDisplay(periodEndDate) : '';
      setDateError(`La fecha de las horas extra debe estar dentro del período de liquidación (${startFormatted} - ${endFormatted})`);
      return;
    }

    const horas = parseFloat(currentEntry.horas);
    const valor = await calculateHorasExtraValue(currentEntry.tipo, horas, currentEntry.fecha);
    const tipoInfo = tiposHorasExtra.find(t => t.value === currentEntry.tipo);

    const newEntry: HorasExtraEntry = {
      id: Date.now().toString(),
      fecha: currentEntry.fecha,
      tipo: currentEntry.tipo,
      horas: horas,
      valor: valor,
      factor: tipoInfo?.factor || 0,
      observacion: currentEntry.observacion
    };

    setEntries(prev => [...prev, newEntry]);
    setCurrentEntry({ fecha: '', tipo: '', horas: '', observacion: '' });
  };

  const handleRemoveEntry = (id: string) => {
    setEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const handleSubmit = () => {
    if (entries.length === 0) return;

    const formDataArray = entries.map(entry => ({
      tipo: entry.tipo,
      subtipo: entry.tipo,
      fecha: entry.fecha,
      horas: entry.horas,
      valor: entry.valor,
      observacion: entry.observacion || undefined,
      constitutivo_salario: true
    }));

    onSubmit(formDataArray);
  };

  const totalHoras = entries.reduce((sum, entry) => sum + entry.horas, 0);
  const totalValor = entries.reduce((sum, entry) => sum + entry.valor, 0);

  const getTipoLabel = (tipo: string) => {
    const t = tiposHorasExtra.find(t => t.value === tipo);
    return t ? `${t.label} (×${t.factor})` : tipo;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Horas Extra</h3>
      </div>

      {/* Tabla de referencia de factores */}
      {employeeSalary > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              Valor hora ordinaria: {formatCurrency(valorHoraOrdinaria)} (jornada {horasSemanales}h/sem)
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {tiposHorasExtra.map((tipo) => (
              <div key={tipo.value} className="flex justify-between text-xs text-blue-700">
                <span>{tipo.label}</span>
                <span className="font-medium">×{tipo.factor} = {formatCurrency(Math.round(valorHoraOrdinaria * tipo.factor))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Entry Form */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h4 className="font-medium text-blue-800">Agregar Horas Extra</h4>

          {dateError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{dateError}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha *</Label>
              <Input
                type="date"
                value={currentEntry.fecha}
                onChange={(e) => {
                  setCurrentEntry(prev => ({ ...prev, fecha: e.target.value }));
                  setDateError('');
                }}
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
                      {tipo.label} (×{tipo.factor})
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
                      {entry.horas}h × {formatCurrency(valorHoraOrdinaria)} × {entry.factor} = <span className="font-medium text-gray-900">{formatCurrency(entry.valor)}</span>
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
