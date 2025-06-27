
import { useNavigate, useParams } from 'react-router-dom';
import { EmployeeFormModern } from '@/components/employees/EmployeeFormModern';
import { useEmployeeData } from '@/hooks/useEmployeeData';

const EditEmployeeModernPage = () => {
  const navigate = useNavigate();
  const { employeeId } = useParams();
  const { findEmployeeById, refreshEmployees, isLoading, updateEmployeeInList } = useEmployeeData();
  
  console.log('🔍 EditEmployeeModernPage: Looking for employee with ID:', employeeId);
  console.log('📊 EditEmployeeModernPage: isLoading:', isLoading);
  
  if (isLoading) {
    console.log('⏳ EditEmployeeModernPage: Still loading employee data...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando empleado...</p>
        </div>
      </div>
    );
  }
  
  // Use direct employee search instead of relying on filtered/paginated data
  const employee = employeeId ? findEmployeeById(employeeId) : undefined;
  
  console.log('🎯 EditEmployeeModernPage: Found employee:', employee ? 'YES' : 'NO');
  
  if (employee) {
    console.log('✅ EditEmployeeModernPage: Employee details:', {
      id: employee.id,
      nombre: employee.nombre,
      apellido: employee.apellido,
      cedula: employee.cedula,
      salarioBase: employee.salarioBase,
      tipoContrato: employee.tipoContrato,
      fechaIngreso: employee.fechaIngreso,
      // CRITICAL: Log affiliations data
      eps: employee.eps,
      afp: employee.afp,
      arl: employee.arl,
      cajaCompensacion: employee.cajaCompensacion,
      tipoCotizanteId: employee.tipoCotizanteId,
      subtipoCotizanteId: employee.subtipoCotizanteId,
      updatedAt: employee.updatedAt,
      // Log all fields for debugging
      allFields: Object.keys(employee)
    });
  } else {
    console.log('❌ EditEmployeeModernPage: No employee found with ID:', employeeId);
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

  // Enhanced data refresh callback
  const handleEmployeeDataRefresh = (updatedEmployee: any) => {
    console.log('🔄 EditEmployeeModernPage: handleEmployeeDataRefresh called with:', updatedEmployee);
    console.log('📊 Updated employee affiliations in page:', {
      eps: updatedEmployee.eps,
      afp: updatedEmployee.afp,
      arl: updatedEmployee.arl,
      cajaCompensacion: updatedEmployee.cajaCompensacion
    });
    
    // Update the employee in the list
    updateEmployeeInList(updatedEmployee);
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
      key={`employee-${employee.id}-${employee.updatedAt}`} // Force re-render when employee data changes
      employee={employee}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
      onDataRefresh={handleEmployeeDataRefresh}
    />
  );
};

export default EditEmployeeModernPage;
