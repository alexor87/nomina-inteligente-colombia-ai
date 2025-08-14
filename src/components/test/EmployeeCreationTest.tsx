import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Employee } from '@/types';
import { SecureEmployeeService } from '@/services/SecureEmployeeService';

const EmployeeCreationTest = () => {
  const [companyId, setCompanyId] = useState('');
  const { toast } = useToast();

  const handleCreateEmployee = async () => {
    if (!companyId) {
      toast({
        title: 'Error',
        description: 'Please enter a company ID.',
        variant: 'destructive',
      });
      return;
    }

    const newEmployee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> = {
      empresaId: companyId || '',
      cedula: `12345${Date.now()}`,
      tipoDocumento: 'CC', // Made required
      nombre: 'Juan',
      apellido: 'Pérez',
      email: 'juan.perez@email.com',
      telefono: '123456789',
      sexo: 'M',
      fechaNacimiento: '1990-01-01',
      direccion: 'Calle 123',
      ciudad: 'Bogotá',
      departamento: 'Cundinamarca',
      salarioBase: 2500000,
      tipoSalario: 'mensual', // Made required
      tipoContrato: 'indefinido',
      fechaIngreso: new Date().toISOString().split('T')[0],
      periodicidadPago: 'mensual',
      cargo: 'Desarrollador',
      codigoCIIU: '6201',
      nivelRiesgoARL: 'I',
      estado: 'activo',
      centroCostos: 'CC001',
      tipoJornada: 'completa',
      diasTrabajo: 30,
      horasTrabajo: 8,
      beneficiosExtralegales: false,
      banco: 'Bancolombia',
      tipoCuenta: 'ahorros',
      numeroCuenta: '123456789',
      titularCuenta: 'Juan Pérez',
      formaPago: 'dispersion',
      eps: 'Sanitas',
      afp: 'Protección',
      arl: 'ARL Sura',
      cajaCompensacion: 'Compensar',
      tipoCotizanteId: '01',
      subtipoCotizanteId: '00',
      regimenSalud: 'contributivo',
      estadoAfiliacion: 'completa'
    };

    try {
      const result = await SecureEmployeeService.createEmployee(newEmployee);

      if (result.success && result.data) {
        toast({
          title: 'Success',
          description: `Employee created with ID: ${result.data.id}`,
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create employee',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <div>
        <Label htmlFor="companyId">Company ID:</Label>
        <Input
          id="companyId"
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          placeholder="Enter company ID"
        />
      </div>
      <Button onClick={handleCreateEmployee}>Create Employee</Button>
    </div>
  );
};

export default EmployeeCreationTest;
