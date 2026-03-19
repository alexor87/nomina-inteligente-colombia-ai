
import React from 'react';
import { useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmpresaSettings } from '@/components/settings/EmpresaSettings';
import { EmpleadosSettings } from '@/components/settings/EmpleadosSettings';
import { AportesSettings } from '@/components/settings/AportesSettings';
import { NominaElectronicaSettings } from '@/components/settings/NominaElectronicaSettings';
import { ParametrosLegalesSettings } from '@/components/settings/ParametrosLegalesSettings';
import { ContratoNominaSettings } from '@/components/settings/ContratoNominaSettings';
import { NotificacionesSettings } from '@/components/settings/NotificacionesSettings';
import { IntegracionesSettings } from '@/components/settings/IntegracionesSettings';
import { FacturacionPlanSettings } from '@/components/settings/FacturacionPlanSettings';
import { UsuariosRolesSettings } from '@/components/settings/UsuariosRolesSettings';


const SettingsPage = () => {
  const { state } = useLocation();
  const defaultTab = (state as any)?.activeTab || 'empresa';

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-600">Administra las configuraciones de tu empresa y sistema</p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10 mb-6">
          <TabsTrigger value="empresa">🏢 Empresa</TabsTrigger>
          <TabsTrigger value="empleados">👥 Empleados</TabsTrigger>
          <TabsTrigger value="aportes">💰 Aportes</TabsTrigger>
          <TabsTrigger value="nomina-dian">💻 DIAN</TabsTrigger>
          <TabsTrigger value="parametros">📅 Parámetros</TabsTrigger>
          <TabsTrigger value="contratos">📄 Contratos</TabsTrigger>
          <TabsTrigger value="notificaciones">✉️ Alertas</TabsTrigger>
          <TabsTrigger value="integraciones">🔌 Integraciones</TabsTrigger>
          <TabsTrigger value="facturacion">📦 Facturación</TabsTrigger>
          <TabsTrigger value="usuarios-roles">👤 Equipo</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa">
          <EmpresaSettings />
        </TabsContent>

        <TabsContent value="empleados">
          <EmpleadosSettings />
        </TabsContent>

        <TabsContent value="aportes">
          <AportesSettings />
        </TabsContent>

        <TabsContent value="nomina-dian">
          <NominaElectronicaSettings />
        </TabsContent>

        <TabsContent value="parametros">
          <ParametrosLegalesSettings />
        </TabsContent>

        <TabsContent value="contratos">
          <ContratoNominaSettings />
        </TabsContent>

        <TabsContent value="notificaciones">
          <NotificacionesSettings />
        </TabsContent>

        <TabsContent value="integraciones">
          <IntegracionesSettings />
        </TabsContent>

        <TabsContent value="facturacion">
          <FacturacionPlanSettings />
        </TabsContent>

        <TabsContent value="usuarios-roles">
          <UsuariosRolesSettings />
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default SettingsPage;
