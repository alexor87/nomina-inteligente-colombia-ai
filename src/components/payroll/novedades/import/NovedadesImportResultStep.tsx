
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Users, ArrowLeft } from 'lucide-react';

interface NovedadesImportResultStepProps {
  data: {
    validRows: any[];
    invalidRows: any[];
    mapping: Record<string, string>;
    totalRows: number;
    importResult?: {
      success: number;
      errors: number;
      employeesAffected: number;
    };
  };
  onComplete: () => void;
  onBack: () => void;
}

export const NovedadesImportResultStep = ({
  data,
  onComplete,
  onBack
}: NovedadesImportResultStepProps) => {
  const { importResult } = data;

  const isSuccess = importResult && importResult.success > 0 && importResult.errors === 0;
  const hasPartialSuccess = importResult && importResult.success > 0 && importResult.errors > 0;

  return (
    <div className="space-y-6">
      <Card className={`${isSuccess ? 'border-green-200 bg-green-50' : hasPartialSuccess ? 'border-yellow-200 bg-yellow-50' : 'border-red-200 bg-red-50'}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isSuccess ? (
              <>
                <CheckCircle className="h-6 w-6 text-green-600" />
                <span className="text-green-800">Importación completada exitosamente</span>
              </>
            ) : hasPartialSuccess ? (
              <>
                <AlertCircle className="h-6 w-6 text-yellow-600" />
                <span className="text-yellow-800">Importación parcialmente exitosa</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-6 w-6 text-red-600" />
                <span className="text-red-800">Error en la importación</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {importResult?.success || 0}
              </div>
              <div className="text-sm text-gray-600">Novedades creadas</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">
                {importResult?.errors || 0}
              </div>
              <div className="text-sm text-gray-600">Errores</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {importResult?.employeesAffected || 0}
              </div>
              <div className="text-sm text-gray-600">Empleados afectados</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-600">
                {data.totalRows}
              </div>
              <div className="text-sm text-gray-600">Total procesadas</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isSuccess && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-green-800">¡Importación exitosa!</h4>
                <p className="text-sm text-green-700">
                  Todas las novedades se han importado correctamente. Los cálculos de nómina 
                  se han actualizado automáticamente para los empleados afectados.
                </p>
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <Users className="h-4 w-4" />
                  <span>
                    {importResult?.employeesAffected} empleado(s) ahora tienen nuevas novedades en este período
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {hasPartialSuccess && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-yellow-800">Importación parcial</h4>
                <p className="text-sm text-yellow-700">
                  Se importaron {importResult?.success} novedades exitosamente, pero {importResult?.errors} 
                  registros presentaron errores. Revisa los errores y corrige los datos para una nueva importación.
                </p>
                <div className="flex items-center gap-2 text-sm text-yellow-700">
                  <Users className="h-4 w-4" />
                  <span>
                    {importResult?.employeesAffected} empleado(s) fueron afectados por las novedades exitosas
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isSuccess && !hasPartialSuccess && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-red-800">Error en la importación</h4>
                <p className="text-sm text-red-700">
                  No se pudo importar ninguna novedad. Revisa los errores de validación 
                  y corrige el archivo antes de intentar nuevamente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a validación
        </Button>
        
        <Button onClick={onComplete}>
          Finalizar
        </Button>
      </div>
    </div>
  );
};
