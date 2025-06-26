
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ArrowRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { ImportStep } from '../ImportEmployeesDrawer';
import { EMPLOYEE_FIELD_MAPPINGS, getRequiredFields, getOptionalFields } from './EmployeeFieldMapping';

interface ColumnMappingStepProps {
  data: {
    file?: File;
    columns?: string[];
    rows?: any[];
  };
  onNext: (step: ImportStep) => void;
  onBack: () => void;
}

export const ColumnMappingStep = ({ data, onNext, onBack }: ColumnMappingStepProps) => {
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const { columns = [], rows = [] } = data;
  const requiredFields = getRequiredFields();
  const optionalFields = getOptionalFields();

  const handleMappingChange = (targetField: string, sourceColumn: string) => {
    setMappings(prev => {
      const newMappings = { ...prev };
      
      // Remove any existing mapping to this source column
      Object.keys(newMappings).forEach(key => {
        if (newMappings[key] === sourceColumn) {
          delete newMappings[key];
        }
      });
      
      // Set new mapping
      if (sourceColumn && sourceColumn !== 'none') {
        newMappings[targetField] = sourceColumn;
      } else {
        delete newMappings[targetField];
      }
      
      return newMappings;
    });

    // Clear validation errors when mapping changes
    setValidationErrors([]);
  };

  const validateMappings = () => {
    const errors: string[] = [];
    
    // Check required fields
    requiredFields.forEach(field => {
      if (!mappings[field.key]) {
        errors.push(`El campo requerido "${field.label}" debe estar mapeado`);
      }
    });

    // Check for duplicate mappings
    const usedColumns = Object.values(mappings);
    const duplicates = usedColumns.filter((column, index) => usedColumns.indexOf(column) !== index);
    if (duplicates.length > 0) {
      errors.push('No se pueden mapear múltiples campos a la misma columna');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleNext = () => {
    if (!validateMappings()) {
      return;
    }

    // Transform data with mappings
    const transformedRows = rows.map(row => {
      const transformedRow: any = {};
      
      Object.keys(mappings).forEach(targetField => {
        const sourceColumn = mappings[targetField];
        if (sourceColumn && row[sourceColumn] !== undefined) {
          transformedRow[targetField] = row[sourceColumn];
        }
      });
      
      return transformedRow;
    });

    onNext({
      step: 'validation',
      data: {
        ...data,
        mappings: Object.keys(mappings).map(targetField => ({
          sourceColumn: mappings[targetField],
          targetField,
          isRequired: requiredFields.some(f => f.key === targetField),
          validation: 'valid' as const,
        })),
        validRows: transformedRows,
        invalidRows: [],
        mapping: mappings,
        totalRows: rows.length
      }
    });
  };

  const getUsedColumns = () => {
    return Object.values(mappings);
  };

  const getMappedFieldsCount = () => {
    return Object.keys(mappings).length;
  };

  const getRequiredMappedCount = () => {
    return requiredFields.filter(field => mappings[field.key]).length;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Mapear Columnas
        </h3>
        <p className="text-gray-600">
          Asocia las columnas de tu archivo con los campos del sistema
        </p>
      </div>

      {/* Progress indicators */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{columns.length}</div>
          <div className="text-sm text-blue-600">Columnas detectadas</div>
        </div>
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {getRequiredMappedCount()}/{requiredFields.length}
          </div>
          <div className="text-sm text-green-600">Campos requeridos</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-600">{getMappedFieldsCount()}</div>
          <div className="text-sm text-gray-600">Total mapeados</div>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {validationErrors.map((error, index) => (
                <div key={index}>• {error}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Required Fields */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="h-5 w-5 text-red-500" />
              Campos Requeridos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {requiredFields.map(field => (
              <div key={field.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-900">
                    {field.label}
                    <Badge variant="destructive" className="ml-2 text-xs">
                      Requerido
                    </Badge>
                  </label>
                </div>
                {field.description && (
                  <p className="text-xs text-gray-500">{field.description}</p>
                )}
                <Select
                  value={mappings[field.key] || 'none'}
                  onValueChange={(value) => handleMappingChange(field.key, value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar columna..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No mapear</SelectItem>
                    {columns.map(column => (
                      <SelectItem 
                        key={column} 
                        value={column}
                        disabled={getUsedColumns().includes(column) && mappings[field.key] !== column}
                      >
                        {column}
                        {getUsedColumns().includes(column) && mappings[field.key] !== column && (
                          <span className="text-xs text-gray-400 ml-2">(Ya usado)</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Optional Fields */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Campos Opcionales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-96 overflow-y-auto">
            {optionalFields.map(field => (
              <div key={field.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    {field.label}
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Opcional
                    </Badge>
                  </label>
                </div>
                {field.description && (
                  <p className="text-xs text-gray-500">{field.description}</p>
                )}
                <Select
                  value={mappings[field.key] || 'none'}
                  onValueChange={(value) => handleMappingChange(field.key, value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar columna..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No mapear</SelectItem>
                    {columns.map(column => (
                      <SelectItem 
                        key={column} 
                        value={column}
                        disabled={getUsedColumns().includes(column) && mappings[field.key] !== column}
                      >
                        {column}
                        {getUsedColumns().includes(column) && mappings[field.key] !== column && (
                          <span className="text-xs text-gray-400 ml-2">(Ya usado)</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Sample preview */}
      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vista Previa de Datos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    {columns.slice(0, 6).map(column => (
                      <th key={column} className="border border-gray-200 px-3 py-2 text-left text-sm font-medium">
                        {column}
                      </th>
                    ))}
                    {columns.length > 6 && (
                      <th className="border border-gray-200 px-3 py-2 text-center text-sm font-medium">
                        +{columns.length - 6} más...
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 3).map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      {columns.slice(0, 6).map(column => (
                        <td key={column} className="border border-gray-200 px-3 py-2 text-sm">
                          {String(row[column] || '').slice(0, 30)}
                          {String(row[column] || '').length > 30 && '...'}
                        </td>
                      ))}
                      {columns.length > 6 && (
                        <td className="border border-gray-200 px-3 py-2 text-center text-sm text-gray-400">
                          ...
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 3 && (
              <p className="text-sm text-gray-500 mt-2">
                Mostrando 3 de {rows.length} filas
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>
        <Button 
          onClick={handleNext}
          disabled={getRequiredMappedCount() < requiredFields.length}
        >
          Continuar
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};
