
import { useState, useEffect } from 'react';
import { EmployeeGlobalConfiguration, CustomField, ValidationRules, DefaultParameters } from '@/types/employee-config';

const STORAGE_KEY = 'employee_global_configuration';

const getDefaultConfiguration = (): EmployeeGlobalConfiguration => ({
  customFields: [],
  validationRules: {
    allowWithoutEPS: false,
    allowWithoutCajaCompensacion: false,
    allowPendingAffiliations: false,
    validateARLRiskLevel: true,
    allowEditBaseSalary: true
  },
  defaultParameters: {
    defaultContractType: 'indefinido',
    standardWorkingHours: 8,
    suggestedPaymentPeriodicity: 'mensual',
    suggestedCostCenter: '',
    defaultARLRiskLevel: 'I'
  }
});

export const useEmployeeGlobalConfiguration = () => {
  const [configuration, setConfiguration] = useState<EmployeeGlobalConfiguration>(getDefaultConfiguration());
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const config = JSON.parse(stored);
        setConfiguration({ ...getDefaultConfiguration(), ...config });
      }
    } catch (error) {
      console.error('Error loading employee configuration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfiguration = async () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(configuration));
      setHasChanges(false);
      return { success: true };
    } catch (error) {
      console.error('Error saving employee configuration:', error);
      return { success: false, error: 'Error al guardar la configuración' };
    }
  };

  const addCustomField = (field: Omit<CustomField, 'id'>) => {
    const newField: CustomField = {
      ...field,
      id: Date.now().toString()
    };
    
    setConfiguration(prev => ({
      ...prev,
      customFields: [...prev.customFields, newField]
    }));
    setHasChanges(true);
  };

  const updateCustomField = (id: string, updates: Partial<CustomField>) => {
    setConfiguration(prev => ({
      ...prev,
      customFields: prev.customFields.map(field =>
        field.id === id ? { ...field, ...updates } : field
      )
    }));
    setHasChanges(true);
  };

  const removeCustomField = (id: string) => {
    setConfiguration(prev => ({
      ...prev,
      customFields: prev.customFields.filter(field => field.id !== id)
    }));
    setHasChanges(true);
  };

  const updateValidationRules = (rules: Partial<ValidationRules>) => {
    setConfiguration(prev => ({
      ...prev,
      validationRules: { ...prev.validationRules, ...rules }
    }));
    setHasChanges(true);
  };

  const updateDefaultParameters = (params: Partial<DefaultParameters>) => {
    setConfiguration(prev => ({
      ...prev,
      defaultParameters: { ...prev.defaultParameters, ...params }
    }));
    setHasChanges(true);
  };

  const resetConfiguration = () => {
    setConfiguration(getDefaultConfiguration());
    setHasChanges(false);
  };

  const validateConfiguration = () => {
    const errors: string[] = [];
    
    // Validar que los campos personalizados tengan nombres únicos
    const fieldNames = configuration.customFields.map(f => f.name.toLowerCase());
    const duplicates = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      errors.push('Existen campos personalizados con nombres duplicados');
    }

    // Validar que los campos de lista tengan opciones
    const listFieldsWithoutOptions = configuration.customFields.filter(
      f => f.type === 'list' && (!f.options || f.options.length === 0)
    );
    if (listFieldsWithoutOptions.length > 0) {
      errors.push('Los campos de lista deben tener al menos una opción');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  return {
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
  };
};
