
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, AlertTriangle, CheckCircle2, Info, Play } from 'lucide-react';
import { NovedadPolicyBackfillService } from '@/services/NovedadPolicyBackfillService';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

interface NovedadPolicyManagerProps {
  companyId: string;
}

export const NovedadPolicyManager: React.FC<NovedadPolicyManagerProps> = ({
  companyId
}) => {
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<any>(null);
  const [isDryRun, setIsDryRun] = useState(true);
  const { toast } = useToast();

  const runBackfill = async (dryRun: boolean = true) => {
    setIsBackfilling(true);
    setBackfillResult(null);

    try {
      console.log(`🔄 Running ${dryRun ? 'DRY RUN' : 'ACTUAL'} backfill for company:`, companyId);

      const result = await NovedadPolicyBackfillService.backfillIncapacityNovelties(
        companyId,
        undefined, // All open periods
        dryRun
      );

      setBackfillResult(result);

      if (result.success) {
        toast({
          title: dryRun ? "✅ Análisis Completado" : "✅ Actualización Completada",
          description: dryRun 
            ? `Se encontraron ${result.updated} registros que necesitan actualización`
            : `Se actualizaron ${result.updated} registros correctamente`,
          className: "border-green-200 bg-green-50"
        });
      } else {
        toast({
          title: "⚠️ Proceso Completado con Advertencias",
          description: `${result.errors.length} errores encontrados`,
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('❌ Backfill error:', error);
      toast({
        title: "❌ Error en el Proceso",
        description: "No se pudo completar la actualización",
        variant: "destructive"
      });
    } finally {
      setIsBackfilling(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          🔧 Actualización de Políticas de Novedades
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Esta herramienta actualiza las incapacidades existentes para que usen las políticas empresariales actuales.
            Solo afecta períodos abiertos (borrador o en proceso).
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={() => runBackfill(true)}
            disabled={isBackfilling}
            variant="outline"
            className="flex-1"
          >
            {isBackfilling && isDryRun ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Analizar Registros (Simulación)
          </Button>

          <Button
            onClick={() => runBackfill(false)}
            disabled={isBackfilling || !backfillResult?.updated}
            className="flex-1"
          >
            {isBackfilling && !isDryRun ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Aplicar Actualización
          </Button>
        </div>

        {/* Progress Indicator */}
        {isBackfilling && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Procesando...</span>
              <span>{isDryRun ? 'Modo Simulación' : 'Aplicando Cambios'}</span>
            </div>
            <Progress value={undefined} className="w-full" />
          </div>
        )}

        {/* Results Display */}
        {backfillResult && (
          <Card className={`${backfillResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                {backfillResult.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                Resultados del Proceso
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-lg">{backfillResult.processed}</div>
                  <div className="text-gray-600">Procesados</div>
                </div>
                
                <div className="text-center">
                  <div className="font-semibold text-lg text-green-600">{backfillResult.updated}</div>
                  <div className="text-gray-600">Actualizados</div>
                </div>
                
                <div className="text-center">
                  <div className="font-semibold text-lg text-red-600">{backfillResult.errors.length}</div>
                  <div className="text-gray-600">Errores</div>
                </div>
              </div>

              {backfillResult.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-red-700">Errores encontrados:</div>
                  <div className="bg-white p-2 rounded border max-h-32 overflow-y-auto">
                    {backfillResult.errors.map((error: string, index: number) => (
                      <div key={index} className="text-xs text-red-600 mb-1">
                        • {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {backfillResult.success && backfillResult.updated > 0 && isDryRun && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    ✅ Simulación exitosa. Puede proceder con la actualización real usando el botón "Aplicar Actualización".
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Usage Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-sm space-y-2">
            <div className="font-medium text-blue-800">Instrucciones:</div>
            <div className="text-blue-700 space-y-1">
              <div>1. <strong>Analizar:</strong> Ejecute primero el análisis para ver qué registros necesitan actualización</div>
              <div>2. <strong>Revisar:</strong> Verifique los resultados del análisis antes de aplicar cambios</div>
              <div>3. <strong>Aplicar:</strong> Use "Aplicar Actualización" solo después de confirmar el análisis</div>
            </div>
          </div>
        </div>

        {/* Current Policy Display */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-sm">
            <div className="font-medium mb-1">Política de Incapacidad Actual:</div>
            <Badge variant="outline" className="bg-white">
              Estándar (2 días 100% + resto 66.67% con piso SMLDV)
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
