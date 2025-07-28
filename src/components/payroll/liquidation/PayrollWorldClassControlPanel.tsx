import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Settings, 
  Zap, 
  Shield, 
  Clock,
  Target,
  Wrench
} from "lucide-react";
import { ValidationResult } from "@/services/PayrollExhaustiveValidationService";

interface PayrollWorldClassControlPanelProps {
  // Resultados de validación
  exhaustiveValidationResults: ValidationResult | null;
  isValidating: boolean;
  
  // Acciones
  onPerformExhaustiveValidation: () => Promise<void>;
  onAutoRepairIssues: () => Promise<void>;
  onStartLiquidation: () => void;
  
  // Estado
  canProceedWithLiquidation: boolean;
  showProgress: boolean;
  liquidationProgress: number;
  liquidationStep: string;
}

export const PayrollWorldClassControlPanel = ({
  exhaustiveValidationResults,
  isValidating,
  onPerformExhaustiveValidation,
  onAutoRepairIssues,
  onStartLiquidation,
  canProceedWithLiquidation,
  showProgress,
  liquidationProgress,
  liquidationStep
}: PayrollWorldClassControlPanelProps) => {

  const getValidationScoreColor = (score: number) => {
    if (score >= 95) return "text-green-600";
    if (score >= 85) return "text-yellow-600";
    return "text-red-600";
  };

  const getValidationScoreBadge = (score: number) => {
    if (score >= 95) return "bg-green-100 text-green-800";
    if (score >= 85) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getSystemHealthIcon = () => {
    if (!exhaustiveValidationResults) return <Settings className="h-5 w-5 text-gray-500" />;
    
    if (exhaustiveValidationResults.canProceed) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    } else if (exhaustiveValidationResults.mustRepair.length > 0) {
      return <XCircle className="h-5 w-5 text-red-600" />;
    } else {
      return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Panel Principal de Control */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            {getSystemHealthIcon()}
            <CardTitle className="text-lg">Control de Liquidación Clase Mundial</CardTitle>
          </div>
          <CardDescription>
            Sistema avanzado de validación y liquidación atómica con rollback automático
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Estado de Validación */}
          {exhaustiveValidationResults && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Estado del Sistema
                </h3>
                <Badge className={getValidationScoreBadge(exhaustiveValidationResults.score)}>
                  Score: {exhaustiveValidationResults.score}/100
                </Badge>
              </div>

              <Progress 
                value={exhaustiveValidationResults.score} 
                className="mb-3"
              />

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <p className="text-muted-foreground">Críticas</p>
                  <p className={`font-bold ${exhaustiveValidationResults.summary.critical.passed === exhaustiveValidationResults.summary.critical.total ? 'text-green-600' : 'text-red-600'}`}>
                    {exhaustiveValidationResults.summary.critical.passed}/{exhaustiveValidationResults.summary.critical.total}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Importantes</p>
                  <p className={`font-bold ${exhaustiveValidationResults.summary.important.passed === exhaustiveValidationResults.summary.important.total ? 'text-green-600' : 'text-yellow-600'}`}>
                    {exhaustiveValidationResults.summary.important.passed}/{exhaustiveValidationResults.summary.important.total}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Menores</p>
                  <p className="font-bold text-blue-600">
                    {exhaustiveValidationResults.summary.minor.passed}/{exhaustiveValidationResults.summary.minor.total}
                  </p>
                </div>
              </div>

              {/* Errores Críticos */}
              {exhaustiveValidationResults.mustRepair.length > 0 && (
                <Alert className="mt-4 border-red-200 bg-red-50">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium text-red-800 mb-2">
                      {exhaustiveValidationResults.mustRepair.length} errores críticos requieren atención:
                    </p>
                    <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                      {exhaustiveValidationResults.mustRepair.map((check, index) => (
                        <li key={index}>{check.name}: {check.error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Warnings */}
              {exhaustiveValidationResults.warnings.length > 0 && (
                <Alert className="mt-4 border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium text-yellow-800 mb-2">Advertencias:</p>
                    <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                      {exhaustiveValidationResults.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Progreso de Liquidación */}
          {showProgress && (
            <div className="p-4 border rounded-lg bg-blue-50">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <h3 className="font-medium">Liquidación en Progreso</h3>
              </div>
              <Progress value={liquidationProgress} className="mb-2" />
              <p className="text-sm text-muted-foreground">
                Paso actual: {liquidationStep} ({liquidationProgress}%)
              </p>
            </div>
          )}

          {/* Acciones */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={onPerformExhaustiveValidation}
              disabled={isValidating}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Shield className="h-4 w-4" />
              {isValidating ? 'Validando...' : 'Validar Sistema'}
            </Button>

            {exhaustiveValidationResults && exhaustiveValidationResults.mustRepair.length > 0 && (
              <Button
                onClick={onAutoRepairIssues}
                variant="outline"
                className="flex items-center gap-2 text-orange-600 border-orange-200 hover:bg-orange-50"
              >
                <Wrench className="h-4 w-4" />
                Reparar Automáticamente
              </Button>
            )}

            <Button
              onClick={onStartLiquidation}
              disabled={!canProceedWithLiquidation || showProgress || (exhaustiveValidationResults && !exhaustiveValidationResults.canProceed)}
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Liquidar
            </Button>
          </div>

          {/* Estado de la Liquidación */}
          {exhaustiveValidationResults?.canProceed === false && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4" />
              <AlertDescription className="text-red-800">
                No se puede proceder con la liquidación. Score mínimo requerido: 90/100. 
                Score actual: {exhaustiveValidationResults.score}/100
              </AlertDescription>
            </Alert>
          )}

          {exhaustiveValidationResults?.canProceed === true && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-green-800">
                ✅ Sistema listo para liquidación. Score: {exhaustiveValidationResults.score}/100
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

    </div>
  );
};