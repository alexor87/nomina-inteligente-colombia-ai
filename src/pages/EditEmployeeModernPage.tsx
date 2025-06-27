
import { useNavigate, useParams } from 'react-router-dom';
import { EmployeeFormModern } from '@/components/employees/EmployeeFormModern';
import { useEmployeeData } from '@/hooks/useEmployeeData';
import { useEffect, useState, useCallback } from 'react';
import { EmployeeWithStatus } from '@/types/employee-extended';

const EditEmployeeModernPage = () => {
  const navigate = useNavigate();
  const { employeeId } = useParams();
  const { findEmployeeById, refreshEmployees, isLoading, isInitialized, updateEmployeeInList } = useEmployeeData();
  const [employee, setEmployee] = useState<EmployeeWithStatus | undefined>(undefined);
  const [dataReady, setDataReady] = useState(false);
  
  console.log('🔍 EditEmployeeModernPage: Looking for employee with ID:', employeeId);
  console.log('📊 EditEmployeeModernPage: isLoading:', isLoading, 'isInitialized:', isInitialized);
  
  // Memoized function to load employee data
  const loadEmployeeData = useCallback(async () => {
    if (!employeeId || !isInitialized || isLoading) {
      return;
    }

    console.log('🔄 EditEmployeeModernPage: Loading employee data...');
    
    // Try to find employee in current data
    const foundEmployee = findEmployeeById(employeeId);
    
    if (foundEmployee) {
      console.log('✅ EditEmployeeModernPage: Employee found:', {
        id: foundEmployee.id,
        nombre: foundEmployee.nombre,
        apellido: foundEmployee.apellido,
        updatedAt: foundEmployee.updatedAt
      });
      setEmployee(foundEmployee);
    } else {
      console.log('❌ EditEmployeeModernPage: Employee not found');
    }
    
    setDataReady(true);
  }, [employeeId, isInitialized, isLoading, findEmployeeById]);

  // Effect to load employee when data becomes available
  useEffect(() => {
    loadEmployeeData();
  }, [loadEmployeeData]);

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

  const handleSuccess = useCallback(async () => {
    console.log('🔄 EditEmployeeModernPage: handleSuccess called, refreshing employees...');
    await refreshEmployees();
    console.log('✅ EditEmployeeModernPage: employees refreshed, navigating back');
    navigate('/app/employees');
  }, [refreshEmployees, navigate]);

  const handleCancel = useCallback(() => {
    navigate('/app/employees');
  }, [navigate]);

  // Enhanced data refresh callback
  const handleEmployeeDataRefresh = useCallback((updatedEmployee: any) => {
    console.log('🔄 EditEmployeeModernPage: handleEmployeeDataRefresh called with:', updatedEmployee);
    
    // Update the employee in the list and local state
    updateEmployeeInList(updatedEmployee);
    setEmployee(updatedEmployee);
  }, [updateEmployeeInList]);

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
            onClick={() => navigate('/app/employees')}
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
      key={employee.id} // Use only ID as key to prevent unnecessary re-renders
      employee={employee}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
      onDataRefresh={handleEmployeeDataRefresh}
    />
  );
};

export default EditEmployeeModernPage;
