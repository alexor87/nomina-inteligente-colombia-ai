
import { useNavigate, useParams } from 'react-router-dom';
import { EmployeeForm } from '@/components/employees/EmployeeForm';
import { useEmployeeList } from '@/hooks/useEmployeeList';

const EditEmployeePage = () => {
  const navigate = useNavigate();
  const { employeeId } = useParams();
  const { employees } = useEmployeeList();
  
  const employee = employees.find(emp => emp.id === employeeId);

  const handleSuccess = () => {
    navigate('/employees');
  };

  const handleCancel = () => {
    navigate('/employees');
  };

  if (!employee) {
    return (
      <div className="p-6">
        <p>Empleado no encontrado</p>
      </div>
    );
  }

  return (
    <EmployeeForm 
      employee={employee}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
};

export default EditEmployeePage;
