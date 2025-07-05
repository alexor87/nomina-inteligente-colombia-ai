
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Minus, AlertTriangle, Plus, Trash2, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useMultipleNovedadEntries } from '@/hooks/useMultipleNovedadEntries';

interface DeduccionEntry {
  id: string;
  tipo_novedad: string;
  subtipo?: string;
  valor: number;
  observacion?: string;
}

interface NovedadDeduccionesConsolidatedFormProps {
  onBack: () => void;
  onSubmit: (formDataArray: any[]) => void;
  employeeSalary: number;
}

const deduccionTypes = [
  { 
    value: 'multa', 
    label: 'Multa', 
    description: 'Sanciones disciplinarias',
    maxPercent: 50
  },
  { 
    value: 'descuento_voluntario', 
    label: 'Descuento Voluntario', 
    description: 'Descuentos autorizados por el empleado',
    maxPercent: 100
  },
  { 
    value: 'embargo', 
    label: 'Embargo', 
    description: 'Órdenes judiciales de embargo',
    maxPercent: 50
  },
  { 
    value: 'cooperativa', 
    label: 'Cooperativa', 
    description: 'Aportes a cooperativas',
    maxPercent: 30
  },
  { 
    value: 'seguro', 
    label: 'Seguro', 
    description: 'Pólizas de seguro',
    maxPercent: 20
  },
  { 
    value: 'prestamo_empresa', 
    label: 'Préstamo de la Empresa', 
    description: 'Descuentos por préstamos de la empresa',
    maxPercent: 30
  },
  { 
    value: 'otros_descuentos', 
    label: 'Otros Descuentos', 
    description: 'Otros conceptos de deducción',
    maxPercent: 50
  }
];

