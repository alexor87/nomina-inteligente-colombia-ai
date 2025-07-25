import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info,
  Eye,
  RefreshCw
} from 'lucide-react';

export interface ValidationIssue {
  type: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  affectedEmployees?: string[];
  canAutoFix?: boolean;
  fixAction?: () => void;
}

interface PayrollValidationAlertProps {
  issues: ValidationIssue[];
  onViewDetails?: (issue: ValidationIssue) => void;
  onRefreshValidation?: () => void;
  isValidating?: boolean;
}

export const PayrollValidationAlert: React.FC<PayrollValidationAlertProps> = ({
  issues,
  onViewDetails,
  onRefreshValidation,
  isValidating = false
}) => {
  const getIcon = (type: ValidationIssue['type']) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getVariant = (type: ValidationIssue['type']) => {
    switch (type) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'default';
      default:
        return 'default';
    }
  };

  const getBadgeVariant = (type: ValidationIssue['type']) => {
    switch (type) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'info':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (issues.length === 0) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">Validación Exitosa</AlertTitle>
        <AlertDescription className="text-green-700">
          Todos los datos han sido validados correctamente. No se encontraron problemas.
        </AlertDescription>
      </Alert>
    );
  }

  const errorCount = issues.filter(i => i.type === 'error').length;
  const warningCount = issues.filter(i => i.type === 'warning').length;
  const infoCount = issues.filter(i => i.type === 'info').length;

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <Alert variant={errorCount > 0 ? 'destructive' : 'default'}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="flex items-center justify-between">
          <span>Resultados de Validación</span>
          <div className="flex items-center gap-2">
            {onRefreshValidation && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefreshValidation}
                disabled={isValidating}
                className="h-8 px-3"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isValidating ? 'animate-spin' : ''}`} />
                {isValidating ? 'Validando...' : 'Revalidar'}
              </Button>
            )}
          </div>
        </AlertTitle>
        <AlertDescription>
          <div className="flex items-center gap-4 mt-2">
            {errorCount > 0 && (
              <Badge variant="destructive">
                {errorCount} Error{errorCount > 1 ? 'es' : ''}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="secondary">
                {warningCount} Advertencia{warningCount > 1 ? 's' : ''}
              </Badge>
            )}
            {infoCount > 0 && (
              <Badge variant="outline">
                {infoCount} Información
              </Badge>
            )}
          </div>
        </AlertDescription>
      </Alert>

      {/* Lista de Issues */}
      <div className="space-y-3">
        {issues.map((issue, index) => (
          <Alert key={index} variant={getVariant(issue.type)}>
            {getIcon(issue.type)}
            <AlertTitle className="flex items-center justify-between">
              <span>{issue.title}</span>
              <div className="flex items-center gap-2">
                <Badge variant={getBadgeVariant(issue.type)}>
                  {issue.type === 'error' ? 'Error' : 
                   issue.type === 'warning' ? 'Advertencia' : 'Info'}
                </Badge>
                {issue.affectedEmployees && (
                  <Badge variant="outline">
                    {issue.affectedEmployees.length} empleado{issue.affectedEmployees.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </AlertTitle>
            <AlertDescription>
              <div className="space-y-3">
                <p>{issue.description}</p>
                
                {issue.affectedEmployees && issue.affectedEmployees.length > 0 && (
                  <div>
                    <p className="font-medium mb-2">Empleados afectados:</p>
                    <div className="flex flex-wrap gap-1">
                      {issue.affectedEmployees.slice(0, 3).map((employee, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {employee}
                        </Badge>
                      ))}
                      {issue.affectedEmployees.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{issue.affectedEmployees.length - 3} más
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {onViewDetails && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(issue)}
                      className="h-8 px-3"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Ver Detalles
                    </Button>
                  )}
                  
                  {issue.canAutoFix && issue.fixAction && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={issue.fixAction}
                      className="h-8 px-3"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Corregir Automáticamente
                    </Button>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        ))}
      </div>
    </div>
  );
};