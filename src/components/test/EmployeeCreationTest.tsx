
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEmployeeCRUD } from '@/hooks/useEmployeeCRUD';
import { useToast } from '@/hooks/use-toast';
import { Employee } from '@/types';

export const EmployeeCreationTest = () => {
  const { createEmployee, isLoading } = useEmployeeCRUD();
  const { toast } = useToast();
  const [testResult, setTestResult] = useState<string>('');

  const simulateEmployeeCreation = async () => {
    console.log('🧪 Iniciando simulación de creación de empleado...');
    setTestResult('Procesando...');

    // Datos de prueba para el empleado
    const testEmployeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> = {
      cedula: '12345678',
      tipoDocumento: 'CC',
      nombre: 'Juan Carlos',
      apellido: 'Pérez García',
      email: 'juan.perez@test.com',
      telefono: '3001234567',
      salarioBase: 2500000,
      tipoContrato: 'indefinido',
      fechaIngreso: new Date().toISOString().split('T')[0],
      estado: 'activo',
      eps: 'Compensar EPS',
      afp: 'Porvenir',
      arl: 'SURA ARL',
      cajaCompensacion: 'Compensar',
      cargo: 'Desarrollador Senior',
      empresaId: '', // Se llenará automáticamente
      estadoAfiliacion: 'completa'
    };

    try {
      console.log('📋 Datos del empleado de prueba:', testEmployeeData);
      
      const result = await createEmployee(testEmployeeData);
      
      if (result.success) {
        console.log('✅ Empleado creado exitosamente:', result.data);
        setTestResult(`✅ ÉXITO: Empleado creado correctamente
        ID: ${result.data?.id}
        Nombre: ${testEmployeeData.nombre} ${testEmployeeData.apellido}
        Empresa: ${result.data?.company_id}
        Fecha: ${new Date().toLocaleString()}`);
        
        toast({
          title: "✅ Prueba exitosa",
          description: "El empleado de prueba se creó correctamente",
        });
      } else {
        console.error('❌ Error en la creación:', result.error);
        setTestResult(`❌ ERROR: ${result.error || 'Error desconocido'}`);
        
        toast({
          title: "❌ Prueba fallida",
          description: result.error || "Error en la creación del empleado",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('❌ Error capturado:', error);
      setTestResult(`❌ EXCEPCIÓN: ${error.message || error}`);
      
      toast({
        title: "❌ Error crítico",
        description: "Error no controlado en la prueba",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">🧪 Prueba de Creación de Empleado</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <Button 
            onClick={simulateEmployeeCreation}
            disabled={isLoading}
            size="lg"
            className="w-full"
          >
            {isLoading ? 'Creando empleado...' : '🚀 Simular Creación de Empleado'}
          </Button>
        </div>
        
        {testResult && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Resultado de la Prueba:</h3>
            <pre className="whitespace-pre-wrap text-sm font-mono">
              {testResult}
            </pre>
          </div>
        )}
        
        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>Esta prueba validará:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>✅ Que las políticas RLS permitan la creación</li>
            <li>✅ Que se asigne correctamente la empresa del usuario</li>
            <li>✅ Que no haya recursión infinita</li>
            <li>✅ Que todos los campos se guarden correctamente</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
