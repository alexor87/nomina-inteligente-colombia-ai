
import { useState, useEffect } from 'react';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { EmployeeConfigurationService } from '@/services/EmployeeConfigurationService';
import { CustomField, DefaultParameters, EmployeeGlobalConfiguration, ValidationRule } from '@/types/employee-config';
import { useToast } from '@/hooks/use-toast';

export const useEmployeeGlobalConfiguration = () => {
  const [configuration, setConfiguration] = useState<EmployeeGlobalConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const { companyId } = useCurrentCompany();
  const { toast } = useToast();

  // Cargar configuración inicial
  const loadConfiguration = async () => {
    if (!companyId) return;
    
    setIsLoading(true);
    try {
      const config = await EmployeeConfigurationService.getCompanyConfiguration(companyId);
      setConfiguration(config);
    } catch (error) {
      console.error('Error cargando configuración:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la configuración de empleados",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfiguration();
  }, [companyId]);

  // Agregar nuevo campo personalizado
  const addCustomField = async (field: Omit<CustomField, 'id'>) => {
    if (!companyId) return false;

    try {
      const newField = await EmployeeConfigurationService.saveCustomField(companyId, field);
      
      if (newField) {
        setConfiguration(prev => prev ? {
          ...prev,
          custom_fields: [...prev.custom_fields, newField]
        } : null);
        
        // Crear snapshot del esquema
        await EmployeeConfigurationService.createSchemaVersion(
          companyId,
          `Campo agregado: ${field.field_label}`,
          configuration?.custom_fields || []
        );
        
        toast({
          title: "Campo agregado",
          description: `El campo "${field.field_label}" ha sido agregado exitosamente`,
          className: "border-green-200 bg-green-50"
        });
        
        setHasChanges(true);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error agregando campo:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar el campo personalizado",
        variant: "destructive"
      });
      return false;
    }
  };

  // Actualizar campo personalizado
  const updateCustomField = async (fieldId: string, updates: Partial<CustomField>) => {
    try {
      const success = await EmployeeConfigurationService.updateCustomField(fieldId, updates);
      
      if (success) {
        setConfiguration(prev => prev ? {
          ...prev,
          custom_fields: prev.custom_fields.map(field => 
            field.id === fieldId ? { ...field, ...updates } : field
          )
        } : null);
        
        toast({
          title: "Campo actualizado",
          description: "El campo ha sido actualizado exitosamente",
          className: "border-green-200 bg-green-50"
        });
        
        setHasChanges(true);
      }
      
      return success;
    } catch (error) {
      console.error('Error actualizando campo:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el campo",
        variant: "destructive"
      });
      return false;
    }
  };

  // Eliminar campo personalizado
  const removeCustomField = async (fieldId: string) => {
    try {
      const success = await EmployeeConfigurationService.deleteCustomField(fieldId);
      
      if (success) {
        setConfiguration(prev => prev ? {
          ...prev,
          custom_fields: prev.custom_fields.filter(field => field.id !== fieldId)
        } : null);
        
        toast({
          title: "Campo eliminado",
          description: "El campo ha sido eliminado exitosamente",
          className: "border-green-200 bg-green-50"
        });
        
        setHasChanges(true);
      }
      
      return success;
    } catch (error) {
      console.error('Error eliminando campo:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el campo",
        variant: "destructive"
      });
      return false;
    }
  };

  // Actualizar parámetros por defecto
  const updateDefaultParameters = async (parameters: Partial<DefaultParameters>) => {
    setConfiguration(prev => prev ? {
      ...prev,
      default_parameters: { ...prev.default_parameters, ...parameters }
    } : null);
    setHasChanges(true);
  };

  // Actualizar reglas de validación
  const updateValidationRules = async (rules: ValidationRule[]) => {
    setConfiguration(prev => prev ? {
      ...prev,
      validation_rules: rules
    } : null);
    setHasChanges(true);
  };

  // Guardar configuración
  const saveConfiguration = async () => {
    try {
      // Por ahora, solo marcamos como guardado
      setHasChanges(false);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Error al guardar configuración' };
    }
  };

  // Restablecer configuración
  const resetConfiguration = () => {
    loadConfiguration();
    setHasChanges(false);
  };

  // Validar configuración
  const validateConfiguration = () => {
    if (!configuration) {
      return { isValid: false, errors: ['No hay configuración cargada'] };
    }
    
    const errors: string[] = [];
    
    // Validar campos personalizados
    configuration.custom_fields.forEach(field => {
      if (!field.field_key || !field.field_label) {
        errors.push(`Campo incompleto: ${field.field_label || 'Sin nombre'}`);
      }
    });
    
    return { isValid: errors.length === 0, errors };
  };

  return {
    configuration,
    isLoading,
    hasChanges,
    addCustomField,
    updateCustomField,
    removeCustomField,
    updateDefaultParameters,
    updateValidationRules,
    saveConfiguration,
    resetConfiguration,
    validateConfiguration,
    reloadConfiguration: loadConfiguration
  };
};
