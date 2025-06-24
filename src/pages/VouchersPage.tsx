
import { Layout } from '@/components/layout/Layout';
import { VouchersPage as VouchersComponent } from '@/components/vouchers/VouchersPage';

const VouchersPage = () => {
  const mockUser = {
    email: 'admin@empresa.com',
    profile: {
      firstName: 'Admin',
      lastName: 'Usuario'
    }
  };

  return (
    <Layout userRole="company" user={mockUser}>
      <VouchersComponent />
    </Layout>
  );
};

export default VouchersPage;
