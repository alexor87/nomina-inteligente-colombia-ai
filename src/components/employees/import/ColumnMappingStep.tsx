
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ArrowRight, AlertTriangle } from 'lucide-react';
import { ImportStep } from '../ImportEmployeesDrawer';
import { EMPLOYEE_FIELD_MAPPINGS, getRequiredFields, getOptionalFields } from './EmployeeFieldMapping';
import { ColumnMappingProgressIndicators } from './ColumnMappingProgressIndicators';
import { FieldMappingForm } from './FieldMappingForm';
import { DataPreviewTable } from './DataPreviewTable';

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

      <ColumnMappingProgressIndicators
        totalColumns={columns.length}
        requiredMappedCount={getRequiredMappedCount()}
        totalRequiredFields={requiredFields.length}
        totalMappedFields={getMappedFieldsCount()}
      />

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

      <FieldMappingForm
        requiredFields={requiredFields}
        optionalFields={optionalFields}
        columns={columns}
        mappings={mappings}
        usedColumns={getUsedColumns()}
        onMappingChange={handleMappingChange}
      />

      <DataPreviewTable columns={columns} rows={rows} />

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
