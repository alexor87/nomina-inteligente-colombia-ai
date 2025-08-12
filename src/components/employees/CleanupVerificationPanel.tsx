
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, RefreshCw, Users, Building, Shield } from 'lucide-react';
import { useDemoCleanupVerification } from '@/hooks/useDemoCleanupVerification';

export const CleanupVerificationPanel: React.FC = () => {
  const {
    isVerifying,
    verificationResult,
    employeeStats,
    demoPatterns,
    runVerification
  } = useDemoCleanupVerification();

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-5 w-5 text-green-600" />
    ) : (
      <AlertTriangle className="h-5 w-5 text-red-600" />
    );
  };

  const getStatusBadge = (status: string) => {
    return status === 'SUCCESS' ? (
      <Badge className="bg-green-100 text-green-800 border-green-200">
        ✅ Limpio
      </Badge>
    ) : (
      <Badge variant="destructive">
        ⚠️ Requiere atención
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Título y acción */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Estado de Limpieza del Sistema
          </h2>
          <p className="text-sm text-gray-600">
            Verificación de datos demo y integridad del sistema
          </p>
        </div>
        <Button 
          onClick={runVerification}
          disabled={isVerifying}
          variant="outline"
          size="sm"
        >
          {isVerifying ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Verificar
            </>
          )}
        </Button>
      </div>

      {/* Panel de verificación de limpieza */}
      {verificationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(verificationResult.success)}
              Verificación de Datos Demo
              {getStatusBadge(verificationResult.status)}
            </CardTitle>
            <CardDescription>
              {verificationResult.message}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="font-semibold text-lg">
                  {verificationResult.remainingDemoEmployees}
                </div>
                <div className="text-gray-600">Empleados Demo Restantes</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded">
                <div className="font-semibold text-lg text-blue-600">
                  {verificationResult.companiesCleaned}
                </div>
                <div className="text-gray-600">Empresas Limpiadas</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded">
                <div className="font-semibold text-lg text-green-600">
                  {verificationResult.status === 'SUCCESS' ? '✓' : '✗'}
                </div>
                <div className="text-gray-600">Estado General</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Panel de estadísticas de empleados */}
      {employeeStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Estadísticas de Empleados
            </CardTitle>
            <CardDescription>
              Resumen general del sistema de empleados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="font-semibold text-lg">
                  {employeeStats.totalEmployees}
                </div>
                <div className="text-gray-600">Total Empleados</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded">
                <div className="font-semibold text-lg text-green-600">
                  {employeeStats.activeEmployees}
                </div>
                <div className="text-gray-600">Empleados Activos</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded">
                <div className="font-semibold text-lg text-blue-600">
                  {employeeStats.companiesWithEmployees}
                </div>
                <div className="text-gray-600">Empresas con Empleados</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Panel de verificación de patrones demo */}
      {demoPatterns && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-orange-600" />
              Verificación de Patrones Demo
              {(!demoPatterns.hasDemoEmails && !demoPatterns.hasDemoNames) ? (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  ✅ Sin patrones demo
                </Badge>
              ) : (
                <Badge variant="destructive">
                  ⚠️ Patrones detectados
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Búsqueda de empleados con patrones típicos de datos demo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="font-semibold text-lg">
                  {demoPatterns.demoEmailCount}
                </div>
                <div className="text-gray-600">Emails @test.com</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="font-semibold text-lg">
                  {demoPatterns.demoNameCount}
                </div>
                <div className="text-gray-600">Nombres Demo</div>
              </div>
            </div>
            
            {(demoPatterns.hasDemoEmails || demoPatterns.hasDemoNames) && (
              <div className="mt-4 p-3 bg-orange-50 rounded border border-orange-200">
                <p className="text-sm text-orange-800">
                  <strong>⚠️ Atención:</strong> Se detectaron empleados con patrones demo en tu empresa. 
                  Esto podría indicar datos residuales que requieren limpieza adicional.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Estado de protecciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Protecciones Activas
            <Badge className="bg-green-100 text-green-800 border-green-200">
              ✅ Activas
            </Badge>
          </CardTitle>
          <CardDescription>
            Medidas de seguridad implementadas para prevenir datos demo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Validación de emails @test.com bloqueada</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Nombres demo (Juan Demo, María Demo, etc.) bloqueados</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Logging de seguridad activado</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Triggers de validación en base de datos</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
