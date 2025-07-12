import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEmployeeCRUD } from '@/hooks/useEmployeeCRUD';
import { useToast } from '@/hooks/use-toast';
import { Employee } from '@/types';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'success' | 'warning';
  message: string;
  data?: any;
}

export const EmployeeCreationTest = () => {
  const { createEmployee, isLoading } = useEmployeeCRUD();
  const { toast } = useToast();
  const [testResult, setTestResult] = useState<string>('');
  const [detailedLogs, setDetailedLogs] = useState<LogEntry[]>([]);

  const addLog = (level: LogEntry['level'], message: string, data?: any) => {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
    
    setDetailedLogs(prev => [...prev, logEntry]);
    console.log(`[${level.toUpperCase()}] ${message}`, data || '');
  };

  const simulateEmployeeCreation = async () => {
    console.log('🧪 Iniciando simulación de creación de empleado...');
    setTestResult('Procesando...');
    setDetailedLogs([]);

    addLog('info', '🧪 Iniciando simulación de creación de empleado');

    // ✅ FIXED: Added missing company_id field
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
      periodicidadPago: 'mensual',
      estado: 'activo',
      tipoJornada: 'completa', // ✅ ADDED REQUIRED FIELD
      eps: 'Compensar EPS',
      afp: 'Porvenir',
      arl: 'SURA ARL',
      cajaCompensacion: 'Compensar',
      cargo: 'Desarrollador Senior',
      empresaId: '', // ✅ FIXED: Will be set by the hook
      company_id: '', // ✅ ADDED: Required field
      estadoAfiliacion: 'completa'
    };

    addLog('info', '📋 Datos del empleado de prueba preparados', testEmployeeData);

    try {
      addLog('info', '🚀 Invocando createEmployee...');
      
      const result = await createEmployee(testEmployeeData);
      
      addLog('info', '📨 Respuesta recibida de createEmployee', result);

      if (result.success) {
        addLog('success', '✅ Empleado creado exitosamente', result.data);
        
        const successMessage = `✅ ÉXITO: Empleado creado correctamente
        ID: ${result.data?.id}
        Nombre: ${testEmployeeData.nombre} ${testEmployeeData.apellido}
        Empresa: ${result.data?.company_id}
        Fecha: ${new Date().toLocaleString()}`;
        
        setTestResult(successMessage);
        
        toast({
          title: "✅ Prueba exitosa",
          description: "El empleado de prueba se creó correctamente",
        });
      } else {
        addLog('error', '❌ Error en la creación del empleado', result.error);
        
        const errorMessage = `❌ ERROR: ${result.error || 'Error desconocido'}`;
        setTestResult(errorMessage);
        
        toast({
          title: "❌ Prueba fallida",
          description: result.error || "Error en la creación del empleado",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      addLog('error', '❌ Excepción capturada durante la simulación', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      const errorMessage = `❌ EXCEPCIÓN: ${error.message || error}`;
      setTestResult(errorMessage);
      
      toast({
        title: "❌ Error crítico",
        description: "Error no controlado en la prueba",
        variant: "destructive"
      });
    }

    addLog('info', '🏁 Simulación finalizada');
  };

  const clearLogs = () => {
    setDetailedLogs([]);
    setTestResult('');
  };

  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-blue-600';
    }
  };

  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">🧪 Prueba de Creación de Empleado</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 justify-center">
          <Button 
            onClick={simulateEmployeeCreation}
            disabled={isLoading}
            size="lg"
          >
            {isLoading ? 'Creando empleado...' : '🚀 Simular Creación de Empleado'}
          </Button>
          <Button 
            onClick={clearLogs}
            variant="outline"
            size="lg"
          >
            🧹 Limpiar Logs
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

        {detailedLogs.length > 0 && (
          <div className="mt-6 border rounded-lg">
            <div className="bg-gray-100 px-4 py-2 border-b">
              <h3 className="font-semibold">📋 Log Detallado ({detailedLogs.length} entradas)</h3>
            </div>
            <div className="max-h-96 overflow-y-auto p-4 space-y-2">
              {detailedLogs.map((log, index) => (
                <div key={index} className="border-l-4 border-gray-300 pl-4 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{getLogIcon(log.level)}</span>
                    <span className={`font-medium ${getLogColor(log.level)}`}>
                      [{log.level.toUpperCase()}]
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-sm mb-2">{log.message}</div>
                  {log.data && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                        📊 Ver datos asociados
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>Esta prueba validará:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>✅ Que las políticas RLS permitan la creación</li>
            <li>✅ Que se asigne correctamente la empresa del usuario</li>
            <li>✅ Que no haya recursión infinita</li>
            <li>✅ Que todos los campos se guarden correctamente</li>
            <li>📋 Log detallado de todo el proceso</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
