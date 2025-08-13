
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';
import { NovedadImportStep, NovedadColumnMapping } from './ImportNovedadesDrawer';

interface NovedadesMappingStepProps {
  data: {
    file?: File;
    columns?: string[];
    rows?: any[];
  };
  onNext: (step: NovedadImportStep) => void;
  onBack: () => void;
}

const AVAILABLE_FIELDS = [
  { key: 'cedula', label: 'Cédula del empleado', required: true },
  { key: 'empleado_id', label: 'ID del empleado', required: false },
  { key: 'periodo', label: 'Período', required: true },
  { key: 'tipo_novedad', label: 'Tipo de novedad', required: true },
  { key: 'subtipo', label: 'Subtipo', required: false },
  { key: 'fecha_inicio', label: 'Fecha inicio', required: false },
  { key: 'fecha_fin', label: 'Fecha fin', required: false },
  { key: 'dias', label: 'Días', required: false },
  { key: 'horas', label: 'Horas', required: false },
  { key: 'valor', label: 'Valor', required: false },
  { key: 'observacion', label: 'Observación', required: false },
  { key: 'constitutivo_salario', label: 'Constitutivo de salario', required: false },
];

export const NovedadesMappingStep = ({
  data,
  onNext,
  onBack
}: NovedadesMappingStepProps) => {
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string[]>([]);

  // Auto-mapear columnas que coincidan exactamente
  useEffect(() => {
    if (data.columns) {
      const autoMappings: Record<string, string> = {};
      
      data.columns.forEach(column => {
        const normalizedColumn = column.toLowerCase().trim();
        const field = AVAILABLE_FIELDS.find(f => 
          f.key === normalizedColumn || 
          f.label.toLowerCase().includes(normalizedColumn) ||
          normalizedColumn.includes(f.key)
        );
        
        if (field) {
          autoMappings[column] = field.key;
        }
      });
      
      setMappings(autoMappings);
    }
  }, [data.columns]);

  const validateMappings = () => {
    const newErrors: string[] = [];
    const mappedFields = Object.values(mappings);
    
    // Verificar campos requeridos
    const requiredFields = AVAILABLE_FIELDS.filter(f => f.required);
    requiredFields.forEach(field => {
      if (!mappedFields.includes(field.key)) {
        newErrors.push(`El campo "${field.label}" es requerido`);
      }
    });

    // Verificar que cedula o empleado_id estén mapeados
    if (!mappedFields.includes('cedula') && !mappedFields.includes('empleado_id')) {
      newErrors.push('Debe mapear al menos "Cédula" o "ID del empleado"');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleNext = () => {
    if (validateMappings()) {
      const columnMappings: NovedadColumnMapping[] = Object.entries(mappings).map(([sourceColumn, targetField]) => {
        const field = AVAILABLE_FIELDS.find(f => f.key === targetField);
        return {
          sourceColumn,
          targetField,
          isRequired: field?.required || false
        };
      });

      onNext({
        step: 'validation',
        data: {
          ...data,
          mappings: columnMappings,
          mapping: mappings
        }
      });
    }
  };

  const handleMappingChange = (sourceColumn: string, targetField: string) => {
    setMappings(prev => {
      const newMappings = { ...prev };
      
      // Si ya existe este targetField en otro mapeo, removerlo
      Object.keys(newMappings).forEach(key => {
        if (newMappings[key] === targetField && key !== sourceColumn) {
          delete newMappings[key];
        }
      });
      
      if (targetField === 'none') {
        delete newMappings[sourceColumn];
      } else {
        newMappings[sourceColumn] = targetField;
      }
      
      return newMappings;
    });
  };

  const getUsedFields = () => {
    return Object.values(mappings);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mapear columnas del archivo</CardTitle>
          <p className="text-sm text-gray-600">
            Asigna cada columna de tu archivo a los campos correspondientes del sistema
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.columns?.map((column, index) => {
              const mappedField = mappings[column];
              const field = AVAILABLE_FIELDS.find(f => f.key === mappedField);
              
              return (
                <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex-1">
                    <Label className="font-medium">{column}</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Ejemplo: {data.rows?.[0]?.[column] || 'Sin datos'}
                    </p>
                  </div>
                  
                  <div className="flex-1">
                    <Select
                      value={mappedField || 'none'}
                      onValueChange={(value) => handleMappingChange(column, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar campo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No mapear</SelectItem>
                        {AVAILABLE_FIELDS.map(field => {
                          const isUsed = getUsedFields().includes(field.key) && mappedField !== field.key;
                          return (
                            <SelectItem 
                              key={field.key} 
                              value={field.key}
                              disabled={isUsed}
                            >
                              <div className="flex items-center gap-2">
                                {field.label}
                                {field.required && <Badge variant="secondary" className="text-xs">Requerido</Badge>}
                                {isUsed && <Badge variant="outline" className="text-xs">En uso</Badge>}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {field?.required && (
                    <Badge variant="secondary" className="text-xs">
                      Requerido
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800 mb-2">Errores de mapeo:</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        
        <Button onClick={handleNext} disabled={errors.length > 0}>
          Continuar
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};
