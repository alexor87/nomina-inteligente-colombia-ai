
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useButtonValidation } from '@/hooks/useButtonValidation';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Play, 
  Users, 
  Calculator, 
  FileText 
} from 'lucide-react';

export const ButtonValidationPanel = () => {
  const {
    validateAllButtons,
    validateEmployeeModule,
    validatePayrollModule,
    isValidating,
    validationResults
  } = useButtonValidation();

  const renderValidationResults = () => {
    if (!validationResults) return null;

    const renderModuleResults = (moduleName: string, results: any) => (
      <div key={moduleName} className="space-y-2">
        <h4 className="font-medium text-sm text-gray-700 capitalize">{moduleName}</h4>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(results).map(([test, passed]) => (
            <div key={test} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-xs text-gray-600">{test}</span>
              {passed ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          ))}
        </div>
      </div>
    );

    return (
      <div className="space-y-4 mt-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Resultados de Validación</h3>
          <Badge variant="outline">
            {validationResults.timestamp && new Date(validationResults.timestamp).toLocaleTimeString()}
          </Badge>
        </div>
        
        {renderModuleResults('empleados', validationResults.employees)}
        {renderModuleResults('nómina', validationResults.payroll)}
        {renderModuleResults('comprobantes', validationResults.vouchers)}
      </div>
    );
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            🔍 Validación de Botones y Backend
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Verifica que todos los botones realicen las acciones correctas y que el backend responda adecuadamente
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={validateAllButtons}
            disabled={isValidating}
            className="flex items-center gap-2"
          >
            {isValidating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Validar Todos los Módulos
          </Button>

          <div className="space-y-2">
            <Button
              variant="outline"
              onClick={validateEmployeeModule}
              disabled={isValidating}
              className="w-full flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Validar Empleados
            </Button>
            
            <Button
              variant="outline"
              onClick={validatePayrollModule}
              disabled={isValidating}
              className="w-full flex items-center gap-2"
            >
              <Calculator className="h-4 w-4" />
              Validar Nómina
            </Button>
          </div>
        </div>

        {isValidating && (
          <div className="flex items-center justify-center p-8 bg-blue-50 rounded-lg">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
            <span className="text-blue-700">Validando funcionalidades...</span>
          </div>
        )}

        {renderValidationResults()}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
          <h4 className="font-medium text-yellow-800 mb-2">📋 Qué se está validando:</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• <strong>Empleados:</strong> Crear, editar, eliminar, cambiar estado, exportar, acciones masivas</li>
            <li>• <strong>Nómina:</strong> Calcular, generar liquidación, exportar, aprobar</li>
            <li>• <strong>Comprobantes:</strong> Generar, enviar, descargar, reenviar</li>
            <li>• <strong>Backend:</strong> Conexiones a base de datos, permisos RLS, operaciones CRUD</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};
