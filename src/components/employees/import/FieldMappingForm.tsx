
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';
import { EmployeeFieldMappingConfig } from './EmployeeFieldMapping';

interface FieldMappingFormProps {
  requiredFields: EmployeeFieldMappingConfig[];
  optionalFields: EmployeeFieldMappingConfig[];
  columns: string[];
  mappings: Record<string, string>;
  usedColumns: string[];
  onMappingChange: (targetField: string, sourceColumn: string) => void;
}

export const FieldMappingForm = ({
  requiredFields,
  optionalFields,
  columns,
  mappings,
  usedColumns,
  onMappingChange
}: FieldMappingFormProps) => {
  return (
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
                onValueChange={(value) => onMappingChange(field.key, value)}
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
                      disabled={usedColumns.includes(column) && mappings[field.key] !== column}
                    >
                      {column}
                      {usedColumns.includes(column) && mappings[field.key] !== column && (
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
                onValueChange={(value) => onMappingChange(field.key, value)}
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
                      disabled={usedColumns.includes(column) && mappings[field.key] !== column}
                    >
                      {column}
                      {usedColumns.includes(column) && mappings[field.key] !== column && (
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
  );
};
