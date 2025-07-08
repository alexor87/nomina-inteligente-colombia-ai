
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useEmployeeGlobalConfiguration } from '@/hooks/useEmployeeGlobalConfiguration';
import { CustomFieldsGlobalSection } from '@/components/employees/CustomFieldsGlobalSection';
import { ValidationRulesSection } from '@/components/employees/ValidationRulesSection';
import { DefaultParametersSection } from '@/components/employees/DefaultParametersSection';

export const EmpleadosSettings = () => {
  const { toast } = useToast();
  const {
    configuration,
    isLoading,
    hasChanges,
    addCustomField,
    updateCustomField,
    removeCustomField,
    updateValidationRules,
    updateDefaultParameters,
    saveConfiguration,
    resetConfiguration,
    validateConfiguration
  } = useEmployeeGlobalConfiguration();

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">Cargando configuración...</div>
      </div>
    );
  }

  if (!configuration) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">No se pudo cargar la configuración</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">🧑‍🔧 Configuración de Empleados</h2>
        <p className="text-gray-600">Configure campos personalizados, reglas de validación y valores por defecto para el módulo de empleados</p>
      </div>

      {/* Campos Personalizados */}
      <CustomFieldsGlobalSection
        customFields={configuration.custom_fields}
        onAdd={addCustomField}
        onUpdate={updateCustomField}
        onRemove={removeCustomField}
      />

      {/* Reglas de Validación */}
      <ValidationRulesSection
        validationRules={configuration.validation_rules}
      />

      {/* Parámetros por Defecto */}
      <DefaultParametersSection
        parameters={configuration.default_parameters}
        onUpdate={updateDefaultParameters}
      />

      {/* Controles inferiores */}
      <Card className="p-6">
        <div className="flex gap-4 justify-between">
          <div className="flex gap-4">
            <Button onClick={handleSave} disabled={!hasChanges} className="bg-blue-600 hover:bg-blue-700">
              Guardar Configuración
            </Button>
            <Button onClick={handleReset} variant="outline" disabled={!hasChanges}>
              Revertir Cambios
            </Button>
          </div>
          
          <Button 
            onClick={() => resetConfiguration()} 
            variant="outline"
            className="text-red-600 hover:text-red-700"
          >
            Restaurar a valores iniciales
          </Button>
        </div>

        {hasChanges && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">
              💾 Tienes cambios sin guardar. No olvides guardar la configuración.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};
