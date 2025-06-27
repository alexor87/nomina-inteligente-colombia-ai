
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
      console.log('📊 AFFILIATIONS DATA FROM DB:', {
        eps: employee.eps,
        afp: employee.afp,
        arl: employee.arl,
        cajaCompensacion: employee.cajaCompensacion,
        tipoCotizanteId: employee.tipoCotizanteId,
        subtipoCotizanteId: employee.subtipoCotizanteId,
        regimenSalud: (employee as any).regimenSalud,
        estadoAfiliacion: employee.estadoAfiliacion
      });
      
      // Batch all setValue operations to avoid multiple re-renders
      const updates: Array<[keyof EmployeeFormData, any]> = [];
      
      // Helper function to handle null/undefined values for text fields
      const handleTextValue = (value: any) => value || '';
      
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
      
      // Afiliaciones - MEJORADO EL MANEJO CON LOGGING DETALLADO
      console.log('🔄 Processing affiliations data...');
      console.log('📊 EPS value from DB:', employee.eps, 'Type:', typeof employee.eps);
      console.log('📊 AFP value from DB:', employee.afp, 'Type:', typeof employee.afp);
      console.log('📊 ARL value from DB:', employee.arl, 'Type:', typeof employee.arl);
      console.log('📊 CajaCompensacion value from DB:', employee.cajaCompensacion, 'Type:', typeof employee.cajaCompensacion);
      console.log('📊 TipoCotizanteId value from DB:', employee.tipoCotizanteId, 'Type:', typeof employee.tipoCotizanteId);
      console.log('📊 SubtipoCotizanteId value from DB:', employee.subtipoCotizanteId, 'Type:', typeof employee.subtipoCotizanteId);
      console.log('📊 RegimenSalud value from DB:', (employee as any).regimenSalud, 'Type:', typeof (employee as any).regimenSalud);
      console.log('📊 EstadoAfiliacion value from DB:', employee.estadoAfiliacion, 'Type:', typeof employee.estadoAfiliacion);
      
      // Manejo específico de afiliaciones con valores nulos convertidos a strings vacíos
      updates.push(['eps', handleTextValue(employee.eps)]);
      updates.push(['afp', handleTextValue(employee.afp)]);
      updates.push(['arl', handleTextValue(employee.arl)]);
      updates.push(['cajaCompensacion', handleTextValue(employee.cajaCompensacion)]);
      
      // Tipos de cotizante - manejar IDs como strings vacíos si son null
      updates.push(['tipoCotizanteId', handleTextValue(employee.tipoCotizanteId)]);
      updates.push(['subtipoCotizanteId', handleTextValue(employee.subtipoCotizanteId)]);
      updates.push(['regimenSalud', (employee as any).regimenSalud || 'contributivo']);
      updates.push(['estadoAfiliacion', employee.estadoAfiliacion || 'pendiente']);
      
      // Apply all updates
      console.log('📦 Applying', updates.length, 'form updates...');
      updates.forEach(([field, value]) => {
        console.log(`🔧 Setting ${field}:`, value);
        setValue(field, value);
      });
      
      console.log('✅ useEmployeeDataPopulation: All form values set from employee data');
      console.log('🎯 AFFILIATIONS SET IN FORM:', {
        eps: handleTextValue(employee.eps),
        afp: handleTextValue(employee.afp),
        arl: handleTextValue(employee.arl),
        cajaCompensacion: handleTextValue(employee.cajaCompensacion)
      });
      
      // Force trigger validation after setting values
      setTimeout(() => {
        trigger();
        console.log('🔄 Form validation triggered');
      }, 100);
    } else {
      console.log('⚠️ useEmployeeDataPopulation: No employee data provided');
    }
  }, [employee, setValue, trigger]); // Added employee.updatedAt as dependency to re-run when employee is updated
};
