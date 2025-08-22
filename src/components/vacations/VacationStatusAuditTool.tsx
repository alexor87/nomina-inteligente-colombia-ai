
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, RefreshCw, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { VacationStatusValidationService, type StatusValidationResult, type StatusCorrectionResult } from '@/services/VacationStatusValidationService';

export const VacationStatusAuditTool: React.FC = () => {
  const [auditResults, setAuditResults] = useState<StatusValidationResult[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleAuditStatuses = async () => {
    setIsAuditing(true);
    try {
      const results = await VacationStatusValidationService.auditAllVacationStatuses();
      setAuditResults(results);
      
      const needingCorrection = results.filter(r => r.needsCorrection).length;
      if (needingCorrection > 0) {
        toast.warning(`Se encontraron ${needingCorrection} estados incorrectos de ${results.length} revisados`);
      } else {
        toast.success(`Todos los ${results.length} estados están correctos`);
      }
    } catch (error: any) {
      console.error('Error durante auditoría:', error);
      toast.error('Error al auditar estados: ' + error.message);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleCorrectStatuses = async () => {
    setIsCorrecting(true);
    try {
      const correctionResult = await VacationStatusValidationService.correctFalseStatuses();
      
      if (correctionResult.success) {
        toast.success(correctionResult.message);
        // Refrescar auditoría después de la corrección
        await handleAuditStatuses();
      } else {
        toast.error(correctionResult.message);
      }
    } catch (error: any) {
      console.error('Error durante corrección:', error);
      toast.error('Error al corregir estados: ' + error.message);
    } finally {
      setIsCorrecting(false);
    }
  };

  const falseLiquidadas = auditResults.filter(r => r.needsCorrection && r.currentStatus === 'liquidada');
  const correctLiquidadas = auditResults.filter(r => !r.needsCorrection && r.currentStatus === 'liquidada');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Auditoría de Estados de Liquidación
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Verifica y corrige estados "Liquidada" incorrectos que no tienen procesamiento real en nómina.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={handleAuditStatuses}
              disabled={isAuditing}
              variant="outline"
            >
              {isAuditing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Auditando...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Auditar Estados
                </>
              )}
            </Button>

            {auditResults.length > 0 && falseLiquidadas.length > 0 && (
              <Button 
                onClick={handleCorrectStatuses}
                disabled={isCorrecting}
                variant="destructive"
              >
                {isCorrecting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Corrigiendo...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Corregir Estados Falsos
                  </>
                )}
              </Button>
            )}

            {auditResults.length > 0 && (
              <Button 
                onClick={() => setShowDetails(!showDetails)}
                variant="ghost"
              >
                {showDetails ? 'Ocultar' : 'Ver'} Detalles
              </Button>
            )}
          </div>

          {auditResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">{auditResults.length}</div>
                  <div className="text-sm text-muted-foreground">Registros Auditados</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-red-600">{falseLiquidadas.length}</div>
                  <div className="text-sm text-muted-foreground">Estados Falsos</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">{correctLiquidadas.length}</div>
                  <div className="text-sm text-muted-foreground">Correctamente Liquidadas</div>
                </CardContent>
              </Card>
            </div>
          )}

          {showDetails && auditResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detalles de la Auditoría</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {auditResults.map((result) => (
                    <div 
                      key={result.id}
                      className={`p-3 rounded-lg border ${
                        result.needsCorrection 
                          ? 'border-red-200 bg-red-50' 
                          : 'border-green-200 bg-green-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{result.employeeName}</div>
                          <div className="text-sm text-muted-foreground">
                            Estado: {result.currentStatus}
                            {result.needsCorrection && (
                              <span className="text-red-600"> → {result.correctStatus}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={result.hasPayrollRecord ? "default" : "secondary"}>
                            {result.hasPayrollRecord ? 'Con Nómina' : 'Sin Nómina'}
                          </Badge>
                          <Badge variant={result.hasPeriodClosed ? "default" : "secondary"}>
                            {result.hasPeriodClosed ? 'Período Cerrado' : 'Período Abierto'}
                          </Badge>
                          {result.needsCorrection && (
                            <Badge variant="destructive">Requiere Corrección</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
