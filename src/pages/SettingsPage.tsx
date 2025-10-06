
import React from 'react';
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
import { EmbeddingsGenerator } from '@/components/admin/EmbeddingsGenerator';

const SettingsPage = () => {
  return (
    <div className="px-6 py-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-600">Administra las configuraciones de tu empresa y sistema</p>
      </div>
      
      <Tabs defaultValue="empresa" className="w-full">
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
          <TabsTrigger value="rag-ia">🤖 Maya RAG</TabsTrigger>
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

        <TabsContent value="rag-ia">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Sistema RAG de Maya</h2>
              <p className="text-muted-foreground">
                Gestiona la base de conocimiento legal y los embeddings vectoriales que permiten a Maya responder preguntas sobre legislación laboral colombiana.
              </p>
            </div>
            <EmbeddingsGenerator />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
