
import { useNavigate, useParams } from 'react-router-dom';
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

  // Redirigir inmediatamente a la lista de empleados
  // ya que la funcionalidad de ver detalles está desactivada
  if (!employee) {
    navigate('/employees');
    return null;
  }

  // Redirigir a la página de edición en lugar de mostrar detalles
  navigate(`/employees/${employeeId}/edit`);
  return null;
};

export default EmployeeDetailsPage;
