
import React from 'react';
import { AlertTriangle, RefreshCw, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SocialBenefitsErrorProps {
  error: string;
  onRetry?: () => void;
}

export const SocialBenefitsError: React.FC<SocialBenefitsErrorProps> = ({ error, onRetry }) => {
  const isCompanyError = error.includes('empresa') || error.includes('company');
  const isEmployeeError = error.includes('empleados') || error.includes('employees');

  return (
    <div className="space-y-6">
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            Error en Prestaciones Sociales
          </CardTitle>
          <CardDescription className="text-red-600">
            No se puede cargar el módulo de prestaciones sociales
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>

          {isCompanyError && (
            <div className="bg-white p-4 rounded-lg border border-red-200">
              <h4 className="font-medium text-red-800 mb-2">Problema de configuración de empresa</h4>
              <p className="text-sm text-red-600 mb-3">
                Tu perfil de usuario no está asociado a ninguna empresa. Esto es necesario para acceder a las prestaciones sociales.
              </p>
              <div className="text-xs text-red-500">
                <p>Posibles soluciones:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Contacta al administrador del sistema</li>
                  <li>Verifica que tu empresa esté correctamente configurada</li>
                  <li>Actualiza tu perfil de usuario</li>
                </ul>
              </div>
            </div>
          )}

          {isEmployeeError && (
            <div className="bg-white p-4 rounded-lg border border-red-200">
              <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                <User className="h-4 w-4" />
                Problema con empleados
              </h4>
              <p className="text-sm text-red-600 mb-3">
                No se pudieron cargar los empleados necesarios para calcular las prestaciones sociales.
              </p>
              <div className="text-xs text-red-500">
                <p>Posibles causas:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>No hay empleados registrados en la empresa</li>
                  <li>Problema de conectividad con la base de datos</li>
                  <li>Permisos insuficientes para acceder a los datos</li>
                </ul>
              </div>
            </div>
          )}

          {onRetry && (
            <div className="flex justify-center">
              <Button onClick={onRetry} variant="outline" className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Reintentar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
