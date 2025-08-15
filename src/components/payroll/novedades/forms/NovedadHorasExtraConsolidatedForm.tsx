
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, Calculator, Info, ArrowLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PeriodValidationService } from '@/services/PeriodValidationService';

interface NovedadHorasExtraConsolidatedFormProps {
  onBack: () => void;
  onSubmit: (formData: any[]) => void;
  employeeSalary: number;
  calculateSuggestedValue?: (tipoNovedad: string, subtipo: string | undefined, horas?: number) => Promise<number | null>;
  isSubmitting: boolean;
  periodStartDate?: string;
  periodEndDate?: string;
}

interface HorasExtraEntry {
  fecha: string;
  tipo: string;
  horas: number;
  valor: number;
  observacion: string;
}

const initialEntry: HorasExtraEntry = {
  fecha: '',
  tipo: 'diurna',
  horas: 0,
  valor: 0,
  observacion: ''
};

const tiposHorasExtra = [
  { value: 'diurna', label: 'Diurna (25%)' },
  { value: 'nocturna', label: 'Nocturna (75%)' },
  { value: 'diurna_festivo', label: 'Diurna Festivo (100%)' },
  { value: 'nocturna_festivo', label: 'Nocturna Festivo (150%)' }
];

export const NovedadHorasExtraConsolidatedForm: React.FC<NovedadHorasExtraConsolidatedFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary,
  calculateSuggestedValue,
  isSubmitting,
  periodStartDate,
  periodEndDate
}) => {
  const [entries, setEntries] = useState<HorasExtraEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<HorasExtraEntry>({
    fecha: '',
    tipo: 'diurna',
    horas: 0,
    valor: 0,
    observacion: ''
  });

  // ✅ NUEVO: Estado para validación de fecha actual
  const [dateValidation, setDateValidation] = useState<{
    isValid: boolean;
    message: string;
  }>({ isValid: true, message: '' });

  const calculateValue = useCallback(async () => {
    if (currentEntry.horas > 0 && currentEntry.tipo && calculateSuggestedValue) {
      const valorCalculado = await calculateSuggestedValue('horas_extra', currentEntry.tipo, currentEntry.horas);
      if (valorCalculado) {
        setCurrentEntry(prev => ({ ...prev, valor: valorCalculado }));
      }
    }
  }, [currentEntry.horas, currentEntry.tipo, calculateSuggestedValue]);

  useEffect(() => {
    calculateValue();
  }, [calculateValue]);

  // ✅ NUEVA: Validación en tiempo real de la fecha actual
  useEffect(() => {
    if (currentEntry.fecha && periodStartDate && periodEndDate) {
      const validation = PeriodValidationService.validateDateInPeriod(
        currentEntry.fecha,
        periodStartDate,
        periodEndDate,
        'horas_extra',
        `${periodStartDate} - ${periodEndDate}`
      );
      
      setDateValidation({
        isValid: validation.isValid,
        message: validation.message
      });
      
      console.log('🔍 Date validation for horas extra:', validation);
    } else if (currentEntry.fecha) {
      setDateValidation({
        isValid: false,
        message: 'No se puede validar: período no configurado'
      });
    } else {
      setDateValidation({ isValid: true, message: '' });
    }
  }, [currentEntry.fecha, periodStartDate, periodEndDate]);

  const handleAddEntry = () => {
    if (!currentEntry.fecha) {
      alert('Por favor seleccione una fecha');
      return;
    }

    if (!currentEntry.tipo) {
      alert('Por favor seleccione el tipo de hora extra');
      return;
    }

    if (currentEntry.horas <= 0) {
      alert('Por favor ingrese las horas');
      return;
    }

    // ✅ NUEVA: Validar fecha antes de agregar
    if (!dateValidation.isValid) {
      alert(dateValidation.message);
      return;
    }

    if (currentEntry.valor <= 0) {
      alert('El valor debe ser mayor a 0');
      return;
    }

    const newEntry = { ...currentEntry };
    setEntries(prev => [...prev, newEntry]);
    
    // Reset form
    setCurrentEntry({
      fecha: '',
      tipo: 'diurna',
      horas: 0,
      valor: 0,
      observacion: ''
    });
    
    console.log('✅ Entry added:', newEntry);
  };

  const handleRemoveEntry = (index: number) => {
    setEntries(prev => {
      const newEntries = [...prev];
      newEntries.splice(index, 1);
      return newEntries;
    });
  };

  const handleSubmit = () => {
    if (entries.length === 0) {
      alert('Por favor agregue al menos una entrada');
      return;
    }

    console.log('📤 Submitting horas extra:', entries);
    onSubmit(entries);
  };

  const calculateTotal = () => {
    return entries.reduce((acc, entry) => acc + entry.valor, 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b bg-white">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold text-gray-900">Horas Extra</h3>
      </div>

      {/* ✅ NUEVO: Información del período */}
      {periodStartDate && periodEndDate && (
        <div className="bg-blue-50 p-3 rounded border border-blue-200">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              Período de liquidación: {periodStartDate} - {periodEndDate}
            </span>
          </div>
          <div className="text-xs text-blue-700 mt-1">
            Las horas extra deben registrarse dentro de estas fechas
          </div>
        </div>
      )}

      {/* Entry Form */}
      <div className="bg-blue-50 p-4 rounded-lg space-y-4">
        <h4 className="text-blue-800 font-medium">Agregar Entrada</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="fecha" className="text-gray-700">Fecha *</Label>
            <Input
              type="date"
              value={currentEntry.fecha}
              onChange={(e) => setCurrentEntry(prev => ({ ...prev, fecha: e.target.value }))}
              className={`${!dateValidation.isValid && currentEntry.fecha ? 'border-red-300 bg-red-50' : ''}`}
            />
            {/* ✅ NUEVA: Validación visual de fecha */}
            {!dateValidation.isValid && currentEntry.fecha && (
              <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <span>❌</span>
                <span>Fecha fuera del período de liquidación</span>
              </div>
            )}
            {dateValidation.isValid && currentEntry.fecha && (
              <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <span>✅</span>
                <span>Fecha válida</span>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="tipo" className="text-gray-700">Tipo *</Label>
            <Select
              value={currentEntry.tipo}
              onValueChange={(value) => setCurrentEntry(prev => ({ ...prev, tipo: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un tipo" />
              </SelectTrigger>
              <SelectContent>
                {tiposHorasExtra.map(tipo => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="horas" className="text-gray-700">Horas *</Label>
            <Input
              type="number"
              min="0.5"
              step="0.5"
              value={currentEntry.horas}
              onChange={(e) => setCurrentEntry(prev => ({ ...prev, horas: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          <div>
            <Label htmlFor="valor" className="text-gray-700">Valor Estimado</Label>
            <Input
              type="number"
              min="0"
              step="1000"
              value={currentEntry.valor}
              readOnly
              className="bg-gray-100"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="observacion" className="text-gray-700">Observación</Label>
          <Textarea
            value={currentEntry.observacion}
            onChange={(e) => setCurrentEntry(prev => ({ ...prev, observacion: e.target.value }))}
            placeholder="Detalles adicionales de la hora extra..."
            rows={3}
            className="resize-none"
          />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleAddEntry}
            disabled={!currentEntry.fecha || !currentEntry.tipo || currentEntry.horas <= 0 || currentEntry.valor <= 0 || !dateValidation.isValid}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Entrada
          </Button>
        </div>
      </div>

      {/* Entries List */}
      {entries.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-lg font-semibold text-gray-900">Lista de Entradas</h4>
          <Table>
            <TableCaption>Horas extra registradas en este período.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, index) => (
                <TableRow key={index}>
                  <TableCell>{entry.fecha}</TableCell>
                  <TableCell>{tiposHorasExtra.find(t => t.value === entry.tipo)?.label || 'Desconocido'}</TableCell>
                  <TableCell>{entry.horas}</TableCell>
                  <TableCell>{formatCurrency(entry.valor)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveEntry(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Total */}
      {entries.length > 0 && (
        <div className="bg-green-50 p-4 rounded-lg text-right">
          <h5 className="text-sm font-medium text-gray-700">Total Horas Extra:</h5>
          <p className="text-2xl font-bold text-green-800">{formatCurrency(calculateTotal())}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={entries.length === 0 || isSubmitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? 'Guardando...' : 'Guardar Horas Extra'}
        </Button>
      </div>
    </div>
  );
};
