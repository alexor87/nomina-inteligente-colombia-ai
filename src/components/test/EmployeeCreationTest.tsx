
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useEmployeeCRUD } from '@/hooks/useEmployeeCRUD';
import { Employee } from '@/types';

export const EmployeeCreationTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [cedula, setCedula] = useState('12345678');
  const [nombre, setNombre] = useState('Juan');
  const [apellido, setApellido] = useState('Pérez');
  const [salario, setSalario] = useState('1500000');
  
  const { toast } = useToast();
  const { createEmployee } = useEmployeeCRUD();

  const handleCreateEmployee = async () => {
    setIsLoading(true);
    
    try {
      const employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> = {
        empresaId: 'test-company-id',
        cedula,
        tipoDocumento: 'CC',
        nombre,
        apellido,
        email: `${nombre.toLowerCase()}.${apellido.toLowerCase()}@test.com`,
        telefono: '3001234567',
        salarioBase: Number(salario),
        tipoSalario: 'mensual',
        tipoContrato: 'indefinido', // ✅ FIXED: Added required field
        fechaIngreso: new Date().toISOString().split('T')[0],
        periodicidadPago: 'mensual', // ✅ FIXED: Added required field
        cargo: 'Desarrollador',
        estado: 'activo',
        sexo: 'M',
        fechaNacimiento: '1990-01-01',
        direccion: 'Calle 123 #45-67',
        ciudad: 'Bogotá',
        departamento: 'Cundinamarca',
        codigoCIIU: '6201',
        nivelRiesgoARL: 'I',
        centroCostos: 'TI',
        tipoJornada: 'completa',
        diasTrabajo: 30,
        horasTrabajo: 8,
        beneficiosExtralegales: false,
        banco: 'Bancolombia',
        tipoCuenta: 'ahorros',
        numeroCuenta: '123456789',
        titularCuenta: `${nombre} ${apellido}`,
        formaPago: 'dispersion',
        eps: 'EPS Sura',
        afp: 'Protección',
        arl: 'ARL Sura',
        cajaCompensacion: 'Compensar',
        regimenSalud: 'contributivo',
        estadoAfiliacion: 'completa'
      };

      const result = await createEmployee({
        ...employeeData,
        tipoContrato: employeeData.tipoContrato || 'indefinido',
        estado: employeeData.estado || 'activo',
        tipoJornada: employeeData.tipoJornada || 'completa'
      });

      if (result.success) {
        toast({
          title: "✅ Empleado creado exitosamente",
          description: `${nombre} ${apellido} ha sido registrado en el sistema`,
          className: "border-green-200 bg-green-50"
        });
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error creating employee:', error);
      toast({
        title: "❌ Error al crear empleado",
        description: error instanceof Error ? error.message : 'No se pudo crear el empleado',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Test de Creación de Empleado</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="cedula">Cédula</Label>
          <Input
            id="cedula"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            placeholder="Número de cédula"
          />
        </div>
        
        <div>
          <Label htmlFor="nombre">Nombre</Label>
          <Input
            id="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del empleado"
          />
        </div>
        
        <div>
          <Label htmlFor="apellido">Apellido</Label>
          <Input
            id="apellido"
            value={apellido}
            onChange={(e) => setApellido(e.target.value)}
            placeholder="Apellido del empleado"
          />
        </div>
        
        <div>
          <Label htmlFor="salario">Salario Base</Label>
          <Input
            id="salario"
            value={salario}
            onChange={(e) => setSalario(e.target.value)}
            placeholder="Salario base"
            type="number"
          />
        </div>
        
        <Button 
          onClick={handleCreateEmployee}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Creando...' : 'Crear Empleado de Prueba'}
        </Button>
      </CardContent>
    </Card>
  );
};
