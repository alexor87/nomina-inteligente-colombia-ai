
import { useNavigate, useParams } from 'react-router-dom';
import { EmployeeFormModern } from '@/components/employees/EmployeeFormModern';
import { useEmployeeData } from '@/hooks/useEmployeeData';
import { useEffect, useState } from 'react';
import { EmployeeWithStatus } from '@/types/employee-extended';

const EditEmployeeModernPage = () => {
  const navigate = useNavigate();
  const { employeeId } = useParams();
  const { findEmployeeById, refreshEmployees, isLoading, isInitialized, updateEmployeeInList, retryFindEmployeeById } = useEmployeeData();
  const [employee, setEmployee] = useState<EmployeeWithStatus | undefined>(undefined);
  const [dataReady, setDataReady] = useState(false);
  
  console.log('🔍 EditEmployeeModernPage: Looking for employee with ID:', employeeId);
  console.log('📊 EditEmployeeModernPage: isLoading:', isLoading, 'isInitialized:', isInitialized);
  
  // NEW: Effect to handle employee loading with retry mechanism
  useEffect(() => {
    const loadEmployee = async () => {
      if (!employeeId) {
        console.log('❌ EditEmployeeModernPage: No employeeId provided');
        setDataReady(true);
        return;
      }

      console.log('🔄 EditEmployeeModernPage: Attempting to load employee...');
      
      // Wait for data to be initialized
      if (!isInitialized || isLoading) {
        console.log('⏳ EditEmployeeModernPage: Waiting for data to be initialized...');
        return;
      }

      // Try to find employee
      let foundEmployee = findEmployeeById(employeeId);
      
      if (!foundEmployee) {
        console.log('⚠️ EditEmployeeModernPage: Employee not found, trying retry mechanism...');
        foundEmployee = await retryFindEmployeeById(employeeId);
      }

      if (foundEmployee) {
        console.log('✅ EditEmployeeModernPage: Employee loaded successfully:', {
          id: foundEmployee.id,
          nombre: foundEmployee.nombre,
          apellido: foundEmployee.apellido,
          cedula: foundEmployee.cedula,
          // CRITICAL: Log affiliations data
          eps: foundEmployee.eps,
          afp: foundEmployee.afp,
          arl: foundEmployee.arl,
          cajaCompensacion: foundEmployee.cajaCompensacion,
          tipoCotizanteId: foundEmployee.tipoCotizanteId,
          subtipoCotizanteId: foundEmployee.subtipoCotizanteId,
          updatedAt: foundEmployee.updatedAt
        });
        setEmployee(foundEmployee);
      } else {
        console.log('❌ EditEmployeeModernPage: Employee not found even after retry');
      }
      
      setDataReady(true);
    };

    loadEmployee();
  }, [employeeId, isInitialized, isLoading, findEmployeeById, retryFindEmployeeById]);

  // Show loading state while data is being fetched or employee is being found
  if (isLoading || !dataReady) {
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
    
    // Update the employee in the list and local state
    updateEmployeeInList(updatedEmployee);
    setEmployee(updatedEmployee);
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
