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

    const testEmployeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> = {
      empresaId: companyId || '',
      cedula: `TEST${Date.now()}`,
      tipoDocumento: 'CC', // Make required
      nombre: 'Juan',
      apellido: 'Pérez',
      email: `test${Date.now()}@example.com`,
      salarioBase: 2500000,
      tipoSalario: 'mensual', // Add required field
      tipoContrato: 'indefinido', // Add required field
      fechaIngreso: new Date().toISOString().split('T')[0],
      estado: 'activo'
    };

    try {
      const result = await SecureEmployeeService.createEmployee(testEmployeeData);

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
