
import { useEffect } from 'react';
import { UseFormSetValue, UseFormTrigger } from 'react-hook-form';
import { Employee } from '@/types';
import { EmployeeFormData } from './types';

export const useEmployeeDataPopulation = (
  employee: Employee | undefined,
  setValue: UseFormSetValue<EmployeeFormData>,
  trigger: UseFormTrigger<EmployeeFormData>
) => {
  useEffect(() => {
    if (employee) {
      console.log('🔄 useEmployeeDataPopulation: STARTING to set form values from employee:', employee);
      console.log('📋 Employee fields available:', Object.keys(employee));
      console.log('🎯 Employee full data:', employee);
      
      // Batch all setValue operations to avoid multiple re-renders
      const updates: Array<[keyof EmployeeFormData, any]> = [];
      
      // Información Personal - Verificación detallada
      if (employee.cedula) {
        console.log('Setting cedula:', employee.cedula);
        updates.push(['cedula', employee.cedula]);
      }
      if (employee.tipoDocumento) {
        console.log('Setting tipoDocumento:', employee.tipoDocumento);
        updates.push(['tipoDocumento', employee.tipoDocumento]);
      }
      if (employee.nombre) {
        console.log('Setting nombre:', employee.nombre);
        updates.push(['nombre', employee.nombre]);
      }
      if ((employee as any).segundoNombre) {
        console.log('Setting segundoNombre:', (employee as any).segundoNombre);
        updates.push(['segundoNombre', (employee as any).segundoNombre]);
      }
      if (employee.apellido) {
        console.log('Setting apellido:', employee.apellido);
        updates.push(['apellido', employee.apellido]);
      }
      if (employee.email) {
        console.log('Setting email:', employee.email);
        updates.push(['email', employee.email]);
      }
      if (employee.telefono) {
        console.log('Setting telefono:', employee.telefono);
        updates.push(['telefono', employee.telefono]);
      }
      
      // Campos extendidos de información personal
      updates.push(['sexo', (employee as any).sexo || 'M']);
      updates.push(['fechaNacimiento', (employee as any).fechaNacimiento || '']);
      updates.push(['direccion', (employee as any).direccion || '']);
      updates.push(['ciudad', (employee as any).ciudad || '']);
      updates.push(['departamento', (employee as any).departamento || '']);
      
      // Información Laboral
      if (employee.salarioBase) {
        console.log('Setting salarioBase:', employee.salarioBase);
        updates.push(['salarioBase', employee.salarioBase]);
      }
      if (employee.tipoContrato) {
        console.log('Setting tipoContrato:', employee.tipoContrato);
        updates.push(['tipoContrato', employee.tipoContrato]);
      }
      if (employee.fechaIngreso) {
        console.log('Setting fechaIngreso:', employee.fechaIngreso);
        updates.push(['fechaIngreso', employee.fechaIngreso]);
      }
      
      updates.push(['periodicidadPago', (employee as any).periodicidadPago || 'mensual']);
      updates.push(['cargo', employee.cargo || '']);
      updates.push(['codigoCIIU', (employee as any).codigoCIIU || '']);
      updates.push(['nivelRiesgoARL', employee.nivelRiesgoARL || 'I']);
      updates.push(['estado', employee.estado || 'activo']);
      updates.push(['centroCostos', (employee as any).centroCostos || '']);
      
      // Detalles del Contrato
      updates.push(['fechaFirmaContrato', (employee as any).fechaFirmaContrato || '']);
      updates.push(['fechaFinalizacionContrato', (employee as any).fechaFinalizacionContrato || '']);
      updates.push(['tipoJornada', (employee as any).tipoJornada || 'completa']);
      updates.push(['diasTrabajo', (employee as any).diasTrabajo || 30]);
      updates.push(['horasTrabajo', (employee as any).horasTrabajo || 8]);
      updates.push(['beneficiosExtralegales', (employee as any).beneficiosExtralegales || false]);
      updates.push(['clausulasEspeciales', (employee as any).clausulasEspeciales || '']);
      
      // Información Bancaria
      if (employee.banco) {
        console.log('Setting banco:', employee.banco);
        updates.push(['banco', employee.banco]);
      }
      updates.push(['tipoCuenta', employee.tipoCuenta || 'ahorros']);
      if (employee.numeroCuenta) {
        console.log('Setting numeroCuenta:', employee.numeroCuenta);
        updates.push(['numeroCuenta', employee.numeroCuenta]);
      }
      if (employee.titularCuenta) {
        console.log('Setting titularCuenta:', employee.titularCuenta);
        updates.push(['titularCuenta', employee.titularCuenta]);
      }
      updates.push(['formaPago', (employee as any).formaPago || 'dispersion']);
      
      // Afiliaciones
      if (employee.eps) {
        console.log('Setting eps:', employee.eps);
        updates.push(['eps', employee.eps]);
      }
      if (employee.afp) {
        console.log('Setting afp:', employee.afp);
        updates.push(['afp', employee.afp]);
      }
      if (employee.arl) {
        console.log('Setting arl:', employee.arl);
        updates.push(['arl', employee.arl]);
      }
      if (employee.cajaCompensacion) {
        console.log('Setting cajaCompensacion:', employee.cajaCompensacion);
        updates.push(['cajaCompensacion', employee.cajaCompensacion]);
      }
      
      updates.push(['tipoCotizanteId', employee.tipoCotizanteId || '']);
      updates.push(['subtipoCotizanteId', employee.subtipoCotizanteId || '']);
      updates.push(['regimenSalud', (employee as any).regimenSalud || 'contributivo']);
      updates.push(['estadoAfiliacion', employee.estadoAfiliacion || 'pendiente']);
      
      // Apply all updates
      console.log('📦 Applying', updates.length, 'form updates...');
      updates.forEach(([field, value]) => {
        setValue(field, value);
      });
      
      console.log('✅ useEmployeeDataPopulation: All form values set from employee data');
      
      // Force trigger validation after setting values
      setTimeout(() => {
        trigger();
        console.log('🔄 Form validation triggered');
      }, 100);
    } else {
      console.log('⚠️ useEmployeeDataPopulation: No employee data provided');
    }
  }, [employee, setValue, trigger]);
};
