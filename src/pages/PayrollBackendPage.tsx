
import { Layout } from '@/components/layout/Layout';
import { PayrollLiquidationBackend } from '@/components/payroll/PayrollLiquidationBackend';

const PayrollBackendPage = () => {
  const mockUser = {
    email: 'admin@empresa.com',
    profile: {
      firstName: 'Admin',
      lastName: 'Usuario'
    }
  };

  return (
    <Layout userRole="company" user={mockUser}>
      <PayrollLiquidationBackend />
    </Layout>
  );
};

export default PayrollBackendPage;