export const NovedadDeduccionesConsolidatedForm: React.FC<NovedadDeduccionesConsolidatedFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary
}) => {
  const { entries, addEntry, updateEntry, removeEntry, getTotalValue } = useMultipleNovedadEntries<DeduccionEntry>();
  
  const [newEntry, setNewEntry] = useState({
    tipo_novedad: '',
    valor: '',
    observacion: ''
  });

  const handleAddEntry = () => {
    if (!newEntry.tipo_novedad || !newEntry.valor || parseFloat(newEntry.valor) <= 0) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    const selectedType = deduccionTypes.find(t => t.value === newEntry.tipo_novedad);
    const valorNumerico = parseFloat(newEntry.valor);
    const porcentajeSalario = (valorNumerico / employeeSalary) * 100;
    
    if (selectedType && porcentajeSalario > selectedType.maxPercent) {
      if (!window.confirm(`Esta deducción excede el límite legal del ${selectedType.maxPercent}% del salario. ¿Desea continuar?`)) {
        return;
      }
    }

    addEntry({
      tipo_novedad: newEntry.tipo_novedad,
      valor: valorNumerico,
      observacion: newEntry.observacion || undefined
    });

    // Reset form
    setNewEntry({
      tipo_novedad: '',
      valor: '',
      observacion: ''
    });
  };

  const handleSubmit = () => {
    if (entries.length === 0) {
      alert('Agregue al menos una deducción');
      return;
    }

    // Check total deductions don't exceed safe limits
    const totalPercent = (getTotalValue() / employeeSalary) * 100;
    if (totalPercent > 50) {
      if (!window.confirm(`El total de deducciones (${totalPercent.toFixed(1)}%) excede el 50% del salario. ¿Desea continuar?`)) {
        return;
      }
    }

    const formDataArray = entries.map(entry => ({
      tipo_novedad: 'deducciones',
      subtipo: entry.tipo_novedad,
      valor: entry.valor,
      observacion: entry.observacion
    }));

    onSubmit(formDataArray);
  };

  const getTypeInfo = (tipo: string) => {
    return deduccionTypes.find(t => t.value === tipo);
  };

  const totalValue = getTotalValue();
  const totalPercent = (totalValue / employeeSalary) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b bg-white">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold text-gray-900">Deducciones</h3>
      </div>

      {/* Form to add new entry */}
      <div className="bg-blue-50 p-4 rounded-lg space-y-4">
        <h4 className="text-blue-800 font-medium">Agregar Nueva Deducción</h4>
        
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="tipo" className="text-gray-700">Tipo de Deducción</Label>
            <Select 
              value={newEntry.tipo_novedad} 
              onValueChange={(value) => setNewEntry(prev => ({ ...prev, tipo_novedad: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo de deducción" />
              </SelectTrigger>
              <SelectContent>
                {deduccionTypes.map((tipo) => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    <div>
                      <div className="font-medium">{tipo.label}</div>
                      <div className="text-xs text-gray-500">
                        {tipo.description} - Máx: {tipo.maxPercent}%
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="valor" className="text-gray-700">Valor de la Deducción</Label>
            <div className="relative">
              <Minus className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="number"
                placeholder="0"
                value={newEntry.valor}
                onChange={(e) => setNewEntry(prev => ({ ...prev, valor: e.target.value }))}
                min="0"
                step="1000"
                className="pl-10"
              />
            </div>
            {newEntry.valor && parseFloat(newEntry.valor) > 0 && newEntry.tipo_novedad && (
              <div className="mt-2 space-y-1">
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  -{formatCurrency(parseFloat(newEntry.valor))}
                </Badge>
                <p className="text-sm text-gray-600">
                  Porcentaje del salario: {((parseFloat(newEntry.valor) / employeeSalary) * 100).toFixed(1)}%
                </p>
              </div>
            )}
          </div>

          <div className="p-3 bg-white rounded border border-blue-200">
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <Info className="h-4 w-4" />
              <span className="font-medium">Recordatorio</span>
            </div>
            <p className="text-sm text-blue-600">
              Las deducciones están sujetas a límites legales según el Código Sustantivo del Trabajo.
            </p>
          </div>

          <div>
            <Label htmlFor="observacion" className="text-gray-700">Observaciones *</Label>
            <Textarea
              placeholder="Justificación y detalles de la deducción (requerido)..."
              value={newEntry.observacion}
              onChange={(e) => setNewEntry(prev => ({ ...prev, observacion: e.target.value }))}
              rows={3}
              required
              className="resize-none"
            />
          </div>

          <Button 
            onClick={handleAddEntry}
            disabled={!newEntry.tipo_novedad || !newEntry.valor || parseFloat(newEntry.valor) <= 0}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Deducción
          </Button>
        </div>
      </div>

      {/* List of added entries */}
      {entries.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Deducciones Agregadas ({entries.length})</h4>
          
          <div className="space-y-2">
            {entries.map((entry) => {
              const typeInfo = getTypeInfo(entry.tipo_novedad);
              const percent = (entry.valor / employeeSalary) * 100;
              const exceedsLimit = typeInfo && percent > typeInfo.maxPercent;

              return (
                <div key={entry.id} className="flex justify-between items-start p-3 border rounded-lg bg-white">
                  <div className="flex-1">
                    <div className="font-medium">{typeInfo?.label}</div>
                    <div className="text-sm text-gray-600">{formatCurrency(entry.valor)}</div>
                    <div className="text-xs text-gray-500">
                      {percent.toFixed(1)}% del salario
                      {exceedsLimit && (
                        <span className="text-red-600 ml-2">
                          ⚠️ Excede límite ({typeInfo.maxPercent}%)
                        </span>
                      )}
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
              <span>Total Deducciones:</span>
              <div className="text-right">
                <div className="text-xl font-bold text-blue-700">
                  {formatCurrency(totalValue)}
                </div>
                <div className="text-sm text-gray-600">
                  {totalPercent.toFixed(1)}% del salario
                </div>
              </div>
            </div>
            
            {totalPercent > 50 && (
              <div className="mt-2 p-2 bg-red-50 rounded text-red-700 text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                El total excede el límite recomendado del 50% del salario
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
          Guardar {entries.length} Deduccion{entries.length !== 1 ? 'es' : ''}
        </Button>
      </div>
    </div>
  );
};
