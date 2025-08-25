
import { EmployeesDashboard } from '@/components/employees/EmployeesDashboard';

const EmployeesPage = () => {
  return (
    <div className="px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Empleados</h1>
        <p className="text-gray-600">Gestiona la información de los empleados de tu empresa</p>
      </div>
      <EmployeesDashboard />
    </div>
  );
};

export default EmployeesPage;
