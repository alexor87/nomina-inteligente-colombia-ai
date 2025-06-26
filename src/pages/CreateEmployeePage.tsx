
import { useNavigate } from 'react-router-dom';
import { EmployeeForm } from '@/components/employees/EmployeeForm';

const CreateEmployeePage = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/employees');
  };

  const handleCancel = () => {
    navigate('/employees');
  };

  return (
    <EmployeeForm 
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
};

export default CreateEmployeePage;
