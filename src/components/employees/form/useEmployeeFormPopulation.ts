
import { useEffect } from 'react';
import { UseFormSetValue, UseFormTrigger } from 'react-hook-form';
import { Employee } from '@/types';
import { EmployeeFormData } from './types';

export const useEmployeeFormPopulation = (
  employee: Employee | null,
  setValue: UseFormSetValue<EmployeeFormData>,
  trigger: UseFormTrigger<EmployeeFormData>
) => {
  useEffect(() => {
    if (!employee) return;

    console.log('🔄 Populating form with employee data:', employee.id);

    // Función helper para manejar valores null/undefined
    const safeValue = (value: any, defaultValue: any = '') => {
      if (value === null || value === undefined) return defaultValue;
      return value;
    };

    // Poblar todos los campos del formulario
    setValue('cedula', safeValue(employee.cedula));
    setValue('tipoDocumento', safeValue(employee.tipoDocumento, 'CC'));
    setValue('nombre', safeValue(employee.nombre));
    setValue('segundoNombre', safeValue(employee.segundoNombre));
    setValue('apellido', safeValue(employee.apellido));
    setValue('email', safeValue(employee.email));
    setValue('telefono', safeValue(employee.telefono));
    setValue('salarioBase', safeValue(employee.salarioBase, 0));
    setValue('tipoContrato', safeValue(employee.tipoContrato, 'indefinido'));
    setValue('fechaIngreso', safeValue(employee.fechaIngreso));
    setValue('periodicidadPago', safeValue(employee.periodicidadPago, 'mensual'));
    setValue('cargo', safeValue(employee.cargo));
    setValue('codigoCIIU', safeValue(employee.codigoCIIU));
    setValue('nivelRiesgoARL', safeValue(employee.nivelRiesgoARL, 'I'));
    setValue('estado', safeValue(employee.estado, 'activo'));
    setValue('centroCostos', safeValue(employee.centroCostos));
    setValue('fechaFirmaContrato', safeValue(employee.fechaFirmaContrato));
    setValue('fechaFinalizacionContrato', safeValue(employee.fechaFinalizacionContrato));
    setValue('tipoJornada', safeValue(employee.tipoJornada, 'completa'));
    setValue('diasTrabajo', safeValue(employee.diasTrabajo, 30));
    setValue('horasTrabajo', safeValue(employee.horasTrabajo, 8));
    setValue('beneficiosExtralegales', safeValue(employee.beneficiosExtralegales, false));
    setValue('clausulasEspeciales', safeValue(employee.clausulasEspeciales));
    setValue('banco', safeValue(employee.banco));
    setValue('tipoCuenta', safeValue(employee.tipoCuenta, 'ahorros'));
    setValue('numeroCuenta', safeValue(employee.numeroCuenta));
    setValue('titularCuenta', safeValue(employee.titularCuenta));
    setValue('formaPago', safeValue(employee.formaPago, 'dispersion'));
    setValue('eps', safeValue(employee.eps));
    setValue('afp', safeValue(employee.afp));
    setValue('arl', safeValue(employee.arl));
    setValue('cajaCompensacion', safeValue(employee.cajaCompensacion));
    setValue('tipoCotizanteId', safeValue(employee.tipoCotizanteId));
    setValue('subtipoCotizanteId', safeValue(employee.subtipoCotizanteId));
    setValue('regimenSalud', safeValue(employee.regimenSalud, 'contributivo'));
    setValue('estadoAfiliacion', safeValue(employee.estadoAfiliacion, 'pendiente'));
    setValue('sexo', safeValue(employee.sexo, 'M'));
    setValue('fechaNacimiento', safeValue(employee.fechaNacimiento));
    setValue('direccion', safeValue(employee.direccion));
    setValue('ciudad', safeValue(employee.ciudad));
    setValue('departamento', safeValue(employee.departamento));

    // Trigger validation después de poblar los datos
    trigger();

    console.log('✅ Form populated with employee data');
  }, [employee, setValue, trigger]);
};
