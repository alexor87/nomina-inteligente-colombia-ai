
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
    console.log('🔄 useEmployeeDataPopulation: useEffect triggered');
    console.log('📋 Employee data received:', employee);
    console.log('📊 Employee ID:', employee?.id);
    console.log('🎯 Employee updated timestamp:', employee?.updatedAt);
    
    if (employee) {
      console.log('🔄 useEmployeeDataPopulation: STARTING to set form values from employee:', employee);
      console.log('📋 Employee fields available:', Object.keys(employee));
      console.log('🎯 Employee full data:', employee);
      console.log('📊 AFFILIATIONS DATA FROM DB (DETAILED):', {
        eps: { value: employee.eps, type: typeof employee.eps, isNull: employee.eps === null, isEmpty: employee.eps === '' },
        afp: { value: employee.afp, type: typeof employee.afp, isNull: employee.afp === null, isEmpty: employee.afp === '' },
        arl: { value: employee.arl, type: typeof employee.arl, isNull: employee.arl === null, isEmpty: employee.arl === '' },
        cajaCompensacion: { value: employee.cajaCompensacion, type: typeof employee.cajaCompensacion, isNull: employee.cajaCompensacion === null, isEmpty: employee.cajaCompensacion === '' },
        tipoCotizanteId: { value: employee.tipoCotizanteId, type: typeof employee.tipoCotizanteId, isNull: employee.tipoCotizanteId === null, isEmpty: employee.tipoCotizanteId === '' },
        subtipoCotizanteId: { value: employee.subtipoCotizanteId, type: typeof employee.subtipoCotizanteId, isNull: employee.subtipoCotizanteId === null, isEmpty: employee.subtipoCotizanteId === '' },
        regimenSalud: { value: (employee as any).regimenSalud, type: typeof (employee as any).regimenSalud },
        estadoAfiliacion: { value: employee.estadoAfiliacion, type: typeof employee.estadoAfiliacion }
      });
      
      // Batch all setValue operations to avoid multiple re-renders
      const updates: Array<[keyof EmployeeFormData, any]> = [];
      
      // Helper function to handle null/undefined values for text fields
      const handleTextValue = (value: any) => {
        if (value === null || value === undefined) return '';
        return String(value).trim();
      };
      
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
      updates.push(['fechaNacimiento', handleTextValue((employee as any).fechaNacimiento)]);
      updates.push(['direccion', handleTextValue((employee as any).direccion)]);
      updates.push(['ciudad', handleTextValue((employee as any).ciudad)]);
      updates.push(['departamento', handleTextValue((employee as any).departamento)]);
      
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
      updates.push(['cargo', handleTextValue(employee.cargo)]);
      updates.push(['codigoCIIU', handleTextValue((employee as any).codigoCIIU)]);
      updates.push(['nivelRiesgoARL', employee.nivelRiesgoARL || 'I']);
      updates.push(['estado', employee.estado || 'activo']);
      updates.push(['centroCostos', handleTextValue((employee as any).centroCostos)]);
      
      // Detalles del Contrato
      updates.push(['fechaFirmaContrato', handleTextValue((employee as any).fechaFirmaContrato)]);
      updates.push(['fechaFinalizacionContrato', handleTextValue((employee as any).fechaFinalizacionContrato)]);
      updates.push(['tipoJornada', (employee as any).tipoJornada || 'completa']);
      updates.push(['diasTrabajo', (employee as any).diasTrabajo || 30]);
      updates.push(['horasTrabajo', (employee as any).horasTrabajo || 8]);
      updates.push(['beneficiosExtralegales', (employee as any).beneficiosExtralegales || false]);
      updates.push(['clausulasEspeciales', handleTextValue((employee as any).clausulasEspeciales)]);
      
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
      
      // Afiliaciones - CRITICAL SECTION WITH DETAILED LOGGING
      console.log('🚨 CRITICAL: Processing affiliations data...');
      console.log('📊 Raw affiliations from employee object:');
      console.log('  - EPS:', { value: employee.eps, type: typeof employee.eps, isNull: employee.eps === null });
      console.log('  - AFP:', { value: employee.afp, type: typeof employee.afp, isNull: employee.afp === null });
      console.log('  - ARL:', { value: employee.arl, type: typeof employee.arl, isNull: employee.arl === null });
      console.log('  - CajaCompensacion:', { value: employee.cajaCompensacion, type: typeof employee.cajaCompensacion, isNull: employee.cajaCompensacion === null });
      console.log('  - TipoCotizanteId:', { value: employee.tipoCotizanteId, type: typeof employee.tipoCotizanteId, isNull: employee.tipoCotizanteId === null });
      console.log('  - SubtipoCotizanteId:', { value: employee.subtipoCotizanteId, type: typeof employee.subtipoCotizanteId, isNull: employee.subtipoCotizanteId === null });
      
      // Process affiliations with explicit null/empty handling
      const epsValue = handleTextValue(employee.eps);
      const afpValue = handleTextValue(employee.afp);
      const arlValue = handleTextValue(employee.arl);
      const cajaCompensacionValue = handleTextValue(employee.cajaCompensacion);
      const tipoCotizanteIdValue = handleTextValue(employee.tipoCotizanteId);
      const subtipoCotizanteIdValue = handleTextValue(employee.subtipoCotizanteId);
      
      console.log('🔧 Processed affiliation values:');
      console.log('  - EPS processed:', epsValue);
      console.log('  - AFP processed:', afpValue);
      console.log('  - ARL processed:', arlValue);
      console.log('  - CajaCompensacion processed:', cajaCompensacionValue);
      console.log('  - TipoCotizanteId processed:', tipoCotizanteIdValue);
      console.log('  - SubtipoCotizanteId processed:', subtipoCotizanteIdValue);
      
      // Set affiliation values
      updates.push(['eps', epsValue]);
      updates.push(['afp', afpValue]);
      updates.push(['arl', arlValue]);
      updates.push(['cajaCompensacion', cajaCompensacionValue]);
      updates.push(['tipoCotizanteId', tipoCotizanteIdValue]);
      updates.push(['subtipoCotizanteId', subtipoCotizanteIdValue]);
      updates.push(['regimenSalud', (employee as any).regimenSalud || 'contributivo']);
      updates.push(['estadoAfiliacion', employee.estadoAfiliacion || 'pendiente']);
      
      // Apply all updates with detailed logging
      console.log('📦 Applying', updates.length, 'form updates...');
      updates.forEach(([field, value]) => {
        console.log(`🔧 Setting field "${field}" to:`, value, `(type: ${typeof value})`);
        setValue(field, value);
      });
      
      console.log('✅ useEmployeeDataPopulation: All form values set from employee data');
      console.log('🎯 FINAL AFFILIATIONS SET IN FORM:', {
        eps: epsValue,
        afp: afpValue,
        arl: arlValue,
        cajaCompensacion: cajaCompensacionValue,
        tipoCotizanteId: tipoCotizanteIdValue,
        subtipoCotizanteId: subtipoCotizanteIdValue
      });
      
      // Force trigger validation after setting values with a small delay
      setTimeout(() => {
        console.log('🔄 Triggering form validation...');
        trigger().then(() => {
          console.log('✅ Form validation completed');
        }).catch((error) => {
          console.error('❌ Form validation error:', error);
        });
      }, 200);
    } else {
      console.log('⚠️ useEmployeeDataPopulation: No employee data provided');
    }
  }, [employee, setValue, trigger]); // Keep employee as dependency to re-run when it changes
};
