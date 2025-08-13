
import { EmployeesDashboard } from '@/components/employees/EmployeesDashboard';
import { PageContainer } from '@/components/layout/PageContainer';

const EmployeesPage = () => {
  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Empleados</h1>
        <p className="text-gray-600">Gestiona la información de los empleados de tu empresa</p>
      </div>
      <EmployeesDashboard />
    </PageContainer>
  );
};

export default EmployeesPage;
