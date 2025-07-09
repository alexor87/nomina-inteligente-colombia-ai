
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { EmployeeService } from '@/services/EmployeeService';
import { EmployeeFormModern } from '@/components/employees/EmployeeFormModern';
import { Card } from '@/components/ui/card';
import { useAutoSave } from '@/hooks/useAutoSave';

const EditEmployeePage = () => {
  const navigate = useNavigate();
  const { employeeId } = useParams<{ employeeId: string }>();
  
  // SOLUCIÓN KISS: Estado para controlar auto-guardado cuando modal esté abierto
  const [isTimeOffModalOpen, setIsTimeOffModalOpen] = useState(false);

  const { data: employee, isLoading, error } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => EmployeeService.getEmployeeById(employeeId!),
    enabled: !!employeeId,
  });

  // Auto-guardado deshabilitado cuando modal de TimeOff esté abierto
  const { triggerAutoSave, isSaving } = useAutoSave({
    onSave: async () => {
      console.log('✅ Auto-guardado funcionando (TimeOff modal cerrado)');
      // Aquí iría la lógica de guardado del empleado
    },
    delay: 3000,
    enabled: !isTimeOffModalOpen // CRÍTICO: deshabilitar cuando modal esté abierto
  });

  const handleSuccess = () => {
    console.log('✅ Employee updated successfully, navigating to employees list');
    navigate('/app/employees');
  };

  const handleCancel = () => {
    console.log('🔙 Employee edit cancelled, navigating back to employees list');
    navigate('/app/employees');
  };

  const handleDataRefresh = (updatedEmployee: any) => {
    console.log('🔄 Employee data refreshed:', updatedEmployee);
    
    // Solo hacer auto-guardado si el modal de TimeOff NO está abierto
    if (!isTimeOffModalOpen) {
      triggerAutoSave();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando empleado...</p>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <Card className="p-6 max-w-md mx-auto mt-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">
            {error ? 'Error cargando el empleado' : 'Empleado no encontrado'}
          </p>
          <button
            onClick={() => navigate('/app/employees')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Volver a Empleados
          </button>
        </div>
      </Card>
    );
  }

  return (
    <EmployeeFormModern
      employee={employee}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
      onDataRefresh={handleDataRefresh}
      onTimeOffModalStateChange={setIsTimeOffModalOpen}
    />
  );
};

export default EditEmployeePage;
