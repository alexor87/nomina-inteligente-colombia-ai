
import { Layout } from '@/components/layout/Layout';
import { PayrollLiquidation } from '@/components/payroll/PayrollLiquidation';

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
      <PayrollLiquidation />
    </Layout>
  );
};

export default PayrollPage;
