
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, CheckCircle, RefreshCw, Users, Building2 } from 'lucide-react';
import { useRegistrationRecovery } from '@/hooks/useRegistrationRecovery';

export const RegistrationRecoveryPanel: React.FC = () => {
  const {
    loading,
    incompleteRegistrations,
    findIncompleteRegistrations,
    completeYohannaRegistration,
    runAutoRecovery
  } = useRegistrationRecovery();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Recuperación de Registros
          </CardTitle>
          <CardDescription>
            Herramientas para detectar y corregir registros de usuarios incompletos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Botones de acción */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={findIncompleteRegistrations}
              disabled={loading}
              variant="outline"
            >
              <Users className="h-4 w-4 mr-2" />
              {loading ? 'Buscando...' : 'Buscar registros incompletos'}
            </Button>

            <Button
              onClick={completeYohannaRegistration}
              disabled={loading}
              variant="default"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {loading ? 'Procesando...' : 'Completar registro de Yohanna'}
            </Button>

            <Button
              onClick={runAutoRecovery}
              disabled={loading}
              variant="secondary"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {loading ? 'Ejecutando...' : 'Recuperación automática'}
            </Button>
          </div>

          <Separator />

          {/* Resultados */}
          {incompleteRegistrations.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">
                Registros incompletos encontrados ({incompleteRegistrations.length})
              </h4>
              <div className="space-y-2">
                {incompleteRegistrations.map((registration) => (
                  <div
                    key={registration.user_id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{registration.email}</div>
                      <div className="flex gap-2 mt-1">
                        <Badge variant={registration.has_profile ? "secondary" : "destructive"}>
                          {registration.has_profile ? "✓ Perfil" : "✗ Sin perfil"}
                        </Badge>
                        <Badge variant={registration.has_company ? "secondary" : "destructive"}>
                          {registration.has_company ? "✓ Empresa" : "✗ Sin empresa"}
                        </Badge>
                        <Badge variant={registration.has_roles ? "secondary" : "destructive"}>
                          {registration.has_roles ? "✓ Roles" : "✗ Sin roles"}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      ID: {registration.user_id.slice(0, 8)}...
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estado */}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Procesando solicitud...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información de ayuda */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">¿Qué hace cada función?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <strong>Buscar registros incompletos:</strong> Escanea todos los usuarios para encontrar aquellos que no tienen perfil, empresa asignada o roles.
          </div>
          <div>
            <strong>Completar registro de Yohanna:</strong> Específicamente crea una empresa y asigna roles para el usuario yohanna.munozes@gmail.com.
          </div>
          <div>
            <strong>Recuperación automática:</strong> Intenta completar automáticamente todos los registros que puedan ser reparados.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
