
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Calculator, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getJornadaLegal, getDailyHours } from '@/utils/jornadaLegal';

interface NovedadHorasExtraConsolidatedFormProps {
  onBack: () => void;
  onSubmit: (data: any[]) => void;
  employeeSalary: number;
  calculateSuggestedValue?: (tipo: string, subtipo: string | undefined, horas?: number) => number | null;
}

interface HorasExtraRow {
  subtipo: string;
  label: string;
  description: string;
  factor: string;
  horas: string;
  valor: number;
}

const horasExtraTypes: Omit<HorasExtraRow, 'horas' | 'valor'>[] = [
  { subtipo: 'diurnas', label: 'Diurnas', description: 'Lunes a sábado 6:00 AM - 10:00 PM', factor: '1.25' },
  { subtipo: 'nocturnas', label: 'Nocturnas', description: 'Lunes a sábado 10:00 PM - 6:00 AM', factor: '1.75' },
  { subtipo: 'dominicales_diurnas', label: 'Dominicales Diurnas', description: 'Domingos 6:00 AM - 10:00 PM', factor: '2.05' }, // Corregido
  { subtipo: 'dominicales_nocturnas', label: 'Dominicales Nocturnas', description: 'Domingos 10:00 PM - 6:00 AM', factor: '2.55' }, // Corregido
  { subtipo: 'festivas_diurnas', label: 'Festivas Diurnas', description: 'Días festivos 6:00 AM - 10:00 PM', factor: '2.05' }, // Corregido
  { subtipo: 'festivas_nocturnas', label: 'Festivas Nocturnas', description: 'Días festivos 10:00 PM - 6:00 AM', factor: '2.55' } // Corregido
];

export const NovedadHorasExtraConsolidatedForm: React.FC<NovedadHorasExtraConsolidatedFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary,
  calculateSuggestedValue
}) => {
  const [rows, setRows] = useState<HorasExtraRow[]>(
    horasExtraTypes.map(type => ({
      ...type,
      horas: '',
      valor: 0
    }))
  );
  const [observacion, setObservacion] = useState<string>('');

  // Get current legal workday info for display
  const jornadaLegal = getJornadaLegal();
  const horasPorDia = getDailyHours();

  const updateRow = (index: number, horas: string) => {
    const newRows = [...rows];
    newRows[index].horas = horas;
    
    // Calculate value if hours are provided
    if (horas && parseFloat(horas) > 0 && calculateSuggestedValue) {
      const calculatedValue = calculateSuggestedValue('horas_extra', newRows[index].subtipo, parseFloat(horas));
      newRows[index].valor = calculatedValue || 0;
    } else {
      newRows[index].valor = 0;
    }
    
    setRows(newRows);
  };

  const getTotalHoras = () => {
    return rows.reduce((total, row) => total + (parseFloat(row.horas) || 0), 0);
  };

  const getTotalValor = () => {
    return rows.reduce((total, row) => total + row.valor, 0);
  };

  const getValidRows = () => {
    return rows.filter(row => row.horas && parseFloat(row.horas) > 0);
  };

  const handleSubmit = () => {
    const validRows = getValidRows();
    
    const novedadesData = validRows.map(row => ({
      tipo_novedad: 'horas_extra',
      subtipo: row.subtipo,
      horas: parseFloat(row.horas),
      valor: row.valor,
      observacion
    }));

    onSubmit(novedadesData);
  };

  const isValid = getValidRows().length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Horas Extra</h3>
      </div>

      {/* Legal workday info */}
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-2 text-blue-700">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Jornada legal vigente: {jornadaLegal.horasSemanales} horas semanales</p>
            <p>Horas por día: {horasPorDia.toFixed(2)} según {jornadaLegal.ley}</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden border border-gray-200 rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Concepto</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-700">Factor</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-700"># Horas</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">Valor Calculado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((row, index) => (
              <tr key={row.subtipo} className={`hover:bg-gray-50 ${row.horas && parseFloat(row.horas) > 0 ? 'bg-blue-50' : ''}`}>
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium text-gray-900">{row.label}</div>
                    <div className="text-xs text-gray-500">{row.description}</div>
                  </div>
                </td>
                <td className="px-4 py-3 text-center font-medium text-gray-900">
                  {row.factor}
                </td>
                <td className="px-4 py-3 text-center">
                  <Input
                    type="number"
                    placeholder="0"
                    value={row.horas}
                    onChange={(e) => updateRow(index, e.target.value)}
                    min="0"
                    step="0.5"
                    className="w-20 text-center"
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-medium ${row.valor > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                    {formatCurrency(row.valor)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-100">
            <tr>
              <td className="px-4 py-3 font-semibold text-gray-900">TOTAL</td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3 text-center font-semibold text-gray-900">
                {getTotalHoras().toFixed(1)}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-green-600">
                {formatCurrency(getTotalValor())}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Summary */}
      {isValid && (
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 text-green-700">
            <Calculator className="h-4 w-4" />
            <span className="font-medium">
              Se crearán {getValidRows().length} novedades de horas extra por un total de {formatCurrency(getTotalValor())}
            </span>
          </div>
        </div>
      )}

      {/* Observations */}
      <div>
        <Label htmlFor="observacion">Observaciones (Opcional)</Label>
        <Textarea
          id="observacion"
          placeholder="Detalles adicionales sobre las horas extra..."
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Atrás
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!isValid}
          className="min-w-[120px]"
        >
          Agregar Novedades ({getValidRows().length})
        </Button>
      </div>
    </div>
  );
};
