
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, Download } from 'lucide-react';
import { ImportStep } from '../ImportEmployeesDrawer';

interface ValidationPreviewStepProps {
  data: any;
  onNext: (step: ImportStep) => void;
  onBack: () => void;
}

export const ValidationPreviewStep = ({ data, onNext, onBack }: ValidationPreviewStepProps) => {
  const [validatedRows, setValidatedRows] = useState<any[]>([]);
  const [validRows, setValidRows] = useState<any[]>([]);
  const [invalidRows, setInvalidRows] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    validateData();
  }, []);

  const validateData = () => {
    const { rows, mappings } = data;
    const validated: any[] = [];
    const valid: any[] = [];
    const invalid: any[] = [];
    const errorList: string[] = [];

    rows.forEach((row: any, index: number) => {
      const validatedRow: any = { _rowIndex: index + 2 };
      let hasErrors = false;
      const rowErrors: string[] = [];

      mappings.forEach((mapping: any) => {
        const value = row[mapping.sourceColumn];
        const validation = validateField(mapping.targetField, value, mapping.sourceColumn);
        
        validatedRow[mapping.targetField] = value;
        validatedRow[`${mapping.targetField}_validation`] = validation.status;
        validatedRow[`${mapping.targetField}_error`] = validation.message;

        if (validation.status === 'error') {
          hasErrors = true;
          rowErrors.push(`${mapping.sourceColumn}: ${validation.message}`);
        }
      });

      validatedRow._errors = rowErrors;
      validated.push(validatedRow);

      if (hasErrors) {
        invalid.push(validatedRow);
        errorList.push(`Fila ${validatedRow._rowIndex}: ${rowErrors.join(', ')}`);
      } else {
        valid.push(validatedRow);
      }
    });

    setValidatedRows(validated);
    setValidRows(valid);
    setInvalidRows(invalid);
    setErrors(errorList);
  };

  const validateField = (fieldName: string, value: any, sourceColumn: string) => {
    if (!value || value.toString().trim() === '') {
      const requiredFields = ['nombre', 'cedula', 'cargo', 'salarioBase', 'fechaIngreso', 'tipoContrato'];
      if (requiredFields.includes(fieldName)) {
        return { status: 'error', message: 'Campo requerido' };
      }
      return { status: 'valid', message: '' };
    }

    switch (fieldName) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return { status: 'error', message: 'Formato de email inválido' };
        }
        break;
      
      case 'cedula':
        if (!/^\d+$/.test(value.toString().replace(/\D/g, ''))) {
          return { status: 'error', message: 'Debe contener solo números' };
        }
        break;
      
      case 'salarioBase':
        const salary = parseFloat(value.toString().replace(/[^\d.]/g, ''));
        if (isNaN(salary) || salary <= 0) {
          return { status: 'error', message: 'Debe ser un número válido mayor a 0' };
        }
        break;
      
      case 'fechaIngreso':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return { status: 'error', message: 'Formato de fecha inválido' };
        }
        break;
      
      case 'telefono':
        if (value && !/^\d{7,10}$/.test(value.toString().replace(/\D/g, ''))) {
          return { status: 'warning', message: 'Formato de teléfono puede ser incorrecto' };
        }
        break;
    }

    return { status: 'valid', message: '' };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Válido</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="h-3 w-3 mr-1" />Advertencia</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Error</Badge>;
      default:
        return null;
    }
  };

  const handleNext = () => {
    onNext({
      step: 'confirmation',
      data: {
        ...data,
        validRows,
        invalidRows,
        errors
      }
    });
  };

  const downloadErrorReport = () => {
    const csvContent = [
      'Fila,Error',
      ...errors.map(error => `"${error.replace(/"/g, '""')}"`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'errores_importacion.csv';
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Validación de datos
        </h3>
        <p className="text-gray-600">
          Revisa los datos antes de importar
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{validRows.length}</div>
              <div className="text-sm text-gray-600">Registros válidos</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{invalidRows.length}</div>
              <div className="text-sm text-gray-600">Registros con errores</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{data.rows.length}</div>
              <div className="text-sm text-gray-600">Total registros</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {invalidRows.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="bg-red-50">
            <CardTitle className="text-red-800 flex items-center">
              <XCircle className="h-5 w-5 mr-2" />
              Errores encontrados
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-600 mb-3">
              Se encontraron {invalidRows.length} registros con errores. 
              Puedes continuar e importar solo los registros válidos, o corregir el archivo.
            </p>
            {errors.length > 5 ? (
              <div className="space-y-2">
                <div className="text-sm">
                  {errors.slice(0, 5).map((error, index) => (
                    <div key={index} className="text-red-600">• {error}</div>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar reporte completo ({errors.length} errores)
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-600">• {error}</div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Vista previa de datos (primeras 5 filas)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fila</TableHead>
                  {data.mappings.map((mapping: any) => (
                    <TableHead key={mapping.sourceColumn}>
                      {mapping.sourceColumn}
                    </TableHead>
                  ))}
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validatedRows.slice(0, 5).map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row._rowIndex}</TableCell>
                    {data.mappings.map((mapping: any) => (
                      <TableCell key={mapping.sourceColumn}>
                        <div>
                          <div className="truncate max-w-32">
                            {row[mapping.targetField] || '-'}
                          </div>
                          {row[`${mapping.targetField}_validation`] !== 'valid' && (
                            <div className="text-xs text-red-500 mt-1">
                              {row[`${mapping.targetField}_error`]}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    ))}
                    <TableCell>
                      {row._errors.length > 0 ? (
                        <Badge className="bg-red-100 text-red-800">
                          <XCircle className="h-3 w-3 mr-1" />
                          Error
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Válido
                        </Badge>
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
          Volver al mapeo
        </Button>
        <Button 
          onClick={handleNext}
          disabled={validRows.length === 0}
        >
          {invalidRows.length > 0 
            ? `Importar ${validRows.length} registros válidos`
            : `Importar todos los registros (${validRows.length})`
          }
        </Button>
      </div>
    </div>
  );
};
