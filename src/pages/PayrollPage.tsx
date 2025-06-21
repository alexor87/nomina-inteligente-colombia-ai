
import { Layout } from '@/components/layout/Layout';
import { PayrollCalculator } from '@/components/payroll/PayrollCalculator';

const PayrollPage = () => {
  const mockUser = {
    email: 'admin@empresa.com',
    profile: {
      firstName: 'Admin',
      lastName: 'Usuario'
    }
  };

  return (
    <Layout userRole="company" user={mockUser}>
      <PayrollCalculator />
    </Layout>
  );
};

export default PayrollPage;
