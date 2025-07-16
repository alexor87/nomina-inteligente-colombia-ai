
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calculator, Info, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { NovedadType } from '@/types/novedades-enhanced';
import { RecargosCalculationService } from '@/services/RecargosCalculationService';
import { useNovedadBackendCalculation } from '@/hooks/useNovedadBackendCalculation';

interface NovedadRecargoFormProps {
  onBack: () => void;
  onSubmit: (formData: any) => void;
  employeeSalary: number;
  periodoFecha?: Date;
  calculateSuggestedValue?: (
    tipoNovedad: NovedadType,
    subtipo: string | undefined,
    horas?: number,
    dias?: number
  ) => number | null;
}

export const NovedadRecargoForm: React.FC<NovedadRecargoFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary,
  periodoFecha
}) => {
  const [formData, setFormData] = useState({
    subtipo: 'nocturno',
    horas: '',
    valor: 0,
    observacion: ''
  });

  const [jornadaInfo, setJornadaInfo] = useState<any>(null);
  const [factorInfo, setFactorInfo] = useState<any>(null);
  const [recargoSubtipos, setRecargoSubtipos] = useState<any[]>([]);

  // ✅ INTEGRAR: Hook de backend para cálculo automático
  const { calculateNovedadDebounced, isLoading, error } = useNovedadBackendCalculation();

  useEffect(() => {
    const fechaCalculo = periodoFecha || new Date();
    const tiposRecargo = RecargosCalculationService.getTiposRecargo(fechaCalculo);
    
    const subtiposFormateados = tiposRecargo.map(tipo => ({
      value: tipo.tipo,
      label: `${tipo.tipo === 'nocturno' ? 'Nocturno' : 
               tipo.tipo === 'dominical' ? 'Dominical' :
               'Nocturno Dominical'} (${tipo.porcentaje})`,
      description: tipo.descripcion,
      normativa: tipo.normativa,
      factor: tipo.factor,
      porcentaje: tipo.porcentaje
    }));
    
    setRecargoSubtipos(subtiposFormateados);
    
    console.log('🎯 ALELUYA FORM: Subtipos cargados con factores totales:', {
      fechaCalculo: fechaCalculo.toISOString().split('T')[0],
      subtipos: subtiposFormateados.length,
      factores: subtiposFormateados.map(s => ({ tipo: s.value, factor: s.factor }))
    });
  }, [periodoFecha]);

  // ✅ NUEVO: Cálculo automático usando backend con fallback local
  useEffect(() => {
    if (formData.horas && parseFloat(formData.horas) > 0 && employeeSalary > 0) {
      const horas = parseFloat(formData.horas);
      
      console.log('🔄 ALELUYA AUTO-CALC: Iniciando cálculo automático:', {
        subtipo: formData.subtipo,
        horas,
        salario: employeeSalary,
        fecha: periodoFecha?.toISOString().split('T')[0]
      });

      // ✅ PRIORIDAD 1: Usar backend calculation
      calculateNovedadDebounced(
        {
          tipoNovedad: 'recargo_nocturno',
          subtipo: formData.subtipo,
          salarioBase: employeeSalary,
          horas,
          fechaPeriodo: periodoFecha || new Date()
        },
        (result) => {
          if (result && result.valor > 0) {
            console.log('✅ ALELUYA BACKEND SUCCESS:', {
              valor: result.valor,
              factor: result.factorCalculo,
              detalle: result.detalleCalculo
            });
            
            setFormData(prev => ({ ...prev, valor: result.valor }));
            setJornadaInfo(result.jornadaInfo);
            setFactorInfo({
              fechaVigencia: periodoFecha || new Date(),
              normativaAplicable: result.detalleCalculo,
              factorOriginal: result.factorCalculo,
              porcentajeDisplay: `${(result.factorCalculo * 100).toFixed(0)}%`
            });
          } else {
            console.log('⚠️ ALELUYA FALLBACK: Backend falló, usando cálculo local');
            
            // ✅ FALLBACK: Cálculo local si backend falla
            try {
              const localResult = RecargosCalculationService.calcularRecargo({
                salarioBase: employeeSalary,
                tipoRecargo: formData.subtipo as any,
                horas,
                fechaPeriodo: periodoFecha || new Date()
              });
              
              console.log('✅ ALELUYA LOCAL FALLBACK:', localResult);
              setFormData(prev => ({ ...prev, valor: localResult.valorRecargo }));
              setJornadaInfo(localResult.jornadaInfo);
              setFactorInfo(localResult.factorInfo);
            } catch (localError) {
              console.error('❌ ALELUYA LOCAL ERROR:', localError);
            }
          }
        },
        300 // Debounce más rápido para UX mejor
      );
    } else if (!formData.horas || parseFloat(formData.horas) <= 0) {
      // Limpiar valores cuando no hay horas
      setFormData(prev => ({ ...prev, valor: 0 }));
      setJornadaInfo(null);
      setFactorInfo(null);
    }
  }, [formData.subtipo, formData.horas, employeeSalary, periodoFecha, calculateNovedadDebounced]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.horas || parseFloat(formData.horas) <= 0) {
      alert('Por favor ingrese las horas de recargo');
      return;
    }

    if (formData.valor <= 0) {
      alert('El valor debe ser mayor a 0');
      return;
    }

    const submitData = {
      tipo_novedad: 'recargo_nocturno',
      subtipo: formData.subtipo,
      horas: parseFloat(formData.horas),
      valor: formData.valor,
      observacion: formData.observacion || undefined
    };

    console.log('📤 Submitting recargo con factores totales Aleluya:', submitData);
    onSubmit(submitData);
  };

  const getCurrentSubtipoInfo = () => {
    return recargoSubtipos.find(s => s.value === formData.subtipo);
  };

  const currentSubtipoInfo = getCurrentSubtipoInfo();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Recargo</h3>
      </div>

      {/* ✅ MEJORADO: Estado de cálculo más claro */}
      {isLoading && (
        <div className="flex items-center gap-2 bg-blue-50 p-3 rounded text-sm text-blue-700">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Calculando con valores Aleluya...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-50 p-3 rounded text-sm text-red-700">
          <span>⚠️ Error en cálculo: {error} (usando fallback local)</span>
        </div>
      )}

      {/* ✅ ACTUALIZADO: Información de normativa con factores totales */}
      {factorInfo && (
        <div className="flex items-start gap-2 bg-blue-50 p-3 rounded text-sm text-blue-700">
          <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium">Factor total aplicado: {factorInfo.porcentajeDisplay}</div>
            <div className="text-xs">{factorInfo.normativaAplicable}</div>
            {periodoFecha && (
              <div className="text-xs mt-1">
                Período: {periodoFecha.toLocaleDateString('es-CO')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ✅ MANTENER: Información de jornada legal usada */}
      {jornadaInfo && (
        <div className="flex items-center gap-2 bg-green-50 p-3 rounded text-sm text-green-700">
          <Info className="h-4 w-4" />
          <span>
            Jornada legal: {jornadaInfo.horasSemanales}h semanales = {jornadaInfo.divisorHorario}h mensuales
            {periodoFecha && ` (vigente desde ${periodoFecha.toLocaleDateString()})`}
          </span>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Tipo de Recargo</Label>
          <Select
            value={formData.subtipo}
            onValueChange={(value) => handleInputChange('subtipo', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {recargoSubtipos.map((subtipo) => (
                <SelectItem key={subtipo.value} value={subtipo.value}>
                  <div>
                    <div className="font-medium">{subtipo.label}</div>
                    <div className="text-xs text-gray-500">{subtipo.description}</div>
                    {subtipo.normativa && (
                      <div className="text-xs text-blue-600 mt-1">{subtipo.normativa}</div>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {currentSubtipoInfo && (
            <div className="text-sm text-blue-600">
              <strong>Horario:</strong> {currentSubtipoInfo.description}
              {currentSubtipoInfo.normativa && (
                <div className="text-xs text-gray-600 mt-1">
                  {currentSubtipoInfo.normativa}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Cantidad de Horas *</Label>
          <Input
            type="number"
            min="0"
            max="8"
            step="0.5"
            value={formData.horas}
            onChange={(e) => handleInputChange('horas', e.target.value)}
            placeholder="0"
          />
          <div className="text-xs text-gray-500">
            Máximo 8 horas por jornada
          </div>
        </div>

        {formData.valor > 0 && !isLoading && (
          <div className="flex items-center justify-between bg-green-50 p-3 rounded">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">
                Valor calculado automáticamente con Aleluya:
              </span>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {formatCurrency(formData.valor)}
            </Badge>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Valor *</Label>
          </div>

          <Input
            type="number"
            min="0"
            step="1000"
            value={formData.valor}
            onChange={(e) => handleInputChange('valor', parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="text-lg font-medium"
          />
        </div>

        <div className="space-y-2">
          <Label>Observaciones</Label>
          <Textarea
            value={formData.observacion}
            onChange={(e) => handleInputChange('observacion', e.target.value)}
            placeholder="Turno, horario específico, etc..."
            rows={3}
          />
        </div>

        {formData.valor > 0 && (
          <div className="p-3 bg-gray-50 rounded text-center">
            <Badge variant="default" className="text-sm px-3 py-1">
              +{formatCurrency(formData.valor)}
            </Badge>
            <div className="text-xs text-gray-500 mt-1">
              {formData.horas} horas de recargo {formData.subtipo}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!formData.horas || formData.valor <= 0 || isLoading}
        >
          {isLoading ? 'Calculando...' : 'Guardar Recargo'}
        </Button>
      </div>
    </div>
  );
};
