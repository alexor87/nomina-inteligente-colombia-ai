import React from 'react';
import { useEmployeeFormSubmission } from '@/hooks/useEmployeeFormSubmission';
import { Button } from '@/components/ui/button';

export const EmployeeCreationTest = () => {
  const { submitEmployeeForm, isSubmitting } = useEmployeeFormSubmission();

  const testEmployee = {
    cedula: '1234567890',
    tipoDocumento: 'CC' as const,
    nombre: 'Juan',
    apellido: 'Pérez',
    email: 'juan.perez@test.com',
    telefono: '3001234567',
    salarioBase: 2500000,
    tipoContrato: 'indefinido' as const,
    fechaIngreso: '2024-01-15',
    periodicidadPago: 'mensual' as const,
    estado: 'activo' as const,
    eps: 'Sura EPS',
    afp: 'Protección',
    arl: 'Sura ARL',
    cajaCompensacion: 'Compensar',
    estadoAfiliacion: 'completa' as const,
    // Required properties from schema
    diasTrabajo: 30,
    horasTrabajo: 8,
    beneficiosExtralegales: false,
    tipoCuenta: 'ahorros' as const,
    formaPago: 'dispersion' as const,
    regimenSalud: 'contributivo' as const
  };

  const handleCreateEmployee = async () => {
    await submitEmployeeForm(testEmployee, 'test-company');
  };

  return (
    <div>
      <Button onClick={handleCreateEmployee} disabled={isSubmitting}>
        {isSubmitting ? 'Creando...' : 'Crear Empleado de Prueba'}
      </Button>
    </div>
  );
};
