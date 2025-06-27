
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
    
    // Helper functions with improved null/undefined handling
    const handleTextValue = (value: any): string => {
      if (value === null || value === undefined || value === 'null') return '';
      return String(value).trim();
    };
    
    const handleOptionalValue = (value: any): string => {
      if (value === null || value === undefined || value === 'null' || value === '') return '';
      return String(value).trim();
    };

    const handleDateValue = (value: any): string => {
      if (value === null || value === undefined || value === 'null' || value === '') return '';
      return String(value);
    };

    const handleUuidValue = (value: any): string => {
      if (value === null || value === undefined || value === 'null' || value === '') return '';
      return String(value);
    };
    
    // Batch all setValue operations
    const setFormValues = () => {
      // Basic Information
      setValue('cedula', employee.cedula || '');
      setValue('tipoDocumento', employee.tipoDocumento || 'CC');
      setValue('nombre', employee.nombre || '');
      setValue('segundoNombre', handleOptionalValue((employee as any).segundoNombre));
      setValue('apellido', employee.apellido || '');
      setValue('email', handleOptionalValue(employee.email));
      setValue('telefono', handleOptionalValue(employee.telefono));
      
      // Extended personal information
      setValue('sexo', (employee as any).sexo || 'M');
      setValue('fechaNacimiento', handleDateValue((employee as any).fechaNacimiento));
      setValue('direccion', handleOptionalValue((employee as any).direccion));
      setValue('ciudad', handleOptionalValue((employee as any).ciudad));
      setValue('departamento', handleOptionalValue((employee as any).departamento));
      
      // Labor Information
      setValue('salarioBase', Number(employee.salarioBase) || 0);
      setValue('tipoContrato', employee.tipoContrato || 'indefinido');
      setValue('fechaIngreso', employee.fechaIngreso || '');
      setValue('periodicidadPago', (employee as any).periodicidadPago || 'mensual');
      setValue('cargo', handleOptionalValue(employee.cargo));
      setValue('codigoCIIU', handleOptionalValue((employee as any).codigoCIIU));
      setValue('nivelRiesgoARL', employee.nivelRiesgoARL || 'I');
      setValue('estado', employee.estado || 'activo');
      setValue('centroCostos', handleOptionalValue((employee as any).centroCostos));
      
      // Contract details
      setValue('fechaFirmaContrato', handleDateValue((employee as any).fechaFirmaContrato));
      setValue('fechaFinalizacionContrato', handleDateValue((employee as any).fechaFinalizacionContrato));
      setValue('tipoJornada', (employee as any).tipoJornada || 'completa');
      setValue('diasTrabajo', Number((employee as any).diasTrabajo) || 30);
      setValue('horasTrabajo', Number((employee as any).horasTrabajo) || 8);
      setValue('beneficiosExtralegales', Boolean((employee as any).beneficiosExtralegales));
      setValue('clausulasEspeciales', handleOptionalValue((employee as any).clausulasEspeciales));
      
      // Banking Information
      setValue('banco', handleOptionalValue(employee.banco));
      setValue('tipoCuenta', employee.tipoCuenta || 'ahorros');
      setValue('numeroCuenta', handleOptionalValue(employee.numeroCuenta));
      setValue('titularCuenta', handleOptionalValue(employee.titularCuenta));
      setValue('formaPago', (employee as any).formaPago || 'dispersion');
      
      // Affiliations - FIXED SECTION
      console.log('🚨 CRITICAL: Processing affiliations data...');
      setValue('eps', handleOptionalValue(employee.eps));
      setValue('afp', handleOptionalValue(employee.afp));
      setValue('arl', handleOptionalValue(employee.arl));
      setValue('cajaCompensacion', handleOptionalValue(employee.cajaCompensacion));
      
      // UUID fields with special handling
      setValue('tipoCotizanteId', handleUuidValue(employee.tipoCotizanteId));
      setValue('subtipoCotizanteId', handleUuidValue(employee.subtipoCotizanteId));
      
      setValue('regimenSalud', (employee as any).regimenSalud || 'contributivo');
      setValue('estadoAfiliacion', employee.estadoAfiliacion || 'pendiente');
      
      console.log('✅ useEmployeeDataPopulation: All form values set from employee data');
      console.log('🔍 AFFILIATIONS SET:', {
        eps: handleOptionalValue(employee.eps),
        afp: handleOptionalValue(employee.afp),
        arl: handleOptionalValue(employee.arl),
        cajaCompensacion: handleOptionalValue(employee.cajaCompensacion),
        tipoCotizanteId: handleUuidValue(employee.tipoCotizanteId),
        subtipoCotizanteId: handleUuidValue(employee.subtipoCotizanteId)
      });
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
