
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, ArrowLeft, Download } from 'lucide-react';
import { ImportStep, ImportedRow, ColumnMapping } from '../ImportEmployeesDrawer';

interface ValidationPreviewStepProps {
  data: any;
  onNext: (step: ImportStep) => void;
  onBack: () => void;
}

interface ValidationResult {
  row: ImportedRow;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const ValidationPreviewStep = ({ data, onNext, onBack }: ValidationPreviewStepProps) => {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [validRows, setValidRows] = useState<ImportedRow[]>([]);
  const [invalidRows, setInvalidRows] = useState<ImportedRow[]>([]);

  useEffect(() => {
    validateRows();
  }, [data]);

  const validateRows = () => {
    const results: ValidationResult[] = [];
    const valid: ImportedRow[] = [];
    const invalid: ImportedRow[] = [];

    data.rows.forEach((row: ImportedRow) => {
      const validation = validateRow(row, data.mappings);
      results.push(validation);

      if (validation.isValid) {
        // Transformar la fila para que coincida con el formato esperado
        const transformedRow = transformRowData(row, data.mappings);
        valid.push(transformedRow);
      } else {
        invalid.push(row);
      }
    });

    setValidationResults(results);
    setValidRows(valid);
    setInvalidRows(invalid);
  };

  const validateRow = (row: ImportedRow, mappings: ColumnMapping[]): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar campos obligatorios
    const requiredMappings = mappings.filter(m => m.isRequired && m.targetField);
    
    requiredMappings.forEach(mapping => {
      const value = row[mapping.sourceColumn];
      if (!value || value.toString().trim() === '') {
        errors.push(`${mapping.targetField}: Campo obligatorio vacío`);
      }
    });

    // Validaciones específicas por campo
    mappings.forEach(mapping => {
      const value = row[mapping.sourceColumn];
      if (!value || value.toString().trim() === '') return;

      switch (mapping.targetField) {
        case 'cedula':
          if (!/^\d{6,12}$/.test(value.toString().replace(/\D/g, ''))) {
            errors.push('Documento: Debe contener entre 6 y 12 dígitos');
          }
          break;
          
        case 'email':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.toString())) {
            warnings.push('Email: Formato inválido');
          }
          break;
          
        case 'salarioBase':
          const salary = parseFloat(value.toString().replace(/[^\d.]/g, ''));
          if (isNaN(salary) || salary <= 0) {
            errors.push('Salario: Debe ser un número mayor a 0');
          }
          break;
          
        case 'fechaIngreso':
          const date = parseDate(value.toString());
          if (!date || isNaN(date.getTime())) {
            errors.push('Fecha de ingreso: Formato inválido');
          }
          break;
          
        case 'tipoContrato':
          const validContracts = ['indefinido', 'fijo', 'obra', 'aprendizaje'];
          if (!validContracts.includes(value.toString().toLowerCase())) {
            warnings.push('Tipo contrato: Se usará "indefinido" por defecto');
          }
          break;
      }
    });

    return {
      row,
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  const parseDate = (dateStr: string): Date | null => {
    // Intentar varios formatos de fecha
    const formats = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
      /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
    ];

    for (const format of formats) {
      if (format.test(dateStr)) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    return null;
  };

  const transformRowData = (row: ImportedRow, mappings: ColumnMapping[]): ImportedRow => {
    const transformed: ImportedRow = {};

    mappings.forEach(mapping => {
      if (mapping.targetField && row[mapping.sourceColumn]) {
        let value = row[mapping.sourceColumn];

        // Transformaciones específicas por campo
        switch (mapping.targetField) {
          case 'salarioBase':
            transformed[mapping.targetField] = parseFloat(value.toString().replace(/[^\d.]/g, '')) || 0;
            break;
            
          case 'fechaIngreso':
            const date = parseDate(value.toString());
            transformed[mapping.targetField] = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            break;
            
          case 'tipoContrato':
            const validContracts = ['indefinido', 'fijo', 'obra', 'aprendizaje'];
            transformed[mapping.targetField] = validContracts.includes(value.toString().toLowerCase()) 
              ? value.toString().toLowerCase() 
              : 'indefinido';
            break;
            
          default:
            transformed[mapping.targetField] = value.toString().trim();
        }
      }
    });

    // Campos por defecto
    if (!transformed.estado) {
      transformed.estado = 'activo';
    }
    if (!transformed.estadoAfiliacion) {
      transformed.estadoAfiliacion = 'pendiente';
    }

    return transformed;
  };

  const downloadErrorReport = () => {
    const errorData = validationResults
      .filter(result => !result.isValid)
      .map(result => ({
        Fila: result.row._rowIndex,
        Errores: result.errors.join('; '),
        Advertencias: result.warnings.join('; ')
      }));

    const csv = [
      ['Fila', 'Errores', 'Advertencias'],
      ...errorData.map(row => [row.Fila, row.Errores, row.Advertencias])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'errores_importacion.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleContinue = () => {
    onNext({
      step: 'confirmation',
      data: {
        ...data,
        validRows,
        invalidRows,
        errors: validationResults.filter(r => !r.isValid).flatMap(r => r.errors)
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Validación de datos
        </h3>
        <p className="text-gray-600">
          Revisión de los datos antes de la importación
        </p>
      </div>

      {/* Resumen de validación */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center p-4">
            <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <div className="text-2xl font-bold text-green-600">{validRows.length}</div>
              <div className="text-sm text-gray-600">Filas válidas</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <XCircle className="h-8 w-8 text-red-500 mr-3" />
            <div>
              <div className="text-2xl font-bold text-red-600">{invalidRows.length}</div>
              <div className="text-sm text-gray-600">Filas con errores</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <AlertTriangle className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <div className="text-2xl font-bold text-blue-600">{data.rows.length}</div>
              <div className="text-sm text-gray-600">Total de filas</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vista previa de las primeras filas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Vista previa (primeras 5 filas)</CardTitle>
            {invalidRows.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={downloadErrorReport}
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar errores
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estado</TableHead>
                  {data.mappings
                    .filter((m: ColumnMapping) => m.targetField)
                    .slice(0, 4)
                    .map((mapping: ColumnMapping) => (
                      <TableHead key={mapping.targetField}>
                        {mapping.targetField}
                      </TableHead>
                    ))}
                  <TableHead>Errores/Advertencias</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validationResults.slice(0, 5).map((result, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {result.isValid ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Válido
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Error
                        </Badge>
                      )}
                    </TableCell>
                    {data.mappings
                      .filter((m: ColumnMapping) => m.targetField)
                      .slice(0, 4)
                      .map((mapping: ColumnMapping) => (
                        <TableCell key={mapping.targetField} className="max-w-32 truncate">
                          {result.row[mapping.sourceColumn] || '-'}
                        </TableCell>
                      ))}
                    <TableCell className="max-w-48">
                      {result.errors.length > 0 && (
                        <div className="text-red-600 text-xs">
                          {result.errors.slice(0, 2).join('; ')}
                          {result.errors.length > 2 && '...'}
                        </div>
                      )}
                      {result.warnings.length > 0 && (
                        <div className="text-yellow-600 text-xs">
                          {result.warnings.slice(0, 1).join('; ')}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <Button 
          onClick={handleContinue}
          disabled={validRows.length === 0}
        >
          {validRows.length > 0 ? `Importar ${validRows.length} empleados` : 'No hay datos válidos'}
        </Button>
      </div>
    </div>
  );
};
