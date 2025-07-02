import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info, XCircle, CheckCircle } from "lucide-react";

interface PeriodValidationAlertProps {
  validationResult: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    canCreateNew: boolean;
  };
  onTryAgain?: () => void;
  onContactSupport?: () => void;
}

export const PeriodValidationAlert = ({ 
  validationResult, 
  onTryAgain, 
  onContactSupport 
}: PeriodValidationAlertProps) => {
  const { isValid, errors, warnings, canCreateNew } = validationResult;

  if (isValid && warnings.length === 0) {
    return null; // No mostrar nada si todo está bien
  }

  const getAlertVariant = () => {
    if (errors.length > 0) return "destructive";
    if (warnings.length > 0) return "default";
    return "default";
  };

  const getIcon = () => {
    if (errors.length > 0) return <XCircle className="h-5 w-5" />;
    if (warnings.length > 0) return <AlertTriangle className="h-5 w-5" />;
    return <Info className="h-5 w-5" />;
  };

  const getTitle = () => {
    if (errors.length > 0) return "No se puede crear el período";
    if (warnings.length > 0) return "Advertencias sobre el período";
    return "Información del período";
  };

  return (
    <Alert variant={getAlertVariant()} className="mb-6">
      {getIcon()}
      <AlertTitle className="flex items-center gap-2">
        {getTitle()}
        {!canCreateNew && (
          <Badge variant="destructive" className="text-xs">
            Bloqueado
          </Badge>
        )}
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        {/* Errores */}
        {errors.length > 0 && (
          <div className="space-y-2">
            <p className="font-medium text-red-700">Errores que deben corregirse:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {errors.map((error, index) => (
                <li key={index} className="text-red-600">
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Advertencias */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            <p className="font-medium text-amber-700">Advertencias:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {warnings.map((warning, index) => (
                <li key={index} className="text-amber-600">
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Explicación de las reglas de negocio */}
        {errors.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">📋 Reglas de períodos de nómina</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Solo puede haber un período abierto (borrador) por empresa</li>
              <li>• Se permiten múltiples períodos pasados, pero solo un período futuro</li>
              <li>• Los períodos no pueden superponerse en fechas</li>
              <li>• Debe cerrar el período actual antes de crear uno nuevo</li>
            </ul>
          </div>
        )}

        {/* Acciones recomendadas */}
        {!canCreateNew && (
          <div className="mt-4 flex flex-wrap gap-2">
            {onTryAgain && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onTryAgain}
                className="text-sm"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Reintentar
              </Button>
            )}
            
            {onContactSupport && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onContactSupport}
                className="text-sm"
              >
                <Info className="h-4 w-4 mr-1" />
                Contactar Soporte
              </Button>
            )}
            
            <div className="text-xs text-gray-500 self-center">
              Revisa el historial de nóminas o la configuración de periodicidad
            </div>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};