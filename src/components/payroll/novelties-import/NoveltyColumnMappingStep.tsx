import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ArrowRight, AlertTriangle } from 'lucide-react';
import { ImportStep } from './NoveltyFileUploadStep';
import { 
  NOVELTY_FIELD_MAPPINGS, 
  getRequiredNoveltyFields, 
  getOptionalNoveltyFields,
  NoveltyFieldMappingConfig 
} from './NoveltyFieldMapping';
import { NoveltyFieldMappingForm } from './NoveltyFieldMappingForm';
import { NoveltyDataPreviewTable } from './NoveltyDataPreviewTable';

interface NoveltyColumnMappingStepProps {
  data: {
    file: File;
    columns: string[];
    rows: any[];
    totalRows?: number;
    mapping?: Record<string, string>;
  };
  onNext: (step: ImportStep) => void;
  onBack: () => void;
}

export const NoveltyColumnMappingStep = ({ data, onNext, onBack }: NoveltyColumnMappingStepProps) => {
  const [mappings, setMappings] = useState<Record<string, string>>(() => {
    // Auto-detect mappings based on column names
    const autoMappings: Record<string, string> = {};
    
    const columnMappings: Record<string, string[]> = {
      'employee_identification': ['identificacion', 'cedula', 'documento', 'empleado', 'employee', 'id_empleado', 'email'],
      'tipo_novedad': ['tipo', 'novedad', 'tipo_novedad', 'concepto', 'type'],
      'valor': ['valor', 'monto', 'amount', 'value', 'importe'],
      'subtipo': ['subtipo', 'subtype', 'categoria', 'subcategoria'],
      'fecha_inicio': ['fecha_inicio', 'inicio', 'start_date', 'fecha_desde', 'desde'],
      'fecha_fin': ['fecha_fin', 'fin', 'end_date', 'fecha_hasta', 'hasta'],
      'dias': ['dias', 'days', 'cantidad_dias', 'num_dias'],
      'horas': ['horas', 'hours', 'cantidad_horas', 'num_horas'],
      'observacion': ['observacion', 'observaciones', 'comentario', 'notes', 'description'],
      'constitutivo_salario': ['constitutivo', 'constitutivo_salario', 'ibc', 'salary_component']
    };

    data.columns.forEach(column => {
      const normalizedColumn = column.toLowerCase().trim();
      
      for (const [fieldKey, patterns] of Object.entries(columnMappings)) {
        if (patterns.some(pattern => normalizedColumn.includes(pattern))) {
          autoMappings[fieldKey] = column;
          break;
        }
      }
    });

    return autoMappings;
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleMappingChange = (targetField: string, sourceColumn: string) => {
    setMappings(prev => {
      // Remove any existing mapping to this source column
      const newMappings = Object.fromEntries(
        Object.entries(prev).filter(([_, value]) => value !== sourceColumn)
      );
      
      // Add the new mapping
      if (sourceColumn) {
        newMappings[targetField] = sourceColumn;
      }
      
      return newMappings;
    });
    
    // Clear validation errors when mappings change
    setValidationErrors([]);
  };

  const validateMappings = (): string[] => {
    const errors: string[] = [];
    const requiredFields = getRequiredNoveltyFields();
    const usedColumns = Object.values(mappings);
    
    // Check required fields
    for (const field of requiredFields) {
      if (!mappings[field.key]) {
        errors.push(`El campo requerido "${field.label}" debe ser mapeado`);
      }
    }
    
    // Check for duplicate column mappings
    const duplicates = usedColumns.filter((column, index) => 
      column && usedColumns.indexOf(column) !== index
    );
    
    if (duplicates.length > 0) {
      errors.push(`Las siguientes columnas están mapeadas múltiples veces: ${duplicates.join(', ')}`);
    }
    
    return errors;
  };

  const handleNext = () => {
    const errors = validateMappings();
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Transform data based on mappings
    const transformedRows = data.rows.map((row, rowIndex) => {
      const transformedRow: Record<string, any> = { _originalIndex: rowIndex };
      
      Object.entries(mappings).forEach(([fieldKey, columnName]) => {
        const columnIndex = data.columns.indexOf(columnName);
        if (columnIndex !== -1) {
          let value = row[columnIndex];
          
          // Basic type conversion
          const field = NOVELTY_FIELD_MAPPINGS.find(f => f.key === fieldKey);
          if (field && value !== null && value !== undefined && value !== '') {
            if (field.type === 'number') {
              value = parseFloat(String(value)) || 0;
            } else if (field.type === 'boolean') {
              value = String(value).toLowerCase() === 'true' || String(value) === '1';
            } else {
              value = String(value).trim();
            }
          }
          
          transformedRow[fieldKey] = value;
        }
      });
      
      return transformedRow;
    });

    console.log('📊 Datos transformados para validación:', {
      totalRows: transformedRows.length,
      mappings,
      sampleRow: transformedRows[0]
    });

    onNext({
      step: 'validation',
      data: {
        ...data,
        rows: transformedRows,
        mapping: mappings
      }
    });
  };

  const getUsedColumns = (): string[] => {
    return Object.values(mappings).filter(Boolean);
  };

  const getMappedFieldsCount = (): number => {
    return Object.keys(mappings).length;
  };

  const getRequiredMappedCount = (): number => {
    const requiredFields = getRequiredNoveltyFields();
    return requiredFields.filter(field => mappings[field.key]).length;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Mapear Columnas</h3>
        <p className="text-gray-600">
          Relaciona las columnas de tu archivo con los campos del sistema
        </p>
      </div>

      {/* Progress indicators */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {getRequiredMappedCount()}/{getRequiredNoveltyFields().length}
          </div>
          <div className="text-sm text-blue-600">Campos Requeridos</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600">
            {getMappedFieldsCount()}
          </div>
          <div className="text-sm text-green-600">Total Mapeados</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-600">
            {data.totalRows || data.rows.length}
          </div>
          <div className="text-sm text-gray-600">Novedades a Importar</div>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <Alert>
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

      <NoveltyFieldMappingForm
        requiredFields={getRequiredNoveltyFields()}
        optionalFields={getOptionalNoveltyFields()}
        columns={data.columns}
        mappings={mappings}
        usedColumns={getUsedColumns()}
        onMappingChange={handleMappingChange}
      />

      <Separator />

      <NoveltyDataPreviewTable
        columns={data.columns}
        rows={data.rows.slice(0, 5)}
        mappings={mappings}
      />

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>
        
        <Button 
          onClick={handleNext}
          disabled={getRequiredMappedCount() < getRequiredNoveltyFields().length}
        >
          Continuar
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};