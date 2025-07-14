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
  
  const { calculateNovedad, calculateNovedadDebounced, isLoading, clearCache } = useNovedadBackendCalculation();

  // ✅ KISS: Clear cache y log fecha recibida
  useEffect(() => {
    console.log('🎯 KISS COMPONENT: Fecha recibida en componente:', periodoFecha);
    console.log('🎯 KISS COMPONENT: Tipo de fecha:', typeof periodoFecha);
    console.log('🎯 KISS COMPONENT: Fecha ISO string:', periodoFecha?.toISOString());
    console.log('🎯 KISS COMPONENT: Fecha local string:', periodoFecha?.toLocaleDateString());
    clearCache();
  }, [periodoFecha, clearCache]);

  // ✅ KISS: Efecto de cálculo con validación extrema
  useEffect(() => {
    if (subtipo && horas && parseFloat(horas) > 0) {
      const fechaCalculo = periodoFecha || new Date();
      
      console.log('🔄 KISS COMPONENT: *** INICIANDO CÁLCULO ***');
      console.log('🔄 KISS COMPONENT: Subtipo:', subtipo);
      console.log('🔄 KISS COMPONENT: Horas:', parseFloat(horas));
      console.log('🔄 KISS COMPONENT: Salario base:', employeeSalary);
      console.log('🔄 KISS COMPONENT: Fecha para cálculo:', fechaCalculo);
      console.log('🔄 KISS COMPONENT: Fecha ISO:', fechaCalculo.toISOString());
      
      // ✅ VALIDACIÓN ESPECÍFICA DE FECHAS CRÍTICAS
      const year = fechaCalculo.getFullYear();
      const month = String(fechaCalculo.getMonth() + 1).padStart(2, '0');
      const day = String(fechaCalculo.getDate()).padStart(2, '0');
      const fechaString = `${year}-${month}-${day}`;
      
      console.log('🔄 KISS COMPONENT: Fecha como string:', fechaString);
      
      if (fechaString === '2025-07-15') {
        console.log('🎯 KISS COMPONENT: *** 15 JULIO 2025 - ESPERANDO 220h MENSUALES ***');
        console.log('🎯 KISS COMPONENT: Valor esperado: ~$10,150 (mayor que $9,341)');
      } else if (fechaString === '2025-07-01') {
        console.log('🎯 KISS COMPONENT: *** 1 JULIO 2025 - ESPERANDO 230h MENSUALES ***');
        console.log('🎯 KISS COMPONENT: Valor esperado: $9,341');
      }
      
      calculateNovedad({
        tipoNovedad: 'horas_extra',
        subtipo,
        salarioBase: employeeSalary,
        horas: parseFloat(horas),
        fechaPeriodo: fechaCalculo
      }).then(result => {
        if (result && result.valor > 0) {
          console.log('✅ KISS COMPONENT: *** RESULTADO RECIBIDO ***');
          console.log('✅ KISS COMPONENT: Valor:', result.valor);
          console.log('✅ KISS COMPONENT: Divisor horario:', result.jornadaInfo.divisorHorario);
          console.log('✅ KISS COMPONENT: Valor hora ordinaria:', result.jornadaInfo.valorHoraOrdinaria);
          console.log('✅ KISS COMPONENT: Ley:', result.jornadaInfo.ley);
          
          // ✅ VALIDACIÓN FINAL DEL RESULTADO
          if (fechaString === '2025-07-15') {
            if (result.jornadaInfo.divisorHorario === 220) {
              console.log('✅ KISS SUCCESS: 15 julio usa correctamente 220h mensuales');
            } else {
              console.error('❌ KISS ERROR: 15 julio debería usar 220h pero usa', result.jornadaInfo.divisorHorario);
            }
          } else if (fechaString === '2025-07-01') {
            if (result.jornadaInfo.divisorHorario === 230) {
              console.log('✅ KISS SUCCESS: 1 julio usa correctamente 230h mensuales');
            } else {
              console.error('❌ KISS ERROR: 1 julio debería usar 230h pero usa', result.jornadaInfo.divisorHorario);
            }
          }
          
          setValorCalculado(result.valor);
          setUseManualValue(false);
        } else {
          console.log('⚠️ KISS COMPONENT: No se obtuvo resultado válido');
          setValorCalculado(0);
        }
      }).catch(error => {
        console.error('❌ KISS COMPONENT: Error en cálculo:', error);
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

      {/* ✅ KISS: Información visual de debugging mejorada */}
      {periodoFecha && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2 text-blue-700">
            <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">🎯 KISS Debug - Fecha de cálculo: {periodoFecha.toLocaleDateString('es-ES')}</p>
              <p>Los valores se calculan según la jornada legal vigente para esta fecha.</p>
              <div className="mt-2 font-mono text-xs bg-blue-100 p-2 rounded">
                <p>📅 Fecha original: {periodoFecha.toString()}</p>
                <p>📅 ISO String: {periodoFecha.toISOString()}</p>
                <p>📅 Formato enviado: {periodoFecha.getFullYear()}-{String(periodoFecha.getMonth() + 1).padStart(2, '0')}-{String(periodoFecha.getDate()).padStart(2, '0')}</p>
                {periodoFecha.toISOString().split('T')[0] === '2025-07-15' && (
                  <p className="text-green-600 font-bold">✅ 15 julio → Debe usar 220h mensuales → ~$10,150</p>
                )}
                {periodoFecha.toISOString().split('T')[0] === '2025-07-01' && (
                  <p className="text-orange-600 font-bold">✅ 1 julio → Debe usar 230h mensuales → $9,341</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backend calculation info */}
      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-start gap-2 text-green-700">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium">🎯 KISS Debug: Cálculo automático backend (sin caché)</p>
            <p>Validación de transición jornada legal: 230h → 220h el 15 julio 2025</p>
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
              <span className="font-medium">🎯 KISS Debug: Calculando en backend...</span>
            </div>
          </div>
        )}

        {/* ✅ KISS: Resultado con información de debugging */}
        {valorCalculado > 0 && !isLoading && (
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 text-green-700">
              <Calculator className="h-4 w-4" />
              <span className="font-medium">Valor Calculado: {formatCurrency(valorCalculado)}</span>
            </div>
            <div className="mt-2 text-xs text-green-600 font-mono bg-green-100 p-2 rounded">
              🎯 KISS: Para {periodoFecha?.toLocaleDateString('es-ES')} (backend sin caché)
              {periodoFecha?.toISOString().split('T')[0] === '2025-07-15' && valorCalculado > 9500 && (
                <p className="text-green-700 font-bold">✅ Correcto: Valor superior a $9,341 (usando 220h)</p>
              )}
              {periodoFecha?.toISOString().split('T')[0] === '2025-07-01' && Math.abs(valorCalculado - 9341) < 100 && (
                <p className="text-orange-700 font-bold">✅ Correcto: ~$9,341 (usando 230h)</p>
              )}
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
