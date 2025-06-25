
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Layout } from '@/components/layout/Layout';

// Fix imports to use default exports
import { Index } from '@/pages/Index';
import AuthPage from '@/pages/AuthPage';
import DashboardPage from '@/pages/DashboardPage';
import EmployeesPage from '@/pages/EmployeesPage';
import PayrollPage from '@/pages/PayrollPage';
import PayrollBackendPage from '@/pages/PayrollBackendPage';
import PayrollHistoryPage from '@/pages/PayrollHistoryPage';
import VouchersPage from '@/pages/VouchersPage';
import PaymentsPage from '@/pages/PaymentsPage';
import ReportsPage from '@/pages/ReportsPage';
import SettingsPage from '@/pages/SettingsPage';
import { CompanyRegistrationPage } from '@/pages/CompanyRegistrationPage';
import { SuperAdminPage } from '@/pages/SuperAdminPage';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SubscriptionProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/register-company" element={<CompanyRegistrationPage />} />
              
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Layout>
                    <DashboardPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/super-admin" element={
                <ProtectedRoute>
                  <Layout>
                    <SuperAdminPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/employees" element={
                <ProtectedRoute requiredRole="administrador">
                  <Layout>
                    <EmployeesPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/payroll" element={
                <ProtectedRoute requiredRole="administrador">
                  <Layout>
                    <PayrollPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/payroll-backend" element={
                <ProtectedRoute requiredRole="administrador">
                  <Layout>
                    <PayrollBackendPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/payroll-history" element={
                <ProtectedRoute>
                  <Layout>
                    <PayrollHistoryPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/vouchers" element={
                <ProtectedRoute>
                  <Layout>
                    <VouchersPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/payments" element={
                <ProtectedRoute requiredRole="administrador">
                  <Layout>
                    <PaymentsPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/reports" element={
                <ProtectedRoute>
                  <Layout>
                    <ReportsPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/settings" element={
                <ProtectedRoute requiredRole="administrador">
                  <Layout>
                    <SettingsPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
        </SubscriptionProvider>
      </AuthProvider>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
