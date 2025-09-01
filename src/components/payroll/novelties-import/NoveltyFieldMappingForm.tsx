import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NoveltyFieldMappingConfig } from './NoveltyFieldMapping';
import { Check } from 'lucide-react';

interface NoveltyFieldMappingFormProps {
  requiredFields: NoveltyFieldMappingConfig[];
  optionalFields: NoveltyFieldMappingConfig[];
  columns: string[];
  mappings: Record<string, string>;
  usedColumns: string[];
  onMappingChange: (targetField: string, sourceColumn: string) => void;
}

export const NoveltyFieldMappingForm = ({
  requiredFields,
  optionalFields,
  columns,
  mappings,
  usedColumns,
  onMappingChange,
}: NoveltyFieldMappingFormProps) => {
  return (
    <div className="space-y-6">
      {/* Required Fields Section */}
      <div>
        <h4 className="font-medium mb-3 flex items-center">
          <span>Campos Requeridos</span>
          <Badge variant="destructive" className="ml-2">Obligatorio</Badge>
        </h4>
        <div className="space-y-3">
          {requiredFields.map((field) => (
            <div key={field.key} className="flex items-center space-x-4 p-3 border rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h5 className="font-medium">{field.label}</h5>
                  {mappings[field.key] && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </div>
                {field.description && (
                  <p className="text-sm text-gray-500 mt-1">{field.description}</p>
                )}
              </div>
              
              <div className="w-64">
                <Select
                  value={mappings[field.key] || ''}
                  onValueChange={(value) => onMappingChange(field.key, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar columna..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin mapear</SelectItem>
                    {columns.map((column) => {
                      const isUsed = usedColumns.includes(column) && mappings[field.key] !== column;
                      return (
                        <SelectItem 
                          key={column} 
                          value={column}
                          disabled={isUsed}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{column}</span>
                            {isUsed && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                En uso
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Optional Fields Section */}
      <div>
        <h4 className="font-medium mb-3 flex items-center">
          <span>Campos Opcionales</span>
          <Badge variant="secondary" className="ml-2">Opcional</Badge>
        </h4>
        <div className="space-y-3">
          {optionalFields.map((field) => (
            <div key={field.key} className="flex items-center space-x-4 p-3 border rounded-lg bg-gray-50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h5 className="font-medium text-gray-700">{field.label}</h5>
                  {mappings[field.key] && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </div>
                {field.description && (
                  <p className="text-sm text-gray-500 mt-1">{field.description}</p>
                )}
              </div>
              
              <div className="w-64">
                <Select
                  value={mappings[field.key] || ''}
                  onValueChange={(value) => onMappingChange(field.key, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar columna..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin mapear</SelectItem>
                    {columns.map((column) => {
                      const isUsed = usedColumns.includes(column) && mappings[field.key] !== column;
                      return (
                        <SelectItem 
                          key={column} 
                          value={column}
                          disabled={isUsed}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{column}</span>
                            {isUsed && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                En uso
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};