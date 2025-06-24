
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, XCircle, ArrowLeft } from 'lucide-react';
import { ImportStep, ColumnMapping } from '../ImportEmployeesDrawer';

interface ColumnMappingStepProps {
  data: any;
  onNext: (step: ImportStep) => void;
  onBack: () => void;
}

const EMPLOYEE_FIELDS = [
  { value: 'nombre', label: 'Nombre', required: true },
  { value: 'apellido', label: 'Apellido', required: true },
  { value: 'cedula', label: 'Documento de identidad', required: true },
  { value: 'email', label: 'Correo electrónico', required: false },
  { value: 'telefono', label: 'Teléfono', required: false },
  { value: 'cargo', label: 'Cargo', required: false },
  { value: 'salarioBase', label: 'Salario base', required: true },
  { value: 'tipoContrato', label: 'Tipo de contrato', required: true },
  { value: 'fechaIngreso', label: 'Fecha de ingreso', required: true },
  { value: 'estado', label: 'Estado', required: false },
  { value: 'eps', label: 'EPS', required: false },
  { value: 'afp', label: 'Fondo de pensiones', required: false },
  { value: 'arl', label: 'ARL', required: false },
  { value: 'cajaCompensacion', label: 'Caja de compensación', required: false },
  { value: 'banco', label: 'Banco', required: false },
  { value: 'tipoCuenta', label: 'Tipo de cuenta', required: false },
  { value: 'numeroCuenta', label: 'Número de cuenta', required: false },
  { value: 'titularCuenta', label: 'Titular de cuenta', required: false }
];

export const ColumnMappingStep = ({ data, onNext, onBack }: ColumnMappingStepProps) => {
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);

  useEffect(() => {
    // Auto-mapeo inicial basado en similitud semántica
    const initialMappings: ColumnMapping[] = data.columns.map((column: string) => {
      const suggestedField = suggestMapping(column);
      const field = EMPLOYEE_FIELDS.find(f => f.value === suggestedField);
      
      return {
        sourceColumn: column,
        targetField: suggestedField || '',
        isRequired: field?.required || false,
        validation: suggestedField ? 'valid' : 'warning',
        validationMessage: suggestedField ? undefined : 'Mapeo no sugerido'
      };
    });

    setMappings(initialMappings);
  }, [data.columns]);

  const suggestMapping = (columnName: string): string | null => {
    const name = columnName.toLowerCase().trim();
    
    // Mapeos exactos y por similitud
    const mappingRules = [
      { patterns: ['nombre', 'name', 'first_name', 'primer_nombre'], field: 'nombre' },
      { patterns: ['apellido', 'lastname', 'last_name', 'surname'], field: 'apellido' },
      { patterns: ['cedula', 'documento', 'dni', 'cc', 'nit', 'identification'], field: 'cedula' },
      { patterns: ['email', 'correo', 'mail', 'e-mail'], field: 'email' },
      { patterns: ['telefono', 'phone', 'celular', 'mobile', 'tel'], field: 'telefono' },
      { patterns: ['cargo', 'position', 'job', 'puesto', 'role'], field: 'cargo' },
      { patterns: ['salario', 'salary', 'sueldo', 'wage', 'salario_base'], field: 'salarioBase' },
      { patterns: ['contrato', 'contract', 'tipo_contrato'], field: 'tipoContrato' },
      { patterns: ['fecha_ingreso', 'ingreso', 'start_date', 'hire_date'], field: 'fechaIngreso' },
      { patterns: ['estado', 'status', 'state'], field: 'estado' },
      { patterns: ['eps', 'salud'], field: 'eps' },
      { patterns: ['afp', 'pension', 'fondo'], field: 'afp' },
      { patterns: ['arl', 'riesgo'], field: 'arl' },
      { patterns: ['caja', 'compensacion'], field: 'cajaCompensacion' },
      { patterns: ['banco', 'bank'], field: 'banco' },
      { patterns: ['tipo_cuenta', 'account_type'], field: 'tipoCuenta' },
      { patterns: ['numero_cuenta', 'account_number', 'cuenta'], field: 'numeroCuenta' },
      { patterns: ['titular', 'account_holder'], field: 'titularCuenta' }
    ];

    for (const rule of mappingRules) {
      if (rule.patterns.some(pattern => name.includes(pattern))) {
        return rule.field;
      }
    }

    return null;
  };

  const handleMappingChange = (sourceColumn: string, targetField: string) => {
    setMappings(prev => prev.map(mapping => {
      if (mapping.sourceColumn === sourceColumn) {
        const field = EMPLOYEE_FIELDS.find(f => f.value === targetField);
        return {
          ...mapping,
          targetField,
          isRequired: field?.required || false,
          validation: targetField ? 'valid' : 'warning',
          validationMessage: targetField ? undefined : 'Campo no mapeado'
        };
      }
      return mapping;
    }));
  };

  const getValidationIcon = (validation?: string) => {
    switch (validation) {
      case 'valid': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const requiredFieldsMapped = EMPLOYEE_FIELDS
    .filter(field => field.required)
    .every(field => mappings.some(m => m.targetField === field.value));

  const handleContinue = () => {
    onNext({
      step: 'validation',
      data: {
        ...data,
        mappings
      }
    });
  };

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
          <CardTitle className="text-base">Columnas detectadas: {data.columns.length}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mappings.map((mapping, index) => (
              <div key={index} className="flex items-center space-x-4 p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {mapping.sourceColumn}
                  </div>
                  <div className="text-sm text-gray-500">
                    Columna del archivo
                  </div>
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
                      <SelectItem value="">Sin mapear</SelectItem>
                      {EMPLOYEE_FIELDS.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  {getValidationIcon(mapping.validation)}
                  {mapping.isRequired && (
                    <Badge variant="secondary" className="text-xs">
                      Requerido
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {!requiredFieldsMapped && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Campos obligatorios faltantes
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                Debes mapear los siguientes campos obligatorios: {' '}
                {EMPLOYEE_FIELDS
                  .filter(field => field.required && !mappings.some(m => m.targetField === field.value))
                  .map(field => field.label)
                  .join(', ')}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <Button 
          onClick={handleContinue}
          disabled={!requiredFieldsMapped}
        >
          Validar datos
        </Button>
      </div>
    </div>
  );
};
