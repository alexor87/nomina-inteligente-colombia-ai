
import { useNavigate } from 'react-router-dom';
import { EmployeeFormModern } from '@/components/employees/EmployeeFormModern';

const CreateEmployeePage = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    console.log('✅ Employee created successfully, navigating to employees list');
    navigate('/modules/employees');
  };

  const handleCancel = () => {
    console.log('🔙 Employee creation cancelled, navigating back to employees list');
    navigate('/modules/employees');
  };

  return (
    <EmployeeFormModern 
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
};

export default CreateEmployeePage;
