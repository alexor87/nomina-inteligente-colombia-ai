
import { useNavigate, useParams } from 'react-router-dom';
import { EmployeeDetails } from '@/components/employees/EmployeeDetails';
import { useEmployeeList } from '@/hooks/useEmployeeList';

const EmployeeDetailsPage = () => {
  const navigate = useNavigate();
  const { employeeId } = useParams();
  const { employees } = useEmployeeList();
  
  const employee = employees.find(emp => emp.id === employeeId);

  const handleEdit = () => {
    navigate(`/employees/${employeeId}/edit`);
  };

  const handleClose = () => {
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
    <EmployeeDetails 
      employee={employee}
      onEdit={handleEdit}
      onClose={handleClose}
    />
  );
};

export default EmployeeDetailsPage;
