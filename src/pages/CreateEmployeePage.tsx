
import { useNavigate } from 'react-router-dom';
import { EmployeeForm } from '@/components/employees/EmployeeForm';

const CreateEmployeePage = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    console.log('✅ Employee created successfully, navigating to employees list');
    navigate('/app/employees');
  };

  const handleCancel = () => {
    console.log('🔙 Employee creation cancelled, navigating back to employees list');
    navigate('/app/employees');
  };

  return (
    <EmployeeForm 
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
};

export default CreateEmployeePage;
