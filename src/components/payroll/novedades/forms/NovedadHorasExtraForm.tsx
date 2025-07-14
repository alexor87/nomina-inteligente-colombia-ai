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
  calculateSuggestedValue?: never;
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
  
  const { calculateNovedad, isLoading, clearCache } = useNovedadBackendCalculation();

  // ✅ KISS: Logging detallado de la fecha desde el componente
  useEffect(() => {
    const fechaStr = periodoFecha?.toISOString().split('T')[0] || 'no-date';
    console.log('🎯 KISS DEBUG: Component received period date:', {
      original: periodoFecha,
      formatted: fechaStr,
      displayDate: periodoFecha?.toLocaleDateString('es-ES')
    });
    clearCache();
  }, [periodoFecha, clearCache]);

  // ✅ CÁLCULO CON VALIDACIÓN ESTRICTA Y LOGGING DETALLADO
  useEffect(() => {
    if (subtipo && horas && parseFloat(horas) > 0) {
      const fechaCalculo = periodoFecha || new Date();
      const fechaStr = fechaCalculo.toISOString().split('T')[0];
      
      // ✅ KISS: Logging ultra-detallado del cálculo
      console.log('🔄 KISS DEBUG: Iniciando cálculo horas extra:', { 
        subtipo, 
        horas: parseFloat(horas),
        salarioBase: employeeSalary,
        fechaOriginal: periodoFecha,
        fechaCalculo: fechaCalculo,
        fechaStr: fechaStr,
        fechaDisplay: periodoFecha?.toLocaleDateString('es-ES')
      });
      
      // ✅ VALIDACIÓN ESPECÍFICA PARA LAS FECHAS PROBLEMA
      if (fechaStr === '2025-07-01') {
        console.log('🎯 KISS DEBUG: *** COMPONENTE - 1 JULIO 2025 - Debe calcular con 230h ***');
      } else if (fechaStr === '2025-07-15') {
        console.log('🎯 KISS DEBUG: *** COMPONENTE - 15 JULIO 2025 - Debe calcular con 220h ***');
      }
      
      calculateNovedad({
        tipoNovedad: 'horas_extra',
        subtipo,
        salarioBase: employeeSalary,
        horas: parseFloat(horas),
        fechaPeriodo: fechaCalculo
      }).then(result => {
        if (result && result.valor > 0) {
          console.log('✅ KISS DEBUG: Resultado final del componente para', fechaStr, ':', {
            valor: result.valor,
            divisorHorario: result.jornadaInfo.divisorHorario,
            valorHoraOrdinaria: result.jornadaInfo.valorHoraOrdinaria,
            ley: result.jornadaInfo.ley
          });
          
          // ✅ VALIDACIÓN ESPECÍFICA DE RESULTADOS
          if (fechaStr === '2025-07-01' && result.jornadaInfo.divisorHorario === 230) {
            console.log('✅ KISS SUCCESS: 1 Julio correctamente usa 230h mensuales');
          } else if (fechaStr === '2025-07-15' && result.jornadaInfo.divisorHorario === 220) {
            console.log('✅ KISS SUCCESS: 15 Julio correctamente usa 220h mensuales');
          } else if (['2025-07-01', '2025-07-15'].includes(fechaStr)) {
            console.error('❌ KISS ERROR: Fecha', fechaStr, 'usa divisor', result.jornadaInfo.divisorHorario, 'cuando debería usar', fechaStr === '2025-07-01' ? '230' : '220');
          }
          
          setValorCalculado(result.valor);
          setUseManualValue(false);
        } else {
          console.log('⚠️ KISS DEBUG: No se obtuvo resultado válido para', fechaStr);
          setValorCalculado(0);
        }
      }).catch(error => {
        console.error('❌ KISS DEBUG: Error calculando para', fechaStr, ':', error);
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

      {/* Date display con información de debugging */}
      {periodoFecha && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2 text-blue-700">
            <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Fecha de cálculo: {periodoFecha.toLocaleDateString('es-ES')}</p>
              <p>Los valores se calculan según la jornada legal vigente para esta fecha.</p>
              {/* ✅ KISS: Mostrar información de debugging */}
              <p className="text-xs mt-1 font-mono">
                Debug: {periodoFecha.toISOString().split('T')[0]} | 
                {periodoFecha.toISOString().split('T')[0] === '2025-07-01' ? ' Espera 230h' : 
                 periodoFecha.toISOString().split('T')[0] === '2025-07-15' ? ' Espera 220h' : ' Fecha normal'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Backend calculation info */}
      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-start gap-2 text-green-700">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium">🎯 KISS Debug: Cálculo automático (sin caché)</p>
            <p>Los valores se calculan en tiempo real para verificar la transición de jornada legal.</p>
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

        {/* Loading state */}
        {isLoading && (
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2 text-yellow-700">
              <Calculator className="h-4 w-4 animate-spin" />
              <span className="font-medium">🎯 KISS Debug: Calculando en backend (sin caché)...</span>
            </div>
          </div>
        )}

        {/* Calculated value display */}
        {valorCalculado > 0 && !isLoading && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 text-green-700">
              <Calculator className="h-4 w-4" />
              <span className="font-medium">Valor Calculado: {formatCurrency(valorCalculado)}</span>
            </div>
            <div className="text-xs text-green-600 mt-1">
              🎯 KISS: Calculado dinámicamente para {periodoFecha?.toLocaleDateString('es-ES')} (sin caché)
            </div>
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
