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
      
      // Helper function to handle null/undefined values for regular text fields
      const handleTextValue = (value: any) => {
        if (value === null || value === undefined) return '';
        return String(value).trim();
      };

      // NEW: Helper function specifically for affiliation fields - keeps actual values
      const handleAffiliationValue = (value: any) => {
        // For affiliations, only convert to empty string if it's actually null/undefined
        // Keep the actual string values as they are
        if (value === null || value === undefined) return '';
        return String(value).trim();
      };
      
      // Información Personal - Verificación detallada
      if (employee.cedula) {
        console.log('✅ Setting cedula:', employee.cedula);
        updates.push(['cedula', employee.cedula]);
      }
      if (employee.tipoDocumento) {
        console.log('✅ Setting tipoDocumento:', employee.tipoDocumento);
        updates.push(['tipoDocumento', employee.tipoDocumento]);
      }
      if (employee.nombre) {
        console.log('✅ Setting nombre:', employee.nombre);
        updates.push(['nombre', employee.nombre]);
      }
      if ((employee as any).segundoNombre) {
        console.log('✅ Setting segundoNombre:', (employee as any).segundoNombre);
        updates.push(['segundoNombre', (employee as any).segundoNombre]);
      }
      if (employee.apellido) {
        console.log('✅ Setting apellido:', employee.apellido);
        updates.push(['apellido', employee.apellido]);
      }
      if (employee.email) {
        console.log('✅ Setting email:', employee.email);
        updates.push(['email', employee.email]);
      }
      if (employee.telefono) {
        console.log('✅ Setting telefono:', employee.telefono);
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
        console.log('✅ Setting salarioBase:', employee.salarioBase);
        updates.push(['salarioBase', employee.salarioBase]);
      }
      if (employee.tipoContrato) {
        console.log('✅ Setting tipoContrato:', employee.tipoContrato);
        updates.push(['tipoContrato', employee.tipoContrato]);
      }
      if (employee.fechaIngreso) {
        console.log('✅ Setting fechaIngreso:', employee.fechaIngreso);
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
        console.log('✅ Setting banco:', employee.banco);
        updates.push(['banco', employee.banco]);
      }
      updates.push(['tipoCuenta', employee.tipoCuenta || 'ahorros']);
      if (employee.numeroCuenta) {
        console.log('✅ Setting numeroCuenta:', employee.numeroCuenta);
        updates.push(['numeroCuenta', employee.numeroCuenta]);
      }
      if (employee.titularCuenta) {
        console.log('✅ Setting titularCuenta:', employee.titularCuenta);
        updates.push(['titularCuenta', employee.titularCuenta]);
      }
      updates.push(['formaPago', (employee as any).formaPago || 'dispersion']);
      
      // Afiliaciones - CRITICAL SECTION WITH IMPROVED LOGIC
      console.log('🚨 CRITICAL: Processing affiliations data with improved logic...');
      console.log('📊 Raw affiliations from employee object:');
      console.log('  - EPS:', { value: employee.eps, type: typeof employee.eps, isNull: employee.eps === null, hasValue: !!employee.eps });
      console.log('  - AFP:', { value: employee.afp, type: typeof employee.afp, isNull: employee.afp === null, hasValue: !!employee.afp });
      console.log('  - ARL:', { value: employee.arl, type: typeof employee.arl, isNull: employee.arl === null, hasValue: !!employee.arl });
      console.log('  - CajaCompensacion:', { value: employee.cajaCompensacion, type: typeof employee.cajaCompensacion, isNull: employee.cajaCompensacion === null, hasValue: !!employee.cajaCompensacion });
      console.log('  - TipoCotizanteId:', { value: employee.tipoCotizanteId, type: typeof employee.tipoCotizanteId, isNull: employee.tipoCotizanteId === null, hasValue: !!employee.tipoCotizanteId });
      console.log('  - SubtipoCotizanteId:', { value: employee.subtipoCotizanteId, type: typeof employee.subtipoCotizanteId, isNull: employee.subtipoCotizanteId === null, hasValue: !!employee.subtipoCotizanteId });
      
      // Process affiliations with improved logic - only set if there's an actual value
      // EPS
      if (employee.eps !== null && employee.eps !== undefined) {
        const epsValue = handleAffiliationValue(employee.eps);
        console.log('✅ Setting EPS to:', epsValue);
        updates.push(['eps', epsValue]);
      } else {
        console.log('⚠️ EPS is null/undefined, setting empty string');
        updates.push(['eps', '']);
      }

      // AFP
      if (employee.afp !== null && employee.afp !== undefined) {
        const afpValue = handleAffiliationValue(employee.afp);
        console.log('✅ Setting AFP to:', afpValue);
        updates.push(['afp', afpValue]);
      } else {
        console.log('⚠️ AFP is null/undefined, setting empty string');
        updates.push(['afp', '']);
      }

      // ARL
      if (employee.arl !== null && employee.arl !== undefined) {
        const arlValue = handleAffiliationValue(employee.arl);
        console.log('✅ Setting ARL to:', arlValue);
        updates.push(['arl', arlValue]);
      } else {
        console.log('⚠️ ARL is null/undefined, setting empty string');
        updates.push(['arl', '']);
      }

      // Caja de Compensación
      if (employee.cajaCompensacion !== null && employee.cajaCompensacion !== undefined) {
        const cajaValue = handleAffiliationValue(employee.cajaCompensacion);
        console.log('✅ Setting CajaCompensacion to:', cajaValue);
        updates.push(['cajaCompensacion', cajaValue]);
      } else {
        console.log('⚠️ CajaCompensacion is null/undefined, setting empty string');
        updates.push(['cajaCompensacion', '']);
      }

      // Tipo Cotizante ID
      if (employee.tipoCotizanteId !== null && employee.tipoCotizanteId !== undefined) {
        const tipoValue = handleAffiliationValue(employee.tipoCotizanteId);
        console.log('✅ Setting TipoCotizanteId to:', tipoValue);
        updates.push(['tipoCotizanteId', tipoValue]);
      } else {
        console.log('⚠️ TipoCotizanteId is null/undefined, setting empty string');
        updates.push(['tipoCotizanteId', '']);
      }

      // Subtipo Cotizante ID
      if (employee.subtipoCotizanteId !== null && employee.subtipoCotizanteId !== undefined) {
        const subtipoValue = handleAffiliationValue(employee.subtipoCotizanteId);
        console.log('✅ Setting SubtipoCotizanteId to:', subtipoValue);
        updates.push(['subtipoCotizanteId', subtipoValue]);
      } else {
        console.log('⚠️ SubtipoCotizanteId is null/undefined, setting empty string');
        updates.push(['subtipoCotizanteId', '']);
      }

      // Other affiliation fields
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
        eps: updates.find(([field]) => field === 'eps')?.[1],
        afp: updates.find(([field]) => field === 'afp')?.[1],
        arl: updates.find(([field]) => field === 'arl')?.[1],
        cajaCompensacion: updates.find(([field]) => field === 'cajaCompensacion')?.[1],
        tipoCotizanteId: updates.find(([field]) => field === 'tipoCotizanteId')?.[1],
        subtipoCotizanteId: updates.find(([field]) => field === 'subtipoCotizanteId')?.[1]
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
  }, [employee?.id, employee?.updatedAt, setValue, trigger]); // Added specific dependencies
};
