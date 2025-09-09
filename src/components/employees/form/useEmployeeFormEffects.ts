
import { useEffect } from 'react';
import { UseFormSetValue } from 'react-hook-form';
import { EmployeeFormData } from './types';

export const useEmployeeFormEffects = (
  watchedValues: EmployeeFormData,
  setValue: UseFormSetValue<EmployeeFormData>,
  setCompletionPercentage: (percentage: number) => void
) => {
  // Auto-fill titular cuenta
  useEffect(() => {
    if (watchedValues.nombre && watchedValues.apellido) {
      const fullName = watchedValues.segundoNombre 
        ? `${watchedValues.nombre} ${watchedValues.segundoNombre} ${watchedValues.apellido}`
        : `${watchedValues.nombre} ${watchedValues.apellido}`;
      setValue('titularCuenta', fullName);
    }
  }, [watchedValues.nombre, watchedValues.segundoNombre, watchedValues.apellido, setValue]);

  // Calculate completion percentage
  useEffect(() => {
    const requiredFields = [
      'cedula', 'tipoDocumento', 'nombre', 'apellido', 'salarioBase', 
      'tipoContrato', 'fechaIngreso', 'periodicidadPago'
    ];
    
    const completedFields = requiredFields.filter(field => {
      const value = watchedValues[field as keyof EmployeeFormData];
      return value !== '' && value !== null && value !== undefined;
    });
    
    setCompletionPercentage(Math.round((completedFields.length / requiredFields.length) * 100));
  }, [watchedValues, setCompletionPercentage]);
};
