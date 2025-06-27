
import { useEffect, useMemo } from 'react';
import { UseFormSetValue, UseFormTrigger } from 'react-hook-form';
import { Employee } from '@/types';
import { EmployeeFormData } from './types';

export const useEmployeeDataPopulation = (
  employee: Employee | undefined,
  setValue: UseFormSetValue<EmployeeFormData>,
  trigger: UseFormTrigger<EmployeeFormData>
) => {
  // Memoize the employee ID and timestamp to prevent unnecessary effects
  const employeeKey = useMemo(() => {
    if (!employee) return null;
    return `${employee.id}-${employee.updatedAt}`;
  }, [employee?.id, employee?.updatedAt]);

  useEffect(() => {
    console.log('🔄 useEmployeeDataPopulation: useEffect triggered');
    console.log('📋 Employee key:', employeeKey);
    
    if (!employee || !employeeKey) {
      console.log('⚠️ useEmployeeDataPopulation: No employee data provided');
      return;
    }

    console.log('🔄 useEmployeeDataPopulation: STARTING to set form values from employee:', employee);
    console.log('📊 AFFILIATIONS DATA FROM DB (DETAILED):', {
      eps: { value: employee.eps, type: typeof employee.eps, isNull: employee.eps === null, isEmpty: employee.eps === '' },
      afp: { value: employee.afp, type: typeof employee.afp, isNull: employee.afp === null, isEmpty: employee.afp === '' },
      arl: { value: employee.arl, type: typeof employee.arl, isNull: employee.arl === null, isEmpty: employee.arl === '' },
      cajaCompensacion: { value: employee.cajaCompensacion, type: typeof employee.cajaCompensacion, isNull: employee.cajaCompensacion === null, isEmpty: employee.cajaCompensacion === '' },
      tipoCotizanteId: { value: employee.tipoCotizanteId, type: typeof employee.tipoCotizanteId, isNull: employee.tipoCotizanteId === null, isEmpty: employee.tipoCotizanteId === '' },
      subtipoCotizanteId: { value: employee.subtipoCotizanteId, type: typeof employee.subtipoCotizanteId, isNull: employee.subtipoCotizanteId === null, isEmpty: employee.subtipoCotizanteId === '' }
    });
    
    // Helper functions
    const handleTextValue = (value: any) => {
      if (value === null || value === undefined) return '';
      return String(value).trim();
    };
    
    const handleAffiliationValue = (value: any) => {
      if (value === null || value === undefined) return '';
      return String(value).trim();
    };
    
    // Batch all setValue operations
    const setFormValues = () => {
      // Basic Information
      setValue('cedula', employee.cedula);
      setValue('tipoDocumento', employee.tipoDocumento || 'CC');
      setValue('nombre', employee.nombre);
      setValue('segundoNombre', (employee as any).segundoNombre || '');
      setValue('apellido', employee.apellido);
      setValue('email', employee.email || '');
      setValue('telefono', employee.telefono || '');
      
      // Extended personal information
      setValue('sexo', (employee as any).sexo || 'M');
      setValue('fechaNacimiento', handleTextValue((employee as any).fechaNacimiento));
      setValue('direccion', handleTextValue((employee as any).direccion));
      setValue('ciudad', handleTextValue((employee as any).ciudad));
      setValue('departamento', handleTextValue((employee as any).departamento));
      
      // Labor Information
      setValue('salarioBase', employee.salarioBase || 0);
      setValue('tipoContrato', employee.tipoContrato || 'indefinido');
      setValue('fechaIngreso', employee.fechaIngreso || '');
      setValue('periodicidadPago', (employee as any).periodicidadPago || 'mensual');
      setValue('cargo', handleTextValue(employee.cargo));
      setValue('codigoCIIU', handleTextValue((employee as any).codigoCIIU));
      setValue('nivelRiesgoARL', employee.nivelRiesgoARL || 'I');
      setValue('estado', employee.estado || 'activo');
      setValue('centroCostos', handleTextValue((employee as any).centroCostos));
      
      // Contract details
      setValue('fechaFirmaContrato', handleTextValue((employee as any).fechaFirmaContrato));
      setValue('fechaFinalizacionContrato', handleTextValue((employee as any).fechaFinalizacionContrato));
      setValue('tipoJornada', (employee as any).tipoJornada || 'completa');
      setValue('diasTrabajo', (employee as any).diasTrabajo || 30);
      setValue('horasTrabajo', (employee as any).horasTrabajo || 8);
      setValue('beneficiosExtralegales', (employee as any).beneficiosExtralegales || false);
      setValue('clausulasEspeciales', handleTextValue((employee as any).clausulasEspeciales));
      
      // Banking Information
      setValue('banco', employee.banco || '');
      setValue('tipoCuenta', employee.tipoCuenta || 'ahorros');
      setValue('numeroCuenta', employee.numeroCuenta || '');
      setValue('titularCuenta', employee.titularCuenta || '');
      setValue('formaPago', (employee as any).formaPago || 'dispersion');
      
      // Affiliations - CRITICAL SECTION
      console.log('🚨 CRITICAL: Processing affiliations data...');
      setValue('eps', handleAffiliationValue(employee.eps));
      setValue('afp', handleAffiliationValue(employee.afp));
      setValue('arl', handleAffiliationValue(employee.arl));
      setValue('cajaCompensacion', handleAffiliationValue(employee.cajaCompensacion));
      setValue('tipoCotizanteId', handleAffiliationValue(employee.tipoCotizanteId));
      setValue('subtipoCotizanteId', handleAffiliationValue(employee.subtipoCotizanteId));
      setValue('regimenSalud', (employee as any).regimenSalud || 'contributivo');
      setValue('estadoAfiliacion', employee.estadoAfiliacion || 'pendiente');
      
      console.log('✅ useEmployeeDataPopulation: All form values set from employee data');
    };

    // Set all form values at once
    setFormValues();
    
    // Trigger validation after a brief delay to ensure all values are set
    const validateForm = async () => {
      try {
        console.log('🔄 Triggering form validation...');
        await trigger();
        console.log('✅ Form validation completed');
      } catch (error) {
        console.error('❌ Form validation error:', error);
      }
    };

    const timeoutId = setTimeout(validateForm, 100);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [employeeKey, setValue, trigger]); // Use memoized employeeKey instead of employee object
};
