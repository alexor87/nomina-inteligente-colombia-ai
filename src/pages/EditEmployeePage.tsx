
import { useParams, useNavigate } from 'react-router-dom';
import { useEmployeeEdit } from '@/hooks/useEmployeeEdit';
import { EmployeeFormModern } from '@/components/employees/EmployeeFormModern';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const EditEmployeePage = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  
  const { employee, isLoading, error } = useEmployeeEdit(employeeId);

  const handleSuccess = () => {
    navigate('/app/employees');
  };

  const handleCancel = () => {
    navigate('/app/employees');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => navigate('/app/employees')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Volver a empleados
          </button>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-600 mb-2">Empleado no encontrado</h2>
          <button 
            onClick={() => navigate('/app/employees')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Volver a empleados
          </button>
        </div>
      </div>
    );
  }

  return (
    <EmployeeFormModern
      employee={employee}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
};

export default EditEmployeePage;
