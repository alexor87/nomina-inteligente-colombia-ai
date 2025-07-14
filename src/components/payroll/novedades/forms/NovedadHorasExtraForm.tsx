
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Calculator, Info, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useNovedadBackendCalculation } from '@/hooks/useNovedadBackendCalculation';

interface NovedadHorasExtraFormProps {
  onBack: () => void;
  onSubmit: (data: any) => void;
  employeeSalary: number;
  periodoFecha?: Date;
  calculateSuggestedValue?: never; // ⚠️ ELIMINADO - ya no se usa
}

const horasExtraSubtipos = [
  { value: 'diurnas', label: 'Diurnas (25%)', description: 'Lunes a sábado 6:00 AM - 10:00 PM' },
  { value: 'nocturnas', label: 'Nocturnas (75%)', description: 'Lunes a sábado 10:00 PM - 6:00 AM' },
  { value: 'dominicales_diurnas', label: 'Dominicales Diurnas (100%)', description: 'Domingos 6:00 AM - 10:00 PM' },
  { value: 'dominicales_nocturnas', label: 'Dominicales Nocturnas (150%)', description: 'Domingos 10:00 PM - 6:00 AM' },
  { value: 'festivas_diurnas', label: 'Festivas Diurnas (100%)', description: 'Días festivos 6:00 AM - 10:00 PM' },
  { value: 'festivas_nocturnas', label: 'Festivas Nocturnas (150%)', description: 'Días festivos 10:00 PM - 6:00 AM' }
];

export const NovedadHorasExtraForm: React.FC<NovedadHorasExtraFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary,
  periodoFecha
}) => {
  const [subtipo, setSubtipo] = useState<string>('');
  const [horas, setHoras] = useState<string>('');
  const [valorCalculado, setValorCalculado] = useState<number>(0);
  const [valorManual, setValorManual] = useState<string>('');
  const [useManualValue, setUseManualValue] = useState(false);
  const [observacion, setObservacion] = useState<string>('');
  
  // ✅ SOLO BACKEND CALCULATION
  const { calculateNovedad, isLoading, clearCache } = useNovedadBackendCalculation();

  // ✅ NUEVA FUNCIONALIDAD: Limpiar cache cuando cambie la fecha del período
  useEffect(() => {
    console.log('🗓️ Período fecha changed:', periodoFecha?.toISOString().split('T')[0]);
    clearCache(); // Limpiar cache cuando cambie la fecha
  }, [periodoFecha, clearCache]);

  // ✅ BACKEND CALCULATION - con fecha exacta del período
  useEffect(() => {
    if (subtipo && horas && parseFloat(horas) > 0) {
      const fechaCalculo = periodoFecha || new Date();
      
      console.log('🔄 Calculating hours extra via backend:', { 
        subtipo, 
        horas: parseFloat(horas),
        fechaCalculo: fechaCalculo.toISOString().split('T')[0],
        salarioBase: employeeSalary
      });
      
      calculateNovedad({
        tipoNovedad: 'horas_extra',
        subtipo,
        salarioBase: employeeSalary,
        horas: parseFloat(horas),
        fechaPeriodo: fechaCalculo
      }).then(result => {
        if (result && result.valor > 0) {
          console.log('✅ Backend calculation result:', {
            valor: result.valor,
            factorCalculo: result.factorCalculo,
            detalleCalculo: result.detalleCalculo,
            jornadaInfo: result.jornadaInfo
          });
          setValorCalculado(result.valor);
          setUseManualValue(false);
        } else {
          console.log('⚠️ No result from backend calculation');
          setValorCalculado(0);
        }
      }).catch(error => {
        console.error('❌ Error calculating via backend:', error);
        setValorCalculado(0);
      });
    } else {
      setValorCalculado(0);
    }
  }, [subtipo, horas, employeeSalary, periodoFecha, calculateNovedad]);

  const handleSubmit = () => {
    const finalValue = useManualValue && valorManual ? parseFloat(valorManual) : valorCalculado;

    onSubmit({
      tipo_novedad: 'horas_extra',
      subtipo,
      horas: parseFloat(horas),
      valor: finalValue,
      observacion
    });
  };

  const isValid = subtipo && horas && parseFloat(horas) > 0 && (
    (valorCalculado > 0) || 
    (useManualValue && valorManual && parseFloat(valorManual) > 0)
  );

  const finalValue = useManualValue && valorManual ? parseFloat(valorManual) : valorCalculado;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Horas Extra</h3>
      </div>

      {/* ✅ NUEVO: Mostrar fecha de cálculo para transparencia */}
      {periodoFecha && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2 text-blue-700">
            <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Fecha de cálculo: {periodoFecha.toLocaleDateString('es-ES')}</p>
              <p>Los valores se calculan según la jornada legal vigente para esta fecha.</p>
            </div>
          </div>
        </div>
      )}

      {/* Backend calculation info */}
      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-start gap-2 text-green-700">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Cálculo automático con jornada legal dinámica</p>
            <p>Los valores se calculan automáticamente en el backend usando la legislación vigente para la fecha del período.</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="subtipo">Tipo de Horas Extra</Label>
          <Select value={subtipo} onValueChange={setSubtipo}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el tipo de horas extra" />
            </SelectTrigger>
            <SelectContent>
              {horasExtraSubtipos.map((tipo) => (
                <SelectItem key={tipo.value} value={tipo.value}>
                  <div>
                    <div className="font-medium">{tipo.label}</div>
                    <div className="text-xs text-gray-500">{tipo.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="horas">Cantidad de Horas</Label>
          <Input
            id="horas"
            type="number"
            placeholder="0"
            value={horas}
            onChange={(e) => setHoras(e.target.value)}
            min="0"
            step="0.5"
          />
        </div>

        {/* Backend calculation result */}
        {isLoading && (
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2 text-yellow-700">
              <Calculator className="h-4 w-4 animate-spin" />
              <span className="font-medium">Calculando en backend...</span>
            </div>
          </div>
        )}

        {valorCalculado > 0 && !isLoading && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 text-green-700">
              <Calculator className="h-4 w-4" />
              <span className="font-medium">Valor Calculado: {formatCurrency(valorCalculado)}</span>
            </div>
            <div className="text-xs text-green-600 mt-1">Calculado con jornada legal dinámica</div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="useManualValue"
            checked={useManualValue}
            onChange={(e) => setUseManualValue(e.target.checked)}
            className="rounded"
          />
          <Label htmlFor="useManualValue" className="text-sm">
            Usar valor manual
          </Label>
        </div>

        {useManualValue && (
          <div>
            <Label htmlFor="valorManual">Valor Manual</Label>
            <Input
              id="valorManual"
              type="number"
              placeholder="0"
              value={valorManual}
              onChange={(e) => setValorManual(e.target.value)}
              min="0"
            />
          </div>
        )}

        {finalValue > 0 && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-blue-700">
              <span className="font-medium">Valor Final: {formatCurrency(finalValue)}</span>
            </div>
          </div>
        )}

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
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Atrás
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!isValid || isLoading}
          className="min-w-[120px]"
        >
          {isLoading ? 'Calculando...' : 'Agregar Novedad'}
        </Button>
      </div>
    </div>
  );
};
