
import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  Calendar,
  Building,
  Wrench,
  Search
} from 'lucide-react';
import { useCriticalRepair } from '@/hooks/useCriticalRepair';

/**
 * 🚨 PANEL DE REPARACIÓN CRÍTICA - CTO LEVEL
 * Diagnóstico y reparación automática del sistema de nómina
 */
export const CriticalRepairPanel = () => {
  const {
    isRepairing,
    isDiagnosing,
    diagnosis,
    runDiagnosis,
    runCriticalRepair
  } = useCriticalRepair();

  // Ejecutar diagnóstico automático al cargar
  useEffect(() => {
    runDiagnosis();
  }, [runDiagnosis]);

  const getStatusColor = (count: number) => {
    if (count === 0) return 'bg-red-100 text-red-800';
    if (count < 3) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusIcon = (isGood: boolean) => {
    return isGood ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-red-600" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wrench className="h-5 w-5" />
            <span>Panel de Reparación Crítica</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-4">
            <Button
              onClick={runDiagnosis}
              disabled={isDiagnosing}
              variant="outline"
              className="flex-1"
            >
              {isDiagnosing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Diagnosticando...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Diagnosticar Sistema
                </>
              )}
            </Button>
            
            <Button
              onClick={runCriticalRepair}
              disabled={isRepairing || isDiagnosing}
              className="flex-1"
            >
              {isRepairing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reparando...
                </>
              ) : (
                <>
                  <Wrench className="h-4 w-4 mr-2" />
                  Reparar Sistema
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Diagnóstico */}
      {diagnosis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Autenticación */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2">
                {getStatusIcon(diagnosis.authentication)}
                <span>Autenticación</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={diagnosis.authentication ? 'default' : 'destructive'}>
                {diagnosis.authentication ? 'Activa' : 'Inactiva'}
              </Badge>
            </CardContent>
          </Card>

          {/* Empresa */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2">
                <Building className="h-4 w-4" />
                <span>Empresa</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={diagnosis.companyId ? 'default' : 'destructive'}>
                {diagnosis.companyId ? 'Asignada' : 'Sin asignar'}
              </Badge>
            </CardContent>
          </Card>

          {/* Empleados */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Empleados</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total:</span>
                <Badge className={getStatusColor(diagnosis.employeeCount)}>
                  {diagnosis.employeeCount}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Activos:</span>
                <Badge className={getStatusColor(diagnosis.activeEmployeeCount)}>
                  {diagnosis.activeEmployeeCount}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Períodos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Períodos</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total:</span>
                <Badge className={getStatusColor(diagnosis.periodCount)}>
                  {diagnosis.periodCount}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Activos:</span>
                <Badge className={getStatusColor(diagnosis.activePeriodCount)}>
                  {diagnosis.activePeriodCount}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Problemas encontrados */}
      {diagnosis && diagnosis.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Problemas Encontrados ({diagnosis.issues.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {diagnosis.issues.map((issue: string, index: number) => (
                <Alert key={index} variant="destructive">
                  <AlertDescription>{issue}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recomendaciones */}
      {diagnosis && diagnosis.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-blue-600 flex items-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span>Recomendaciones ({diagnosis.recommendations.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {diagnosis.recommendations.map((rec: string, index: number) => (
                <Alert key={index}>
                  <AlertDescription>{rec}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estado OK */}
      {diagnosis && diagnosis.issues.length === 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
              <h3 className="text-lg font-semibold text-green-800">
                Sistema en perfecto estado
              </h3>
              <p className="text-green-600">
                Todos los componentes críticos están funcionando correctamente
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
