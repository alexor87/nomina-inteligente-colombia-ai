
import { Layout } from '@/components/layout/Layout';
import { PayrollHistoryPage as PayrollHistory } from '@/components/payroll-history/PayrollHistoryPage';

const PayrollHistoryPage = () => {
  const mockUser = {
    email: 'admin@empresa.com',
    profile: {
      firstName: 'Admin',
      lastName: 'Usuario'
    }
  };

  return (
    <Layout userRole="company" user={mockUser}>
      <PayrollHistory />
    </Layout>
  );
};

export default PayrollHistoryPage;
