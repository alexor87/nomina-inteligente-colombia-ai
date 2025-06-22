
import { Layout } from '@/components/layout/Layout';
import { PaymentsPage as PaymentsComponent } from '@/components/payments/PaymentsPage';

const PaymentsPage = () => {
  const mockUser = {
    email: 'admin@empresa.com',
    profile: {
      firstName: 'Admin',
      lastName: 'Usuario'
    }
  };

  return (
    <Layout userRole="company" user={mockUser}>
      <PaymentsComponent />
    </Layout>
  );
};

export default PaymentsPage;
