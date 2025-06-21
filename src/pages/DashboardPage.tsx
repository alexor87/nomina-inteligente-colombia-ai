
import { Layout } from '@/components/layout/Layout';
import { Dashboard } from '@/components/dashboard/Dashboard';

const DashboardPage = () => {
  // Mock user data - en producción vendrá de Supabase
  const mockUser = {
    email: 'admin@empresa.com',
    profile: {
      firstName: 'Admin',
      lastName: 'Usuario'
    }
  };

  return (
    <Layout userRole="company" user={mockUser}>
      <Dashboard />
    </Layout>
  );
};

export default DashboardPage;
