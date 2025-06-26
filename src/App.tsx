
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Layout } from '@/components/layout/Layout';

// Auth components
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import VerifyEmailPage from '@/pages/VerifyEmailPage';
import LogoutPage from '@/pages/LogoutPage';

// Pages
import DashboardPage from '@/pages/DashboardPage';
import PayrollIntelligentSilentPage from '@/pages/PayrollIntelligentSilentPage';
import EmployeesPage from '@/pages/EmployeesPage';
import SettingsPage from '@/pages/SettingsPage';
import PayrollHistoryPage from '@/pages/PayrollHistoryPage';
import PayrollHistoryDetailsPage from '@/pages/PayrollHistoryDetailsPage';
import CompanySettingsPage from '@/pages/CompanySettingsPage';
import SubscriptionPage from '@/pages/SubscriptionPage';
import BillingHistoryPage from '@/pages/BillingHistoryPage';
import EmployeeDetailsPage from '@/pages/EmployeeDetailsPage';
import CreateEmployeePage from '@/pages/CreateEmployeePage';
import EditEmployeePage from '@/pages/EditEmployeePage';
import PayrollPage from '@/pages/PayrollPage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SubscriptionProvider>
          <Router>
            <Routes>
              {/* Auth routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
              <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
              <Route path="/logout" element={<LogoutPage />} />
              
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                
                {/* Ruta actualizada para liquidación inteligente silenciosa */}
                <Route path="payroll" element={<PayrollIntelligentSilentPage />} />
                
                <Route path="employees" element={<EmployeesPage />} />
                <Route path="employees/create" element={<CreateEmployeePage />} />
                <Route path="employees/:employeeId" element={<EmployeeDetailsPage />} />
                <Route path="employees/:employeeId/edit" element={<EditEmployeePage />} />
                
                <Route path="settings" element={<SettingsPage />} />
                <Route path="company-settings" element={<CompanySettingsPage />} />
                
                <Route path="payroll-history" element={<PayrollHistoryPage />} />
                <Route path="payroll-history/:periodId" element={<PayrollHistoryDetailsPage />} />

                <Route path="subscription" element={<SubscriptionPage />} />
                <Route path="billing-history" element={<BillingHistoryPage />} />
              </Route>
            </Routes>
            <Toaster />
          </Router>
        </SubscriptionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
