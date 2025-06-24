
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { ImportStep, ColumnMapping } from '../ImportEmployeesDrawer';

const EMPLOYEE_FIELDS = [
  { value: 'nombre', label: 'Nombre', required: true },
  { value: 'apellido', label: 'Apellido', required: false },
  { value: 'tipoDocumento', label: 'Tipo de documento', required: false },
  { value: 'cedula', label: 'Número de documento', required: true },
  { value: 'email', label: 'Correo electrónico', required: false },
  { value: 'telefono', label: 'Teléfono', required: false },
  { value: 'cargo', label: 'Cargo', required: true },
  { value: 'salarioBase', label: 'Salario base', required: true },
  { value: 'fechaIngreso', label: 'Fecha de ingreso', required: true },
  { value: 'tipoContrato', label: 'Tipo de contrato', required: true },
  { value: 'periodicidad', label: 'Periodicidad', required: false },
  { value: 'eps', label: 'EPS', required: false },
  { value: 'afp', label: 'AFP/Fondo de pensiones', required: false },
  { value: 'arl', label: 'ARL', required: false },
  { value: 'cajaCompensacion', label: 'Caja de compensación', required: false },
  { value: 'estado', label: 'Estado', required: false },
  { value: 'centrosocial', label: 'Centro social', required: false },
];

interface ColumnMappingStepProps {
  data: any;
  onNext: (step: ImportStep) => void;
  onBack: () => void;
}

// Funciones auxiliares movidas fuera del componente
const suggestMapping = (columnName: string): string => {
  const normalized = columnName.toLowerCase().trim();
  
  // Mapeo inteligente basado en palabras clave
  if (normalized.includes('nombre') && !normalized.includes('apellido')) return 'nombre';
  if (normalized.includes('apellido')) return 'apellido';
  if (normalized.includes('tipo') && (normalized.includes('documento') || normalized.includes('identificacion'))) return 'tipoDocumento';
  if (normalized.includes('cedula') || normalized.includes('documento') || normalized.includes('identificacion') || normalized.includes('numero')) return 'cedula';
  if (normalized.includes('email') || normalized.includes('correo')) return 'email';
  if (normalized.includes('telefono') || normalized.includes('celular') || normalized.includes('movil')) return 'telefono';
  if (normalized.includes('cargo') || normalized.includes('puesto')) return 'cargo';
  if (normalized.includes('salario') || normalized.includes('sueldo')) return 'salarioBase';
  if (normalized.includes('fecha') && (normalized.includes('ingreso') || normalized.includes('entrada'))) return 'fechaIngreso';
  if (normalized.includes('contrato') || normalized.includes('tipo')) return 'tipoContrato';
  if (normalized.includes('periodicidad') || normalized.includes('periode')) return 'periodicidad';
  if (normalized.includes('eps')) return 'eps';
  if (normalized.includes('afp') || normalized.includes('pension')) return 'afp';
  if (normalized.includes('arl')) return 'arl';
  if (normalized.includes('caja')) return 'cajaCompensacion';
  if (normalized.includes('estado')) return 'estado';
  if (normalized.includes('centro') || normalized.includes('sede')) return 'centrosocial';
  
  return 'sin_mapear'; // Default value for unmapped columns
};

const isRequiredField = (fieldValue: string): boolean => {
  const field = EMPLOYEE_FIELDS.find(f => f.value === fieldValue);
  return field?.required || false;
};

export const ColumnMappingStep = ({ data, onNext, onBack }: ColumnMappingStepProps) => {
  const [mappings, setMappings] = useState<ColumnMapping[]>(() => {
    if (!data?.columns) return [];
    
    return data.columns.map((column: string) => {
      const targetField = suggestMapping(column);
      return {
        sourceColumn: column,
        targetField,
        isRequired: isRequiredField(targetField),
        validation: 'valid' as const
      };
    });
  });

  const handleMappingChange = (sourceColumn: string, targetField: string) => {
    setMappings(prev => prev.map(mapping => 
      mapping.sourceColumn === sourceColumn 
        ? { 
            ...mapping, 
            targetField,
            isRequired: isRequiredField(targetField),
            validation: targetField === 'sin_mapear' ? 'warning' as const : 'valid' as const
          }
        : mapping
    ));
  };

  const getValidationIcon = (validation: string) => {
    switch (validation) {
      case 'valid': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return null;
    }
  };

  const handleNext = () => {
    // Filtrar solo los mapeos que no son "sin_mapear"
    const validMappings = mappings.filter(m => m.targetField !== 'sin_mapear');
    
    onNext({
      step: 'validation',
      data: {
        ...data,
        mappings: validMappings
      }
    });
  };

  const requiredMappings = mappings.filter(m => m.isRequired && m.targetField !== 'sin_mapear');
  const hasRequiredFields = requiredMappings.length > 0;

  if (!data?.columns) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No se pudieron detectar columnas en el archivo.</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Mapear columnas del archivo
        </h3>
        <p className="text-gray-600">
          Asocia cada columna de tu archivo con los campos del sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Columnas detectadas: {data.columns.length}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mappings.map((mapping) => (
              <div key={mapping.sourceColumn} className="flex items-center space-x-4 p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-sm">{mapping.sourceColumn}</div>
                  <div className="text-xs text-gray-500">Columna del archivo</div>
                </div>
                
                <div className="flex-1">
                  <Select
                    value={mapping.targetField}
                    onValueChange={(value) => handleMappingChange(mapping.sourceColumn, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar campo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sin_mapear">No mapear</SelectItem>
                      {EMPLOYEE_FIELDS.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  {mapping.isRequired && mapping.targetField !== 'sin_mapear' && (
                    <Badge variant="destructive" className="text-xs">Requerido</Badge>
                  )}
                  {getValidationIcon(mapping.validation)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Vista previa del mapeo</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Campos mapeados:</span>
            <span className="ml-2 text-blue-600">
              {mappings.filter(m => m.targetField !== 'sin_mapear').length}
            </span>
          </div>
          <div>
            <span className="font-medium">Campos requeridos:</span>
            <span className="ml-2 text-green-600">
              {requiredMappings.length}
            </span>
          </div>
        </div>
        {!hasRequiredFields && (
          <div className="mt-2 text-yellow-600 text-sm">
            ⚠️ Considera mapear al menos los campos básicos como Nombre y Número de documento
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <Button 
          onClick={handleNext}
          disabled={mappings.filter(m => m.targetField !== 'sin_mapear').length === 0}
        >
          Continuar a validación
        </Button>
      </div>
    </div>
  );
};
