import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { useEditPeriod } from '@/hooks/useEditPeriod';
import { toast } from 'sonner';

interface TestResult {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  duration?: number;
}

interface PeriodEditingTestSuiteProps {
  periodId: string;
  companyId?: string;
}

export const PeriodEditingTestSuite: React.FC<PeriodEditingTestSuiteProps> = ({
  periodId,
  companyId
}) => {
  const [tests, setTests] = useState<TestResult[]>([
    { id: 'main-flow', name: 'Flujo Principal: Cerrado → Edición → Aplicar', status: 'pending' },
    { id: 'discard-flow', name: 'Flujo Descartar: Edición → Descartar Cambios', status: 'pending' },
    { id: 'add-employee', name: 'Agregar Empleado en Modo Edición', status: 'pending' },
    { id: 'remove-employee', name: 'Remover Empleado en Modo Edición', status: 'pending' },
    { id: 'add-novedad', name: 'Agregar Novedad en Modo Edición', status: 'pending' },
    { id: 'remove-novedad', name: 'Remover Novedad en Modo Edición', status: 'pending' },
    { id: 'validation', name: 'Validación de Reglas de Negocio', status: 'pending' },
    { id: 'session-management', name: 'Gestión de Sesiones de Edición', status: 'pending' },
    { id: 'ui-states', name: 'Estados de UI y Loading', status: 'pending' },
    { id: 'error-handling', name: 'Manejo de Errores', status: 'pending' }
  ]);

  const {
    editState,
    editingSession,
    pendingChanges,
    hasChanges,
    totalChangesCount,
    isValid,
    validationErrors,
    startEditing,
    applyChanges,
    discardChanges,
    addEmployee,
    removeEmployee,
    addNovedad,
    removeNovedad
  } = useEditPeriod({ periodId, companyId });

  const updateTestStatus = (testId: string, status: TestResult['status'], message?: string, duration?: number) => {
    setTests(prev => prev.map(test => 
      test.id === testId 
        ? { ...test, status, message, duration }
        : test
    ));
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const runTest = async (testId: string, testFn: () => Promise<void>) => {
    const startTime = Date.now();
    updateTestStatus(testId, 'running');
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      updateTestStatus(testId, 'success', 'Pasó correctamente', duration);
      toast.success(`Test ${testId} completado exitosamente`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Error desconocido';
      updateTestStatus(testId, 'error', message, duration);
      toast.error(`Test ${testId} falló: ${message}`);
    }
  };

  const runAllTests = async () => {
    toast.info('Iniciando suite completa de testing...');
    
    // Test 1: Flujo Principal
    await runTest('main-flow', async () => {
      if (editState !== 'closed') {
        throw new Error('El período debe estar cerrado para iniciar este test');
      }
      
      // Iniciar edición
      await startEditing();
      await sleep(1000);
      
      if (editState === 'closed') {
        throw new Error('No se pudo activar el modo de edición');
      }
      
      // Hacer un cambio
      await addNovedad({
        tipo_novedad: 'auxilio_alimentacion',
        valor: 50000,
        observacion: 'Test novedad'
      });
      
      if (!hasChanges) {
        throw new Error('Los cambios no se registraron correctamente');
      }
      
      // Aplicar cambios
      await applyChanges();
      await sleep(2000);
      
      if (editState !== 'closed') {
        throw new Error('El período no volvió al estado cerrado después de aplicar');
      }
    });

    // Test 2: Flujo Descartar
    await runTest('discard-flow', async () => {
      await startEditing();
      await sleep(1000);
      
      // Hacer cambios
      await addNovedad({
        tipo_novedad: 'bonificacion',
        valor: 25000,
        observacion: 'Test para descartar'
      });
      
      if (!hasChanges) {
        throw new Error('Los cambios no se registraron');
      }
      
      // Descartar
      await discardChanges();
      await sleep(1000);
      
      if (hasChanges) {
        throw new Error('Los cambios no se descartaron correctamente');
      }
      
      if (editState !== 'closed') {
        throw new Error('El período no volvió al estado cerrado');
      }
    });

    // Test 3: Agregar Empleado
    await runTest('add-employee', async () => {
      await startEditing();
      await sleep(1000);
      
      const mockEmployeeId = 'test-employee-id';
      await addEmployee(mockEmployeeId);
      
      if (!pendingChanges.employees.added.includes(mockEmployeeId)) {
        throw new Error('El empleado no se agregó a los cambios pendientes');
      }
      
      await discardChanges();
    });

    // Test 4: Remover Empleado  
    await runTest('remove-employee', async () => {
      await startEditing();
      await sleep(1000);
      
      const mockEmployeeId = 'test-employee-remove-id';
      await removeEmployee(mockEmployeeId);
      
      if (!pendingChanges.employees.removed.includes(mockEmployeeId)) {
        throw new Error('El empleado no se agregó a la lista de removidos');
      }
      
      await discardChanges();
    });

    // Test 5: Agregar Novedad
    await runTest('add-novedad', async () => {
      await startEditing();
      await sleep(1000);
      
      const initialCount = pendingChanges.novedades.added.length;
      
      await addNovedad({
        tipo_novedad: 'descuento_varios',
        valor: 15000,
        observacion: 'Test add novedad'
      });
      
      if (pendingChanges.novedades.added.length !== initialCount + 1) {
        throw new Error('La novedad no se agregó correctamente');
      }
      
      await discardChanges();
    });

    // Test 6: Remover Novedad
    await runTest('remove-novedad', async () => {
      await startEditing();
      await sleep(1000);
      
      const mockNovedadId = 'test-novedad-id';
      await removeNovedad(mockNovedadId);
      
      if (!pendingChanges.novedades.deleted.includes(mockNovedadId)) {
        throw new Error('La novedad no se marcó para eliminación');
      }
      
      await discardChanges();
    });

    // Test 7: Validación
    await runTest('validation', async () => {
      if (!isValid && validationErrors.length === 0) {
        throw new Error('Estado de validación inconsistente');
      }
      
      // El sistema debe ser válido en estado inicial
      if (!isValid) {
        throw new Error(`Sistema inválido: ${validationErrors.join(', ')}`);
      }
    });

    // Test 8: Gestión de Sesiones
    await runTest('session-management', async () => {
      await startEditing();
      await sleep(1000);
      
      if (!editingSession) {
        throw new Error('No se creó una sesión de edición');
      }
      
      if (editingSession.status !== 'active') {
        throw new Error('La sesión no está en estado activo');
      }
      
      await discardChanges();
    });

    // Test 9: Estados de UI
    await runTest('ui-states', async () => {
      // Verificar que los estados cambian apropiadamente
      const initialState = editState;
      
      await startEditing();
      
      if (editState === initialState) {
        throw new Error('El estado de UI no cambió al activar edición');
      }
      
      await discardChanges();
      
      if (editState !== 'closed') {
        throw new Error('El estado no volvió a cerrado');
      }
    });

    // Test 10: Manejo de Errores
    await runTest('error-handling', async () => {
      // Intentar operación inválida
      try {
        await addNovedad({
          tipo_novedad: '',
          valor: -1,
          observacion: 'Test error'
        });
        throw new Error('Debería haber fallado con datos inválidos');
      } catch (error) {
        // Se espera que falle
        if (error instanceof Error && error.message.includes('Debería haber fallado')) {
          throw error;
        }
        // Error esperado, el test pasa
      }
    });

    toast.success('¡Suite completa de testing finalizada!');
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      pending: 'secondary',
      running: 'default',
      success: 'default',
      error: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status]} className="ml-2">
        {status === 'pending' && 'Pendiente'}
        {status === 'running' && 'Ejecutando...'}
        {status === 'success' && 'Éxito'}
        {status === 'error' && 'Error'}
      </Badge>
    );
  };

  const successCount = tests.filter(t => t.status === 'success').length;
  const errorCount = tests.filter(t => t.status === 'error').length;
  const runningCount = tests.filter(t => t.status === 'running').length;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Suite de Testing - Sistema de Edición de Períodos</span>
          <div className="flex gap-2">
            <Badge variant="default">{successCount} Éxitos</Badge>
            <Badge variant="destructive">{errorCount} Errores</Badge>
            {runningCount > 0 && <Badge variant="outline">{runningCount} Ejecutando</Badge>}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estado Actual */}
        <div className="p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Estado Actual del Sistema</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Estado:</span> 
              <Badge className="ml-1">{editState}</Badge>
            </div>
            <div>
              <span className="font-medium">Cambios:</span> {hasChanges ? 'Sí' : 'No'} ({totalChangesCount})
            </div>
            <div>
              <span className="font-medium">Válido:</span> {isValid ? 'Sí' : 'No'}
            </div>
            <div>
              <span className="font-medium">Sesión:</span> {editingSession ? 'Activa' : 'Ninguna'}
            </div>
          </div>
        </div>

        {/* Controles */}
        <div className="flex gap-2">
          <Button onClick={runAllTests} disabled={runningCount > 0}>
            {runningCount > 0 ? 'Ejecutando...' : 'Ejecutar Todos los Tests'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setTests(prev => prev.map(t => ({ ...t, status: 'pending' as const, message: undefined, duration: undefined })))}
          >
            Resetear Tests
          </Button>
        </div>

        {/* Lista de Tests */}
        <div className="space-y-2">
          {tests.map(test => (
            <div key={test.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(test.status)}
                <span className="font-medium">{test.name}</span>
                {getStatusBadge(test.status)}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {test.duration && <span>{test.duration}ms</span>}
                {test.message && (
                  <span className={test.status === 'error' ? 'text-red-500' : 'text-green-500'}>
                    {test.message}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Resumen */}
        <div className="p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Resumen de Resultados</h3>
          <div className="text-sm space-y-1">
            <div>Total de tests: {tests.length}</div>
            <div className="text-green-600">✅ Exitosos: {successCount}</div>
            <div className="text-red-600">❌ Fallidos: {errorCount}</div>
            <div className="text-blue-600">⏳ En ejecución: {runningCount}</div>
            <div className="text-gray-600">⏸️ Pendientes: {tests.length - successCount - errorCount - runningCount}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};