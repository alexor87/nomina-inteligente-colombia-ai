
import { useNavigate } from 'react-router-dom';
import { EmployeeFormModern } from '@/components/employees/EmployeeFormModern';

const CreateEmployeeModernPage = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/app/employees');
  };

  const handleCancel = () => {
    navigate('/app/employees');
  };

  return (
    <EmployeeFormModern 
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
};

export default CreateEmployeeModernPage;
