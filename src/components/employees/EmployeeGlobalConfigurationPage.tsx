
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Users, Database, History } from 'lucide-react';
import { DefaultParametersSection } from './DefaultParametersSection';
import { CustomFieldsGlobalSection } from './CustomFieldsGlobalSection';
import { ValidationRulesSection } from './ValidationRulesSection';
import { useEmployeeGlobalConfiguration } from '@/hooks/useEmployeeGlobalConfiguration';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const EmployeeGlobalConfigurationPage = () => {
  const {
    configuration,
    isLoading,
    addCustomField,
    updateCustomField,
    removeCustomField,
    updateDefaultParameters
  } = useEmployeeGlobalConfiguration();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!configuration) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">No se pudo cargar la configuración</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuración Global de Empleados</h1>
          <p className="text-gray-600">
            Configura parámetros por defecto, campos personalizados y reglas de validación para nuevos empleados
          </p>
        </div>
        <Settings className="h-8 w-8 text-gray-400" />
      </div>

      <Tabs defaultValue="defaults" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="defaults" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Parámetros por Defecto
          </TabsTrigger>
          <TabsTrigger value="custom-fields" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Campos Personalizados
          </TabsTrigger>
          <TabsTrigger value="validations" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Reglas de Validación
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historial de Cambios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="defaults" className="space-y-4">
          <DefaultParametersSection
            parameters={configuration.default_parameters}
            onUpdate={updateDefaultParameters}
          />
        </TabsContent>

        <TabsContent value="custom-fields" className="space-y-4">
          <CustomFieldsGlobalSection
            customFields={configuration.custom_fields}
            onAdd={addCustomField}
            onUpdate={updateCustomField}
            onRemove={removeCustomField}
          />
        </TabsContent>

        <TabsContent value="validations" className="space-y-4">
          <ValidationRulesSection
            validationRules={configuration.validation_rules}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Cambios</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">
                Próximamente: Historial completo de cambios en la configuración de empleados
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Acerca del Sistema Dinámico</h3>
        <p className="text-blue-800 text-sm">
          Este sistema permite agregar campos personalizados sin afectar los datos existentes. 
          Los empleados ya registrados mantendrán toda su información, y los nuevos campos 
          se aplicarán automáticamente con valores por defecto configurables.
        </p>
      </div>
    </div>
  );
};
