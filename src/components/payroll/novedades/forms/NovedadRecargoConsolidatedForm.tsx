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

interface RecargoEntry {
  id: string;
  fecha: string;
  tipo: string;
  horas: number;
  valor: number;
  observacion?: string;
}

interface NovedadRecargoConsolidatedFormProps {
  onBack: () => void;
  onSubmit: (entries: RecargoEntry[]) => void;
  employeeSalary: number;
  isSubmitting?: boolean;
  periodoFecha?: Date;
  periodStartDate?: string;
  periodEndDate?: string;
}

// ✅ KISS: Tipos de recargo isolados por componente (sin cache compartido)
const getTiposRecargoLocal = (fechaPeriodo: Date = new Date()) => {
  const fecha = fechaPeriodo;
  
  // ✅ KISS: Factores totales directos sin cache
  const getFactorTotal = (tipo: string) => {
    switch (tipo) {
      case 'nocturno':
        return { factor: 0.35, porcentaje: '35%', descripcion: 'Recargo nocturno (10:00 PM - 6:00 AM)' };
        
      case 'dominical':
        if (fecha < new Date('2025-07-01')) {
          return { factor: 0.75, porcentaje: '75%', descripcion: 'Recargo dominical (trabajo en domingo)' };
        } else if (fecha < new Date('2026-07-01')) {
          return { factor: 0.80, porcentaje: '80%', descripcion: 'Recargo dominical (trabajo en domingo)' };
        } else if (fecha < new Date('2027-07-01')) {
          return { factor: 0.90, porcentaje: '90%', descripcion: 'Recargo dominical (trabajo en domingo)' };
        } else {
          return { factor: 1.00, porcentaje: '100%', descripcion: 'Recargo dominical (trabajo en domingo)' };
        }
        
      case 'nocturno_dominical':
        return { factor: 1.15, porcentaje: '115%', descripcion: 'Recargo nocturno dominical (domingo 10:00 PM - 6:00 AM)' };
        
      default:
        return { factor: 0.0, porcentaje: '0%', descripcion: 'Tipo no válido' };
    }
  };

  return [
    { value: 'nocturno', ...getFactorTotal('nocturno') },
    { value: 'dominical', ...getFactorTotal('dominical') },
    { value: 'nocturno_dominical', ...getFactorTotal('nocturno_dominical') }
  ];
};

