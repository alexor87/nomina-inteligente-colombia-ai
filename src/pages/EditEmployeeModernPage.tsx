
import { useNavigate, useParams } from 'react-router-dom';
import { EmployeeFormModern } from '@/components/employees/EmployeeFormModern';
import { useEmployeeList } from '@/hooks/useEmployeeList';

const EditEmployeeModernPage = () => {
  const navigate = useNavigate();
  const { employeeId } = useParams();
  const { employees, refreshEmployees } = useEmployeeList();
  
  console.log('🔍 EditEmployeeModernPage: Looking for employee with ID:', employeeId);
  console.log('📋 EditEmployeeModernPage: Available employees:', employees.length);
  
  const employee = employees.find(emp => emp.id === employeeId);
  
  console.log('🎯 EditEmployeeModernPage: Found employee:', employee);
  
  if (employee) {
    console.log('✅ EditEmployeeModernPage: Employee details:', {
      id: employee.id,
      nombre: employee.nombre,
      apellido: employee.apellido,
      cedula: employee.cedula,
      salarioBase: employee.salarioBase,
      tipoContrato: employee.tipoContrato,
      fechaIngreso: employee.fechaIngreso,
      // Log all fields for debugging
      allFields: Object.keys(employee)
    });
  } else {
    console.log('❌ EditEmployeeModernPage: No employee found with ID:', employeeId);
    console.log('📋 Available employee IDs:', employees.map(emp => emp.id));
  }

  const handleSuccess = async () => {
    console.log('🔄 EditEmployeeModernPage: handleSuccess called, refreshing employees...');
    
    // Refrescar la lista de empleados después de la actualización
    await refreshEmployees();
    
    console.log('✅ EditEmployeeModernPage: employees refreshed, navigating back');
    navigate('/employees');
  };

  const handleCancel = () => {
    navigate('/employees');
  };

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Empleado no encontrado</h2>
          <p className="text-gray-600 mb-4">
            El empleado que buscas no existe o fue eliminado. 
            <br />
            <small>ID buscado: {employeeId}</small>
          </p>
          <button 
            onClick={() => navigate('/employees')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Volver a Empleados
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

export default EditEmployeeModernPage;
