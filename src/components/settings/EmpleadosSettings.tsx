
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useEmployeeConfiguration } from '@/hooks/useEmployeeConfiguration';
import { PersonalDataSection } from '@/components/employees/PersonalDataSection';
import { SecuritySocialSection } from '@/components/employees/SecuritySocialSection';
import { LaborDataSection } from '@/components/employees/LaborDataSection';
import { EmployeeStateSection } from '@/components/employees/EmployeeStateSection';
import { CustomFieldsSection } from '@/components/employees/CustomFieldsSection';
import { ChangeHistorySection } from '@/components/employees/ChangeHistorySection';

export const EmpleadosSettings = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('personal');
  const {
    configuration,
    isLoading,
    hasChanges,
    updatePersonalData,
    updateSecuritySocial,
    updateLaborData,
    updateEmployeeState,
    addCustomField,
    updateCustomField,
    removeCustomField,
    saveConfiguration,
    validateConfiguration,
    getARLPercentage,
    resetConfiguration,
    canActivateEmployee
  } = useEmployeeConfiguration();

  const handleSave = async () => {
    const validation = validateConfiguration();
    
    if (!validation.isValid) {
      toast({
        title: "Errores de validación",
        description: validation.errors.join(', '),
        variant: "destructive"
      });
      return;
    }

    const result = await saveConfiguration();
    
    if (result.success) {
      toast({
        title: "Configuración guardada",
        description: "La configuración de empleados ha sido actualizada correctamente.",
      });
    } else {
      toast({
        title: "Error al guardar",
        description: result.error || "No se pudo guardar la configuración",
        variant: "destructive"
      });
    }
  };

  const handleReset = () => {
    resetConfiguration();
    toast({
      title: "Configuración restablecida",
      description: "Se han restaurado los valores por defecto.",
    });
  };

  const handlePreview = () => {
    const validation = validateConfiguration();
    
    if (!validation.isValid) {
      toast({
        title: "Configuración incompleta",
        description: "Complete todos los campos obligatorios para ver la vista previa.",
        variant: "destructive"
      });
      return;
    }

    // Aquí se podría abrir un modal con la vista previa
    toast({
      title: "Vista previa",
      description: "Funcionalidad de vista previa próximamente disponible.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">Cargando configuración...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">🧑‍🔧 Configuración de Empleados</h2>
        <p className="text-gray-600">Configure los campos y reglas para la gestión de empleados</p>
      </div>

      {!canActivateEmployee() && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">
            ⚠️ La configuración actual no permite activar empleados. Complete todos los campos obligatorios.
          </p>
        </div>
      )}

      <Card className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 gap-1">
            <TabsTrigger value="personal" className="text-xs">📋 Personales</TabsTrigger>
            <TabsTrigger value="labor" className="text-xs">💼 Laborales</TabsTrigger>
            <TabsTrigger value="social" className="text-xs">🏥 Seg. Social</TabsTrigger>
            <TabsTrigger value="custom" className="text-xs">🧩 Personalizados</TabsTrigger>
            <TabsTrigger value="history" className="text-xs">🔄 Historial</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="personal">
              <PersonalDataSection
                data={configuration.personalData}
                onUpdate={updatePersonalData}
              />
            </TabsContent>

            <TabsContent value="labor">
              <LaborDataSection
                data={configuration.laborData}
                onUpdate={updateLaborData}
                getARLPercentage={getARLPercentage}
              />
            </TabsContent>

            <TabsContent value="social">
              <SecuritySocialSection
                data={configuration.securitySocial}
                contractType={configuration.laborData.contractType}
                onUpdate={updateSecuritySocial}
              />
            </TabsContent>

            <TabsContent value="custom">
              <CustomFieldsSection
                fields={configuration.customFields}
                onAdd={addCustomField}
                onUpdate={updateCustomField}
                onRemove={removeCustomField}
              />
            </TabsContent>

            <TabsContent value="history">
              <ChangeHistorySection
                changes={configuration.changeHistory}
              />
            </TabsContent>
          </div>
        </Tabs>

        {/* Estado del empleado - Siempre visible */}
        <div className="mt-6 pt-6 border-t">
          <EmployeeStateSection
            data={configuration.employeeState}
            onUpdate={updateEmployeeState}
          />
        </div>
      </Card>

      {/* Controles inferiores */}
      <div className="flex gap-4 justify-between">
        <div className="flex gap-4">
          <Button onClick={handleSave} disabled={!hasChanges} className="bg-blue-600 hover:bg-blue-700">
            Guardar Configuración
          </Button>
          <Button onClick={handleReset} variant="outline" disabled={!hasChanges}>
            Revertir Cambios
          </Button>
        </div>
        
        <div className="flex gap-4">
          <Button onClick={handlePreview} variant="outline">
            Vista Previa de Ficha
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            💾 Tienes cambios sin guardar. No olvides guardar la configuración.
          </p>
        </div>
      )}
    </div>
  );
};
