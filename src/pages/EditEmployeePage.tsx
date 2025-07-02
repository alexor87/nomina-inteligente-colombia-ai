
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { EmployeeService } from '@/services/EmployeeService';
import { EmployeeFormModern } from '@/components/employees/EmployeeFormModern';
import { Card } from '@/components/ui/card';

const EditEmployeePage = () => {
  const navigate = useNavigate();
  const { employeeId } = useParams<{ employeeId: string }>();

  const { data: employee, isLoading, error } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => EmployeeService.getEmployeeById(employeeId!),
    enabled: !!employeeId,
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
    // The query will automatically refresh due to cache invalidation
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
    />
  );
};

export default EditEmployeePage;