export const NovedadRecargoConsolidatedForm: React.FC<NovedadRecargoConsolidatedFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary,
  isSubmitting = false,
  periodoFecha,
  periodStartDate,
  periodEndDate
}) => {
  const [entries, setEntries] = useState<RecargoEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState({
    fecha: '',
    tipo: 'nocturno',
    horas: '',
    observacion: ''
  });

  // ✅ KISS: Tipos locales sin dependencias externas
  const [tiposRecargo] = useState(() => getTiposRecargoLocal(periodoFecha));
  const [isCalculating, setIsCalculating] = useState(false);
  const [dateError, setDateError] = useState<string>('');

  // ✅ KISS: Validación simple de fecha
  const isDateInPeriod = (fecha: string): boolean => {
    if (!fecha || !periodStartDate || !periodEndDate) return true; // Si no hay período definido, permitir
    
    const selectedDate = new Date(fecha + 'T00:00:00');
    const startDate = new Date(periodStartDate + 'T00:00:00');
    const endDate = new Date(periodEndDate + 'T00:00:00');
    
    return selectedDate >= startDate && selectedDate <= endDate;
  };

  // ✅ KISS: Cálculo directo sin hooks complejos
  const calculateRecargoValue = async (tipo: string, horas: number, fechaEspecifica: string) => {
    if (!tipo || horas <= 0 || !fechaEspecifica || !employeeSalary) return 0;

    setIsCalculating(true);
    
    try {
      const fechaParaCalculo = new Date(fechaEspecifica + 'T00:00:00');
      
      console.log('🎯 RECARGO CONSOLIDADO: Calculando:', {
        tipo,
        horas,
        salario: employeeSalary,
        fecha: fechaEspecifica
      });

      // ✅ KISS: Llamada directa al backend sin cache ni debounce
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('payroll-calculations', {
        body: {
          action: 'calculate-novedad',
          data: {
            tipoNovedad: 'recargo_nocturno',
            subtipo: tipo,
            salarioBase: employeeSalary,
            horas: horas,
            fechaPeriodo: fechaParaCalculo.toISOString().split('T')[0]
          }
        }
      });

      if (error || !data?.success) {
        console.error('❌ Error backend:', error);
        // ✅ FALLBACK: Cálculo local simple
        const tipoInfo = tiposRecargo.find(t => t.value === tipo);
        const factor = tipoInfo?.factor || 0;
        const valorLocal = Math.round((employeeSalary * factor * horas) / (30 * 7.333));
        
        console.log('✅ FALLBACK local:', { tipo, factor, valor: valorLocal });
        return valorLocal;
      }

      const valor = data.data?.valor || 0;
      console.log('✅ BACKEND success:', { tipo, valor });
      return valor;

    } catch (error) {
      console.error('❌ Error calculando recargo:', error);
      return 0;
    } finally {
      setIsCalculating(false);
    }
  };

  const handleAddEntry = async () => {
    if (!currentEntry.fecha || !currentEntry.tipo || !currentEntry.horas || parseFloat(currentEntry.horas) <= 0) {
      return;
    }

    // ✅ KISS: Validación de fecha del período
    if (!isDateInPeriod(currentEntry.fecha)) {
      const startFormatted = periodStartDate ? new Date(periodStartDate).toLocaleDateString('es-CO') : '';
      const endFormatted = periodEndDate ? new Date(periodEndDate).toLocaleDateString('es-CO') : '';
      setDateError(`La fecha del recargo debe estar dentro del período de liquidación (${startFormatted} - ${endFormatted})`);
      return;
    }

    // Limpiar error si la fecha es válida
    setDateError('');

    const horas = parseFloat(currentEntry.horas);
    const valor = await calculateRecargoValue(currentEntry.tipo, horas, currentEntry.fecha);

    const newEntry: RecargoEntry = {
      id: Date.now().toString(),
      fecha: currentEntry.fecha,
      tipo: currentEntry.tipo,
      horas: horas,
      valor: valor,
      observacion: currentEntry.observacion
    };

    console.log('➕ CONSOLIDADO: Agregando entrada:', newEntry);
    
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
    const tipoEncontrado = tiposRecargo.find(t => t.value === tipo);
    if (!tipoEncontrado) return tipo;
    
    const labels = {
      'nocturno': 'Recargo Nocturno',
      'dominical': 'Recargo Dominical', 
      'nocturno_dominical': 'Nocturno Dominical'
    };
    
    return `${labels[tipo as keyof typeof labels] || tipo} (${tipoEncontrado.porcentaje})`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Recargo Nocturno</h3>
      </div>

      {/* Información de normativa aplicada */}
      {periodoFecha && (
        <div className="flex items-start gap-2 bg-blue-50 p-3 rounded text-sm text-blue-700">
          <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium">Normativa aplicada para período:</div>
            <div className="text-xs">{periodoFecha.toLocaleDateString('es-CO')}</div>
            <div className="text-xs mt-1">
              Factores según legislación colombiana vigente
            </div>
          </div>
        </div>
      )}

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
                onChange={(e) => {
                  setCurrentEntry(prev => ({ ...prev, fecha: e.target.value }));
                  setDateError(''); // Limpiar error al cambiar fecha
                }}
                className={dateError ? 'border-red-500' : ''}
              />
              {dateError && (
                <div className="text-xs text-red-600 mt-1">
                  {dateError}
                </div>
              )}
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
                      <div>
                        <div className="font-medium">
                          {tipo.value === 'nocturno' ? 'Recargo Nocturno' : 
                           tipo.value === 'dominical' ? 'Recargo Dominical' :
                           'Nocturno Dominical'} ({tipo.porcentaje})
                        </div>
                        <div className="text-xs text-gray-500">{tipo.descripcion}</div>
                      </div>
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
            disabled={!currentEntry.fecha || !currentEntry.tipo || !currentEntry.horas || parseFloat(currentEntry.horas) <= 0 || isCalculating || !!dateError}
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
