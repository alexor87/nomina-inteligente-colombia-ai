
import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmpresaSettings } from '@/components/settings/EmpresaSettings';
import { ContratoNominaSettings } from '@/components/settings/ContratoNominaSettings';
import { AportesSettings } from '@/components/settings/AportesSettings';
import { NominaElectronicaSettings } from '@/components/settings/NominaElectronicaSettings';
import { UsuariosRolesSettings } from '@/components/settings/UsuariosRolesSettings';
import { EmpleadosSettings } from '@/components/settings/EmpleadosSettings';
import { DispersionBancariaSettings } from '@/components/settings/DispersionBancariaSettings';
import { NotificacionesSettings } from '@/components/settings/NotificacionesSettings';
import { FacturacionPlanSettings } from '@/components/settings/FacturacionPlanSettings';
import { IntegracionesSettings } from '@/components/settings/IntegracionesSettings';
import { ParametrosLegalesSettings } from '@/components/settings/ParametrosLegalesSettings';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('empresa');

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Configuración del Sistema</h1>
        </div>

        <Card className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6 lg:grid-cols-11 gap-1 h-auto p-1">
              <TabsTrigger value="empresa" className="text-xs">🧾 Empresa</TabsTrigger>
              <TabsTrigger value="contrato" className="text-xs">📄 Contrato</TabsTrigger>
              <TabsTrigger value="aportes" className="text-xs">💰 Aportes</TabsTrigger>
              <TabsTrigger value="nomina-electronica" className="text-xs">💻 DIAN</TabsTrigger>
              <TabsTrigger value="usuarios" className="text-xs">🧑‍💼 Usuarios</TabsTrigger>
              <TabsTrigger value="empleados" className="text-xs">🧑‍🔧 Empleados</TabsTrigger>
              <TabsTrigger value="dispersion" className="text-xs">🏦 Bancos</TabsTrigger>
              <TabsTrigger value="notificaciones" className="text-xs">✉️ Alertas</TabsTrigger>
              <TabsTrigger value="facturacion" className="text-xs">📦 Plan</TabsTrigger>
              <TabsTrigger value="integraciones" className="text-xs">🔌 APIs</TabsTrigger>
              <TabsTrigger value="parametros-legales" className="text-xs">📅 Legal</TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="empresa">
                <EmpresaSettings />
              </TabsContent>

              <TabsContent value="contrato">
                <ContratoNominaSettings />
              </TabsContent>

              <TabsContent value="aportes">
                <AportesSettings />
              </TabsContent>

              <TabsContent value="nomina-electronica">
                <NominaElectronicaSettings />
              </TabsContent>

              <TabsContent value="usuarios">
                <UsuariosRolesSettings />
              </TabsContent>

              <TabsContent value="empleados">
                <EmpleadosSettings />
              </TabsContent>

              <TabsContent value="dispersion">
                <DispersionBancariaSettings />
              </TabsContent>

              <TabsContent value="notificaciones">
                <NotificacionesSettings />
              </TabsContent>

              <TabsContent value="facturacion">
                <FacturacionPlanSettings />
              </TabsContent>

              <TabsContent value="integraciones">
                <IntegracionesSettings />
              </TabsContent>

              <TabsContent value="parametros-legales">
                <ParametrosLegalesSettings />
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </div>
    </Layout>
  );
};

export default SettingsPage;
