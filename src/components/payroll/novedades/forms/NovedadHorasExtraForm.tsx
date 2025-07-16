
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Calculator, Info, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useNovedadBackendCalculation } from '@/hooks/useNovedadBackendCalculation';
import { NovedadDebugPanel } from '@/components/payroll/NovedadDebugPanel';

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
  const [fechaExtra, setFechaExtra] = useState<Date>(new Date());
  const [valorCalculado, setValorCalculado] = useState<number>(0);
  const [valorManual, setValorManual] = useState<string>('');
  const [useManualValue, setUseManualValue] = useState(false);
  const [observacion, setObservacion] = useState<string>('');
  const [isValidationPassing, setIsValidationPassing] = useState<boolean | null>(null);
  
  const { calculateNovedad, calculateNovedadDebounced, isLoading } = useNovedadBackendCalculation();

  // Initialize component
  useEffect(() => {
    console.log('🚀 ULTRA-KISS FORM: *** COMPONENTE INICIALIZADO ***');
    console.log('🚀 ULTRA-KISS FORM: Período:', periodoFecha);
    console.log('🚀 ULTRA-KISS FORM: Salario empleado:', employeeSalary);
    console.log('🚀 ULTRA-KISS FORM: Fecha inicial para horas extra:', fechaExtra);
  }, [periodoFecha]);

  // Calculation effect using the actual overtime date
  useEffect(() => {
    if (subtipo && horas && parseFloat(horas) > 0) {
      console.log('🚀 ULTRA-KISS FORM: *** INICIANDO CÁLCULO ***');
      console.log('🚀 ULTRA-KISS FORM: Subtipo:', subtipo);
      console.log('🚀 ULTRA-KISS FORM: Horas:', parseFloat(horas));
      console.log('🚀 ULTRA-KISS FORM: Salario base:', employeeSalary);
      console.log('🚀 ULTRA-KISS FORM: Fecha para cálculo (fecha extra):', fechaExtra);
      
      // Format date for calculation
      const year = fechaExtra.getFullYear();
      const month = String(fechaExtra.getMonth() + 1).padStart(2, '0');
      const day = String(fechaExtra.getDate()).padStart(2, '0');
      const fechaString = `${year}-${month}-${day}`;
      
      console.log('🚀 ULTRA-KISS FORM: Fecha como string:', fechaString);
      
      // Specific date validation
      if (fechaString === '2025-07-15') {
        console.log('🎯 ULTRA-KISS FORM: *** 15 JULIO 2025 - ESPERANDO $9,765 ***');
      } else if (fechaString === '2025-07-01') {
        console.log('🎯 ULTRA-KISS FORM: *** 1 JULIO 2025 - ESPERANDO $9,341 ***');
      }
      
      calculateNovedad({
        tipoNovedad: 'horas_extra',
        subtipo,
        salarioBase: employeeSalary,
        horas: parseFloat(horas),
        fechaPeriodo: fechaExtra
      }).then(result => {
        if (result && result.valor > 0) {
          console.log('🚀 ULTRA-KISS FORM: *** RESULTADO RECIBIDO ***');
          console.log('🚀 ULTRA-KISS FORM: Valor:', result.valor);
          console.log('🚀 ULTRA-KISS FORM: Divisor horario:', result.jornadaInfo.divisorHorario);
          console.log('🚀 ULTRA-KISS FORM: Valor hora ordinaria:', result.jornadaInfo.valorHoraOrdinaria);
          
          // Ultra-specific validation
          let validationPassed = null;
          const expectedValue15July = Math.round((1718661 / 220) * 1.25 * parseFloat(horas)); // ~9765 for 1 hour
          const expectedValue1July = Math.round((1718661 / 230) * 1.25 * parseFloat(horas)); // ~9341 for 1 hour
          
          if (fechaString === '2025-07-15') {
            validationPassed = Math.abs(result.valor - expectedValue15July) < 50;
            if (validationPassed) {
              console.log('✅ ULTRA-KISS FORM SUCCESS: 15 julio usa correctamente 220h - Valor:', result.valor, 'Esperado:', expectedValue15July);
            } else {
              console.error('❌ ULTRA-KISS FORM ERROR: 15 julio valor incorrecto:', result.valor, 'Esperado:', expectedValue15July);
            }
          } else if (fechaString === '2025-07-01') {
            validationPassed = Math.abs(result.valor - expectedValue1July) < 50;
            if (validationPassed) {
              console.log('✅ ULTRA-KISS FORM SUCCESS: 1 julio usa correctamente 230h - Valor:', result.valor, 'Esperado:', expectedValue1July);
            } else {
              console.error('❌ ULTRA-KISS FORM ERROR: 1 julio valor incorrecto:', result.valor, 'Esperado:', expectedValue1July);
            }
          }
          
          setValorCalculado(result.valor);
          setIsValidationPassing(validationPassed);
          setUseManualValue(false);
        } else {
          console.log('⚠️ ULTRA-KISS FORM: No se obtuvo resultado válido');
          setValorCalculado(0);
          setIsValidationPassing(null);
        }
      }).catch(error => {
        console.error('❌ ULTRA-KISS FORM: Error en cálculo:', error);
        setValorCalculado(0);
        setIsValidationPassing(null);
      });
    } else {
      setValorCalculado(0);
      setIsValidationPassing(null);
    }
  }, [subtipo, horas, employeeSalary, fechaExtra, calculateNovedad]);

  const handleSubmit = () => {
    const finalValue = useManualValue && valorManual ? parseFloat(valorManual) : valorCalculado;

    onSubmit({
      tipo_novedad: 'horas_extra',
      subtipo,
      horas: parseFloat(horas),
      valor: finalValue,
      observacion,
      fecha_inicio: fechaExtra.toISOString().split('T')[0],
      fecha_fin: fechaExtra.toISOString().split('T')[0]
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

      {/* Period info */}
      {periodoFecha && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2 text-blue-700">
            <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">🚀 ULTRA-KISS - Período: {periodoFecha.toLocaleDateString('es-ES')}</p>
              <p>Debugging ultra-agresivo habilitado</p>
              <div className="mt-2 font-mono text-xs bg-blue-100 p-2 rounded">
                <p>📅 Período: {periodoFecha.getFullYear()}-{String(periodoFecha.getMonth() + 1).padStart(2, '0')}-{String(periodoFecha.getDate()).padStart(2, '0')}</p>
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
            <p className="font-medium">🚀 ULTRA-KISS: Backend con lógica de jornada legal unificada</p>
            <p>Cálculo basado en la fecha exacta de la hora extra</p>
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
          <Label htmlFor="fechaExtra">Fecha de la Hora Extra</Label>
          <Input
            id="fechaExtra"
            type="date"
            value={fechaExtra.toISOString().split('T')[0]}
            onChange={(e) => setFechaExtra(new Date(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Selecciona la fecha exacta cuando se trabajaron las horas extra
          </p>
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
              <span className="font-medium">🚀 ULTRA-KISS: Calculando con lógica unificada...</span>
            </div>
          </div>
        )}

        {/* Calculation result with validation */}
        {valorCalculado > 0 && !isLoading && (
          <div className={`p-4 rounded-lg border-2 ${
            isValidationPassing === true ? 'bg-green-50 border-green-300' :
            isValidationPassing === false ? 'bg-red-50 border-red-300' :
            'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center gap-2">
              {isValidationPassing === true && <CheckCircle className="h-5 w-5 text-green-600" />}
              {isValidationPassing === false && <XCircle className="h-5 w-5 text-red-600" />}
              <Calculator className="h-4 w-4" />
              <span className="font-medium">Valor Calculado: {formatCurrency(valorCalculado)}</span>
            </div>
            <div className={`mt-2 text-xs font-mono p-2 rounded ${
              isValidationPassing === true ? 'bg-green-100 text-green-700' :
              isValidationPassing === false ? 'bg-red-100 text-red-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              🚀 ULTRA-KISS: Para {fechaExtra.toLocaleDateString('es-ES')}
              {isValidationPassing === true && (
                <p className="font-bold">✅ VALIDACIÓN CORRECTA</p>
              )}
              {isValidationPassing === false && (
                <p className="font-bold">❌ VALIDACIÓN FALLIDA</p>
              )}
              {fechaExtra.toISOString().split('T')[0] === '2025-07-15' && (
                <p className="mt-1">Esperado: ${formatCurrency(Math.round((1718661 / 220) * 1.25 * parseFloat(horas || '1')))} (220h mensuales)</p>
              )}
              {fechaExtra.toISOString().split('T')[0] === '2025-07-01' && (
                <p className="mt-1">Esperado: ${formatCurrency(Math.round((1718661 / 230) * 1.25 * parseFloat(horas || '1')))} (230h mensuales)</p>
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
      
      {/* Debug panel using the overtime date */}
      {horas && parseFloat(horas) > 0 && (
        <NovedadDebugPanel
          fecha={fechaExtra}
          horas={horas}
          salario={employeeSalary}
          valorCalculado={valorCalculado}
          validationPassed={isValidationPassing}
          onDateChange={setFechaExtra}
        />
      )}
    </div>
  );
};
