
import { useNavigate, useParams } from 'react-router-dom';
import { EmployeeFormModernFixed } from '@/components/employees/EmployeeFormModernFixed';
import { useEmployeeDataFixed } from '@/hooks/useEmployeeDataFixed';
import { useEffect, useState, useCallback } from 'react';
import { EmployeeWithStatus } from '@/types/employee-extended';

const EditEmployeeModernPageFixed = () => {
  const navigate = useNavigate();
  const { employeeId } = useParams<{ employeeId: string }>();
  const { findEmployeeById, refreshEmployees, isLoading, isInitialized, updateEmployeeInList, retryFindEmployeeById } = useEmployeeDataFixed();
  const [employee, setEmployee] = useState<EmployeeWithStatus | undefined>(undefined);
  const [dataReady, setDataReady] = useState(false);
  const [hasRetried, setHasRetried] = useState(false);
  
  console.log('🔍 EditEmployeeModernPageFixed: Looking for employee with ID:', employeeId);
  console.log('📊 EditEmployeeModernPageFixed: isLoading:', isLoading, 'isInitialized:', isInitialized);
  
  // Load employee data
  const loadEmployeeData = useCallback(async () => {
    if (!employeeId || !isInitialized || isLoading) {
      return;
    }

    console.log('🔄 EditEmployeeModernPageFixed: Loading employee data...');
    
    const foundEmployee = findEmployeeById(employeeId);
    
    if (foundEmployee) {
      console.log('✅ EditEmployeeModernPageFixed: Employee found:', {
        id: foundEmployee.id,
        nombre: foundEmployee.nombre,
        apellido: foundEmployee.apellido,
        updatedAt: foundEmployee.updatedAt
      });
      setEmployee(foundEmployee);
      setDataReady(true);
    } else if (!hasRetried) {
      console.log('⚠️ EditEmployeeModernPageFixed: Employee not found, attempting retry...');
      setHasRetried(true);
      const retriedEmployee = await retryFindEmployeeById(employeeId);
      if (retriedEmployee) {
        setEmployee(retriedEmployee);
      }
      setDataReady(true);
    } else {
      console.log('❌ EditEmployeeModernPageFixed: Employee not found after retry');
      setDataReady(true);
    }
  }, [employeeId, isInitialized, isLoading, findEmployeeById, retryFindEmployeeById, hasRetried]);

  // Effect to load employee when data becomes available
  useEffect(() => {
    loadEmployeeData();
  }, [loadEmployeeData]);

  // Show loading state
  if (isLoading || !dataReady) {
    console.log('⏳ EditEmployeeModernPageFixed: Still loading employee data...');
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
    console.log('🔄 EditEmployeeModernPageFixed: handleSuccess called, refreshing employees...');
    await refreshEmployees();
    console.log('✅ EditEmployeeModernPageFixed: employees refreshed, navigating back');
    navigate('/app/employees');
  }, [refreshEmployees, navigate]);

  const handleCancel = useCallback(() => {
    navigate('/app/employees');
  }, [navigate]);

  const handleEmployeeDataRefresh = useCallback((updatedEmployee: any) => {
    console.log('🔄 EditEmployeeModernPageFixed: handleEmployeeDataRefresh called with:', updatedEmployee);
    
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
    <EmployeeFormModernFixed 
      key={employee.id}
      employee={employee}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
      onDataRefresh={handleEmployeeDataRefresh}
    />
  );
};

export default EditEmployeeModernPageFixed;
