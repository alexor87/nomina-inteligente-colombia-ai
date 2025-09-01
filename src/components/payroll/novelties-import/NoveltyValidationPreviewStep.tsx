import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, Download } from 'lucide-react';
import { ImportStep, ImportData } from '@/types/import-shared';
import { NOVEDAD_TYPE_LABELS, NovedadType } from '@/types/novedades-enhanced';
import { NOVELTY_VALIDATION_RULES } from './NoveltyFieldMapping';
import { formatCurrency } from '@/lib/utils';
import * as XLSX from 'xlsx';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  employeeData?: {
    id: string;
    name: string;
    cedula: string;
  };
}

interface NoveltyValidationPreviewStepProps {
  data: ImportData & { mapping: Record<string, string> };
  onNext: (step: ImportStep) => void;
  onBack: () => void;
  companyId: string;
  periodStartDate: string;
  periodEndDate: string;
}

export const NoveltyValidationPreviewStep = ({ 
  data, 
  onNext, 
  onBack, 
  companyId,
  periodStartDate,
  periodEndDate 
}: NoveltyValidationPreviewStepProps) => {
  const [validationResults, setValidationResults] = useState<Record<number, ValidationResult>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [employees, setEmployees] = useState<Record<string, any>>({});

  useEffect(() => {
    validateRows();
  }, []);

  const validateRows = async () => {
    setIsValidating(true);
    
    try {
      // First, fetch all employees to validate employee identification
      const response = await fetch(`/api/employees?company_id=${companyId}`);
      const employeesData = await response.json();
      
      // Create lookup maps for employee identification
      const employeeByEmail: Record<string, any> = {};
      const employeeByCedula: Record<string, any> = {};
      const employeeById: Record<string, any> = {};
      
      if (employeesData && Array.isArray(employeesData)) {
        employeesData.forEach((emp: any) => {
          if (emp.email) employeeByEmail[emp.email.toLowerCase()] = emp;
          if (emp.cedula) employeeByCedula[emp.cedula] = emp;
          if (emp.id) employeeById[emp.id] = emp;
        });
      }

      setEmployees({ byEmail: employeeByEmail, byCedula: employeeByCedula, byId: employeeById });

      const results: Record<number, ValidationResult> = {};

      for (let i = 0; i < data.rows.length; i++) {
        const row = data.rows[i];
        const result = validateRow(row, { byEmail: employeeByEmail, byCedula: employeeByCedula, byId: employeeById });
        results[i] = result;
      }

      setValidationResults(results);
    } catch (error) {
      console.error('Error validating rows:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const validateRow = (row: any, employeeLookup: any): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let employeeData: any = null;

    // Validate employee identification
    const employeeId = row.employee_identification;
    if (!employeeId) {
      errors.push('Identificación del empleado es requerida');
    } else {
      // Try to find employee by different methods
      const idStr = String(employeeId).toLowerCase().trim();
      
      employeeData = employeeLookup.byEmail[idStr] || 
                    employeeLookup.byCedula[idStr] || 
                    employeeLookup.byId[idStr];
      
      if (!employeeData) {
        errors.push(`No se encontró empleado con identificación: ${employeeId}`);
      }
    }

    // Validate novelty type
    const tipoNovedad = row.tipo_novedad;
    if (!tipoNovedad) {
      errors.push('Tipo de novedad es requerido');
    } else if (!Object.keys(NOVEDAD_TYPE_LABELS).includes(tipoNovedad)) {
      errors.push(`Tipo de novedad inválido: ${tipoNovedad}`);
    }

    // Validate value
    const valor = row.valor;
    if (valor === null || valor === undefined) {
      errors.push('Valor es requerido');
    } else if (typeof valor !== 'number' || isNaN(valor)) {
      errors.push('Valor debe ser un número válido');
    } else if (valor < 0 && !['ausencia', 'multa', 'libranza', 'descuento_voluntario'].includes(tipoNovedad)) {
      warnings.push('Valor negativo detectado, verificar si es correcto');
    }

    // Validate specific novelty type rules
    if (tipoNovedad && NOVELTY_VALIDATION_RULES[tipoNovedad]) {
      const rules = NOVELTY_VALIDATION_RULES[tipoNovedad];
      
      // Check required fields for this novelty type
      for (const requiredField of rules.requiredFields) {
        if (!row[requiredField]) {
          errors.push(`${requiredField} es requerido para novedades de tipo ${NOVEDAD_TYPE_LABELS[tipoNovedad as NovedadType]}`);
        }
      }
      
      // Check forbidden fields
      for (const forbiddenField of rules.forbiddenFields) {
        if (row[forbiddenField]) {
          warnings.push(`${forbiddenField} no es necesario para novedades de tipo ${NOVEDAD_TYPE_LABELS[tipoNovedad as NovedadType]}`);
        }
      }
      
      // Apply specific validations
      Object.entries(rules.validations).forEach(([field, validator]) => {
        const fieldValue = row[field];
        if (fieldValue !== null && fieldValue !== undefined) {
          const validationError = validator(fieldValue);
          if (validationError) {
            errors.push(validationError);
          }
        }
      });
    }

    // Validate dates
    if (row.fecha_inicio) {
      const startDate = new Date(row.fecha_inicio);
      if (isNaN(startDate.getTime())) {
        errors.push('Fecha de inicio inválida');
      } else {
        const periodStart = new Date(periodStartDate);
        const periodEnd = new Date(periodEndDate);
        
        if (startDate < periodStart || startDate > periodEnd) {
          warnings.push('Fecha de inicio está fuera del período de liquidación');
        }
      }
    }

    if (row.fecha_fin) {
      const endDate = new Date(row.fecha_fin);
      if (isNaN(endDate.getTime())) {
        errors.push('Fecha de fin inválida');
      } else if (row.fecha_inicio) {
        const startDate = new Date(row.fecha_inicio);
        if (endDate < startDate) {
          errors.push('Fecha de fin debe ser posterior a fecha de inicio');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      employeeData: employeeData ? {
        id: employeeData.id,
        name: `${employeeData.nombre} ${employeeData.apellido}`,
        cedula: employeeData.cedula
      } : undefined
    };
  };

  const getValidRows = () => {
    return data.rows.filter((_, index) => validationResults[index]?.isValid);
  };

  const getInvalidRows = () => {
    return data.rows.filter((_, index) => !validationResults[index]?.isValid);
  };

  const downloadErrors = () => {
    const invalidRows = data.rows.map((row, index) => {
      const validation = validationResults[index];
      if (!validation?.isValid) {
        return {
          Fila: index + 1,
          Empleado: row.employee_identification || '',
          TipoNovedad: row.tipo_novedad || '',
          Valor: row.valor || '',
          Errores: validation?.errors?.join('; ') || ''
        };
      }
      return null;
    }).filter(Boolean);

    if (invalidRows.length > 0) {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(invalidRows);
      XLSX.utils.book_append_sheet(wb, ws, 'Errores');
      XLSX.writeFile(wb, 'errores_importacion_novedades.xlsx');
    }
  };

  const handleNext = () => {
    const validRows = getValidRows();
    
    if (validRows.length === 0) {
      return;
    }

    // Prepare final data with employee IDs resolved
    const processedRows = validRows.map((row, originalIndex) => {
      const actualIndex = data.rows.indexOf(row);
      const validation = validationResults[actualIndex];
      
      return {
        ...row,
        _employeeId: validation.employeeData?.id,
        _employeeName: validation.employeeData?.name,
        _originalIndex: actualIndex
      };
    });

    onNext({
      step: 'confirmation',
      data: {
        ...data,
        validRows: processedRows,
        invalidRows: getInvalidRows(),
        errors: getInvalidRows().map((_, index) => `Fila ${index + 1}: ${validationResults[data.rows.indexOf(getInvalidRows()[index])]?.errors?.join(', ')}`),
        mapping: data.mappings?.reduce((acc: any, m: any) => {
          acc[m.sourceColumn] = m.targetField;
          return acc;
        }, {}) || data.mapping,
        totalRows: data.rows.length
      }
    });
  };

  const validCount = Object.values(validationResults).filter(r => r.isValid).length;
  const invalidCount = Object.values(validationResults).filter(r => !r.isValid).length;
  const warningCount = Object.values(validationResults).filter(r => r.isValid && r.warnings?.length > 0).length;

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
              <div className="text-2xl font-bold text-green-600">{validCount}</div>
              <div className="text-sm text-gray-600">Registros válidos</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{invalidCount}</div>
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

      {invalidCount > 0 && (
        <Card className="border-red-200">
          <CardHeader className="bg-red-50">
            <CardTitle className="text-red-800 flex items-center justify-between">
              <div className="flex items-center">
                <XCircle className="h-5 w-5 mr-2" />
                Errores encontrados
              </div>
              <Button variant="outline" size="sm" onClick={downloadErrors}>
                <Download className="h-4 w-4 mr-2" />
                Descargar Errores
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-600 mb-3">
              Se encontraron {invalidCount} registros con errores. 
              Puedes continuar e importar solo los registros válidos, o corregir el archivo.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Vista previa de datos (primeras 5 filas)</CardTitle>
        </CardHeader>
        <CardContent>
          {isValidating ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Validando novedades...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fila</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Tipo Novedad</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.slice(0, 5).map((row, index) => {
                    const validation = validationResults[index];
                    
                    return (
                      <TableRow key={index}>
                        <TableCell>{row._rowIndex}</TableCell>
                        <TableCell>
                          <div>
                            <div className="truncate max-w-32">
                              {row.employee_identification || '-'}
                            </div>
                            {validation?.employeeData && (
                              <div className="text-xs text-gray-500">
                                {validation.employeeData.name}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="truncate max-w-32">
                            {row.tipo_novedad ? (
                              NOVEDAD_TYPE_LABELS[row.tipo_novedad as NovedadType] || row.tipo_novedad
                            ) : '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {typeof row.valor === 'number' ? formatCurrency(row.valor) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {validation?.isValid ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Válido
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">
                              <XCircle className="h-3 w-3 mr-1" />
                              Error
                            </Badge>
                          )}
                          {validation?.warnings && validation.warnings.length > 0 && (
                            <Badge variant="outline" className="ml-1 text-yellow-600 border-yellow-600">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Advertencia
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al mapeo
        </Button>
        <Button 
          onClick={handleNext}
          disabled={validCount === 0}
        >
          {invalidCount > 0 
            ? `Importar ${validCount} registros válidos`
            : `Importar todos los registros (${validCount})`
          }
        </Button>
      </div>
    </div>
  );
};