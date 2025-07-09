
import { useEffect } from 'react';
import { UseFormSetValue, UseFormTrigger } from 'react-hook-form';
import { EmployeeFormData } from './types';
import { populateFormWithEmployee } from './useEmployeeFormDefaults';
import { EmployeeUnified } from '@/types/employee-unified';

export const useEmployeeFormPopulation = (
  employee: EmployeeUnified | null,
  setValue: UseFormSetValue<EmployeeFormData>,
  trigger: UseFormTrigger<EmployeeFormData>
) => {
  useEffect(() => {
    if (!employee) {
      console.log('🔄 useEmployeeFormPopulation: No employee data, using defaults');
      return;
    }

    console.log('🔄 useEmployeeFormPopulation: Populating form with employee data:', employee.nombre, employee.apellido);
    
    // ✅ CORREGIDO: Usar async/await para manejar la consulta de vacaciones
    const populateForm = async () => {
      try {
        const formData = await populateFormWithEmployee(employee);
        
        // Set all form values
        Object.entries(formData).forEach(([key, value]) => {
          setValue(key as keyof EmployeeFormData, value);
        });

        // Trigger validation after setting values
        setTimeout(() => {
          trigger();
        }, 100);

        console.log('✅ useEmployeeFormPopulation: Form populated successfully with vacation data');
      } catch (error) {
        console.error('❌ useEmployeeFormPopulation: Error populating form:', error);
      }
    };
    
    populateForm();
  }, [employee, setValue, trigger]);
};
