
import { useState, useEffect } from 'react';
import { EmployeeConfiguration, CustomField, EmployeeChange, ARL_RISK_PERCENTAGES } from '@/types/employee-config';
import { SALARIO_MINIMO_2024 } from '@/constants';

const STORAGE_KEY = 'employee_configuration';

const getDefaultConfiguration = (): EmployeeConfiguration => ({
  personalData: {
    documentType: 'CC',
    documentNumber: '',
    firstName: '',
    lastName: '',
    birthDate: '',
    gender: 'M',
    civilStatus: 'Soltero',
    address: '',
    city: '',
    phone: '',
    personalEmail: ''
  },
  securitySocial: {
    eps: '',
    afp: '',
    cajaCompensacion: '',
    affiliateType: 'Dependiente',
    affiliationNumber: '',
    hasBeneficiaries: false
  },
  laborData: {
    position: '',
    contractType: 'indefinido',
    startDate: '',
    endDate: '',
    baseSalary: SALARIO_MINIMO_2024,
    costCenter: '',
    paymentPeriodicity: 'mensual',
    workdayHours: 8,
    workdayType: 'diurna',
    flexibleSchedule: false,
    arlRiskLevel: 'I'
  },
  employeeState: {
    status: 'Activo',
    includeInPayroll: true,
    allowSelfManagement: false
  },
  customFields: [],
  changeHistory: []
});

export const useEmployeeConfiguration = () => {
  const [configuration, setConfiguration] = useState<EmployeeConfiguration>(getDefaultConfiguration());
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

  const updatePersonalData = (data: Partial<EmployeeConfiguration['personalData']>) => {
    setConfiguration(prev => ({
      ...prev,
      personalData: { ...prev.personalData, ...data }
    }));
    setHasChanges(true);
  };

  const updateSecuritySocial = (data: Partial<EmployeeConfiguration['securitySocial']>) => {
    setConfiguration(prev => ({
      ...prev,
      securitySocial: { ...prev.securitySocial, ...data }
    }));
    setHasChanges(true);
  };

  const updateLaborData = (data: Partial<EmployeeConfiguration['laborData']>) => {
    setConfiguration(prev => ({
      ...prev,
      laborData: { ...prev.laborData, ...data }
    }));
    setHasChanges(true);
  };

  const updateEmployeeState = (data: Partial<EmployeeConfiguration['employeeState']>) => {
    setConfiguration(prev => ({
      ...prev,
      employeeState: { ...prev.employeeState, ...data }
    }));
    setHasChanges(true);
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

  const addChangeRecord = (field: string, previousValue: string, newValue: string) => {
    const change: EmployeeChange = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      field,
      previousValue,
      newValue,
      changedBy: 'Admin Usuario' // En una app real, esto vendría del contexto de usuario
    };

    setConfiguration(prev => ({
      ...prev,
      changeHistory: [change, ...prev.changeHistory]
    }));
  };

  const validateConfiguration = () => {
    const errors: string[] = [];

    // Validaciones de datos personales
    if (!configuration.personalData.documentNumber) {
      errors.push('Número de documento es obligatorio');
    }
    if (!configuration.personalData.firstName) {
      errors.push('Nombres son obligatorios');
    }
    if (!configuration.personalData.lastName) {
      errors.push('Apellidos son obligatorios');
    }

    // Validaciones de seguridad social (obligatorias para activar empleado)
    if (configuration.laborData.contractType !== 'prestacion') {
      if (!configuration.securitySocial.eps) {
        errors.push('EPS es obligatoria');
      }
      if (!configuration.securitySocial.afp) {
        errors.push('AFP es obligatoria');
      }
      if (!configuration.securitySocial.cajaCompensacion) {
        errors.push('Caja de compensación es obligatoria');
      }
    }

    // Validaciones laborales
    if (!configuration.laborData.position) {
      errors.push('Cargo es obligatorio');
    }
    if (!configuration.laborData.startDate) {
      errors.push('Fecha de ingreso es obligatoria');
    }
    if (!configuration.laborData.arlRiskLevel) {
      errors.push('Nivel de riesgo ARL es obligatorio');
    }

    // Validación de salario para aprendices
    if (configuration.laborData.contractType === 'aprendiz' && 
        configuration.laborData.baseSalary > SALARIO_MINIMO_2024) {
      errors.push('El salario de un aprendiz no puede exceder el salario mínimo');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const getARLPercentage = () => {
    return ARL_RISK_PERCENTAGES[configuration.laborData.arlRiskLevel] || 0;
  };

  const resetConfiguration = () => {
    setConfiguration(getDefaultConfiguration());
    setHasChanges(false);
  };

  const canActivateEmployee = () => {
    const validation = validateConfiguration();
    return validation.isValid;
  };

  return {
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
    addChangeRecord,
    saveConfiguration,
    validateConfiguration,
    getARLPercentage,
    resetConfiguration,
    canActivateEmployee
  };
};
