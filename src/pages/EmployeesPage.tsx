
import { Layout } from '@/components/layout/Layout';
import { EmployeeList } from '@/components/employees/EmployeeList';

const EmployeesPage = () => {
  const mockUser = {
    email: 'admin@empresa.com',
    profile: {
      firstName: 'Admin',
      lastName: 'Usuario'
    }
  };

  return (
    <Layout userRole="company" user={mockUser}>
      <EmployeeList />
    </Layout>
  );
};

export default EmployeesPage;
