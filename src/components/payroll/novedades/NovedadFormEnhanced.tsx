
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calculator, Loader2 } from 'lucide-react';
import { NovedadType, NOVEDAD_CATEGORIES, NovedadFormData } from '@/types/novedades-enhanced';
import { useNovedadBackendCalculation } from '@/hooks/useNovedadBackendCalculation';
import { formatCurrency } from '@/lib/utils';

interface NovedadFormEnhancedProps {
  onSubmit: (data: NovedadFormData & { valor: number }) => void;
  onCancel: () => void;
  empleadoSalario: number;
  fechaPeriodo?: string;
  isSubmitting?: boolean;
}

export const NovedadFormEnhanced: React.FC<NovedadFormEnhancedProps> = ({
  onSubmit,
  onCancel,
  empleadoSalario,
  fechaPeriodo,
  isSubmitting = false
}) => {
  const [formData, setFormData] = useState<NovedadFormData>({
    tipo_novedad: 'bonificacion',
    observacion: ''
  });
  const [calculatedValue, setCalculatedValue] = useState<number>(0);
  const [showCalculation, setShowCalculation] = useState(false);

  const { calculateNovedadDebounced, isLoading } = useNovedadBackendCalculation();

  // ✅ CORRECCIÓN: Obtener configuración de la novedad seleccionada
  const getCurrentNovedadConfig = () => {
    for (const category of Object.values(NOVEDAD_CATEGORIES)) {
      if (category.types[formData.tipo_novedad]) {
        return category.types[formData.tipo_novedad];
      }
    }
    return null;
  };

  const config = getCurrentNovedadConfig();

  // ✅ CORRECCIÓN: Auto-cálculo mejorado con logging - DESHABILITADO PARA INCAPACIDADES
  useEffect(() => {
    // 🚀 SIMPLE FIX: Skip auto-calculation for incapacidades
    if (formData.tipo_novedad === 'incapacidad') {
      console.log('🚀 SIMPLE FIX: Skipping auto-calculation for incapacidad');
      return;
    }

    if (!config?.auto_calculo || !empleadoSalario) {
      return;
    }

    const shouldCalculate = 
      (config.requiere_horas && formData.horas && formData.horas > 0) ||
      (config.requiere_dias && formData.dias && formData.dias > 0) ||
      (!config.requiere_horas && !config.requiere_dias);

    if (shouldCalculate) {
      console.log('🔄 AUTO-CALCULATING for:', formData.tipo_novedad, {
        subtipo: formData.subtipo,
        horas: formData.horas,
        dias: formData.dias,
        salario: empleadoSalario
      });

      calculateNovedadDebounced(
        {
          tipoNovedad: formData.tipo_novedad,
          subtipo: formData.subtipo,
          salarioBase: empleadoSalario,
          horas: formData.horas,
          dias: formData.dias,
          fechaPeriodo
        },
        (result) => {
          if (result) {
            console.log('✅ AUTO-CALC RESULT:', result.valor);
            setCalculatedValue(result.valor);
            setShowCalculation(true);
            setFormData(prev => ({ ...prev, valor: result.valor }));
          } else {
            console.log('❌ AUTO-CALC FAILED');
            setCalculatedValue(0);
            setShowCalculation(false);
          }
        }
      );
    }
  }, [
    formData.tipo_novedad,
    formData.subtipo,
    formData.horas,
    formData.dias,
    empleadoSalario,
    config,
    calculateNovedadDebounced,
    fechaPeriodo
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalValue = config?.auto_calculo ? calculatedValue : (formData.valor || 0);
    
    console.log('📝 SUBMITTING NOVEDAD:', {
      ...formData,
      valor: finalValue,
      auto_calculo: config?.auto_calculo
    });

    onSubmit({
      ...formData,
      valor: finalValue
    });
  };

  // ✅ CORRECCIÓN: Renderizar subtipos específicos para incapacidades
  const renderSubtipoSelect = () => {
    if (!config?.subtipos || config.subtipos.length === 0) {
      return null;
    }

    // ✅ ESPECIAL: Para incapacidades, mostrar opciones más claras
    if (formData.tipo_novedad === 'incapacidad') {
      return (
        <div className="space-y-2">
          <Label htmlFor="subtipo">Tipo de Incapacidad *</Label>
          <Select
            value={formData.subtipo || 'general'}
            onValueChange={(value) => {
              console.log('🏥 INCAPACIDAD SUBTIPO CHANGED:', value);
              setFormData(prev => ({ ...prev, subtipo: value }));
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar tipo de incapacidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">
                <div>
                  <div className="font-medium">General (EPS)</div>
                  <div className="text-sm text-gray-500">66.67% después de 3 días</div>
                </div>
              </SelectItem>
              <SelectItem value="laboral">
                <div>
                  <div className="font-medium">Laboral (ARL)</div>
                  <div className="text-sm text-gray-500">100% desde el día 1</div>
                </div>
              </SelectItem>
              <SelectItem value="maternidad">
                <div>
                  <div className="font-medium">Maternidad</div>
                  <div className="text-sm text-gray-500">100% durante licencia</div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <Label htmlFor="subtipo">Subtipo</Label>
        <Select
          value={formData.subtipo || ''}
          onValueChange={(value) => setFormData(prev => ({ ...prev, subtipo: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar subtipo" />
          </SelectTrigger>
          <SelectContent>
            {config.subtipos.map((subtipo) => (
              <SelectItem key={subtipo} value={subtipo}>
                {subtipo.charAt(0).toUpperCase() + subtipo.slice(1).replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  // 🚀 SIMPLE FIX: Show notice for incapacidades
  if (formData.tipo_novedad === 'incapacidad') {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <div className="text-yellow-600">ℹ️</div>
            <div>
              <h4 className="font-medium text-yellow-800 mb-1">Funcionalidad Simplificada</h4>
              <p className="text-yellow-700 text-sm">
                Temporalmente, las incapacidades usan un formulario manual simple. 
                Los cálculos automáticos están deshabilitados para mayor estabilidad.
              </p>
            </div>
          </div>
        </div>

        {/* Tipo de Novedad */}
        <div className="space-y-2">
          <Label htmlFor="tipo_novedad">Tipo de Novedad *</Label>
          <Select
            value={formData.tipo_novedad}
            onValueChange={(value: NovedadType) => {
              console.log('🔄 NOVEDAD TYPE CHANGED:', value);
              setFormData(prev => ({ 
                ...prev, 
                tipo_novedad: value,
                subtipo: undefined,
                horas: undefined,
                dias: undefined,
                valor: undefined
              }));
              setCalculatedValue(0);
              setShowCalculation(false);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(NOVEDAD_CATEGORIES).map(([categoryKey, category]) => (
                <div key={categoryKey}>
                  <div className="px-2 py-1 text-sm font-medium text-gray-500 bg-gray-50">
                    {category.label}
                  </div>
                  {Object.entries(category.types).map(([key, type]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span>{type.label}</span>
                        {type.auto_calculo && key !== 'incapacidad' && (
                          <Badge variant="secondary" className="text-xs">
                            <Calculator className="h-3 w-3 mr-1" />
                            Auto
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Manual Form for Incapacidades */}
        {renderSubtipoSelect()}

        {/* Manual Days Input */}
        <div className="space-y-2">
          <Label htmlFor="dias">Días *</Label>
          <Input
            id="dias"
            type="number"
            min="1"
            value={formData.dias || ''}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              dias: e.target.value ? parseInt(e.target.value) : undefined 
            }))}
            placeholder="Número de días"
            required
          />
        </div>

        {/* Manual Value Input */}
        <div className="space-y-2">
          <Label htmlFor="valor">Valor *</Label>
          <Input
            id="valor"
            type="number"
            min="0"
            value={formData.valor || ''}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              valor: e.target.value ? parseFloat(e.target.value) : undefined 
            }))}
            placeholder="Valor en pesos colombianos"
            required
          />
        </div>

        {/* Observación */}
        <div className="space-y-2">
          <Label htmlFor="observacion">Observación</Label>
          <Textarea
            id="observacion"
            value={formData.observacion || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, observacion: e.target.value }))}
            placeholder="Información adicional sobre la novedad"
            rows={3}
          />
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || !formData.dias || !formData.valor}
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              'Crear Novedad'
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Tipo de Novedad */}
      <div className="space-y-2">
        <Label htmlFor="tipo_novedad">Tipo de Novedad *</Label>
        <Select
          value={formData.tipo_novedad}
          onValueChange={(value: NovedadType) => {
            console.log('🔄 NOVEDAD TYPE CHANGED:', value);
            setFormData(prev => ({ 
              ...prev, 
              tipo_novedad: value,
              subtipo: undefined,
              horas: undefined,
              dias: undefined,
              valor: undefined
            }));
            setCalculatedValue(0);
            setShowCalculation(false);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(NOVEDAD_CATEGORIES).map(([categoryKey, category]) => (
              <div key={categoryKey}>
                <div className="px-2 py-1 text-sm font-medium text-gray-500 bg-gray-50">
                  {category.label}
                </div>
                {Object.entries(category.types).map(([key, type]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <span>{type.label}</span>
                      {type.auto_calculo && (
                        <Badge variant="secondary" className="text-xs">
                          <Calculator className="h-3 w-3 mr-1" />
                          Auto
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subtipo */}
      {renderSubtipoSelect()}

      {/* Horas (si es requerido) */}
      {config?.requiere_horas && (
        <div className="space-y-2">
          <Label htmlFor="horas">Horas *</Label>
          <Input
            id="horas"
            type="number"
            step="0.1"
            min="0"
            value={formData.horas || ''}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              horas: e.target.value ? parseFloat(e.target.value) : undefined 
            }))}
            placeholder="Número de horas"
            required
          />
        </div>
      )}

      {/* Días (si es requerido) */}
      {config?.requiere_dias && (
        <div className="space-y-2">
          <Label htmlFor="dias">Días *</Label>
          <Input
            id="dias"
            type="number"
            min="1"
            value={formData.dias || ''}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              dias: e.target.value ? parseInt(e.target.value) : undefined 
            }))}
            placeholder="Número de días"
            required
          />
        </div>
      )}

      {/* Valor calculado o manual */}
      {config?.auto_calculo ? (
        showCalculation && (
          <div className="space-y-2">
            <Label>Valor Calculado</Label>
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-green-600" />
              ) : (
                <Calculator className="h-4 w-4 text-green-600" />
              )}
              <span className="font-medium text-green-800">
                {formatCurrency(calculatedValue)}
              </span>
            </div>
          </div>
        )
      ) : (
        <div className="space-y-2">
          <Label htmlFor="valor">Valor *</Label>
          <Input
            id="valor"
            type="number"
            min="0"
            value={formData.valor || ''}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              valor: e.target.value ? parseFloat(e.target.value) : undefined 
            }))}
            placeholder="Valor en pesos colombianos"
            required
          />
        </div>
      )}

      {/* Observación */}
      <div className="space-y-2">
        <Label htmlFor="observacion">Observación</Label>
        <Textarea
          id="observacion"
          value={formData.observacion || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, observacion: e.target.value }))}
          placeholder="Información adicional sobre la novedad"
          rows={3}
        />
      </div>

      {/* Botones */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting || (config?.auto_calculo && !showCalculation)}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Guardando...
            </>
          ) : (
            'Crear Novedad'
          )}
        </Button>
      </div>
    </form>
  );
};
