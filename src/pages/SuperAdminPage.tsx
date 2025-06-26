
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, Building2, Settings, AlertTriangle } from 'lucide-react';
import { RegistrationRecoveryPanel } from '@/components/admin/RegistrationRecoveryPanel';

export const SuperAdminPage: React.FC = () => {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Panel de Super Administrador</h1>
          <p className="text-gray-600">Gestión y administración del sistema</p>
        </div>
      </div>

      <Tabs defaultValue="recovery" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recovery" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Recuperación
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="companies" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Empresas
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Sistema
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recovery" className="space-y-6">
          <RegistrationRecoveryPanel />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Usuarios</CardTitle>
              <CardDescription>
                Administrar usuarios del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Panel de usuarios en desarrollo...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Empresas</CardTitle>
              <CardDescription>
                Administrar empresas registradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Panel de empresas en desarrollo...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración del Sistema</CardTitle>
              <CardDescription>
                Configuraciones globales y mantenimiento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Configuraciones del sistema en desarrollo...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
