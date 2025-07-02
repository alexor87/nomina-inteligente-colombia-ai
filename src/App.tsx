
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthContextProvider } from '@/contexts/AuthContext';
import { SubscriptionContextProvider } from '@/contexts/SubscriptionContext';
import Index from './pages/Index';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import CreateEmployeePage from './pages/CreateEmployeePage';
import CreateEmployeeModernPage from './pages/CreateEmployeeModernPage';
import EditEmployeePage from './pages/EditEmployeePage';
import EmployeeDetailsPage from './pages/EmployeeDetailsPage';
import PayrollPage from './pages/PayrollPage';
import PayrollPageRobust from './pages/PayrollPageRobust';
import PayrollHistoryPage from './pages/PayrollHistoryPage';
import PayrollHistoryDetailsPage from './pages/PayrollHistoryDetailsPage';
import PeriodEditPage from './pages/PeriodEditPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import CompanySettingsPage from './pages/CompanySettingsPage';
import SuperAdminPage from './pages/SuperAdminPage';
import SupportBackofficePage from './pages/SupportBackofficePage';
import SubscriptionPage from './pages/SubscriptionPage';
import BillingHistoryPage from './pages/BillingHistoryPage';
import AuthPage from './pages/AuthPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import CompanyRegisterPage from './pages/CompanyRegisterPage';
import CompanyRegistrationPage from './pages/CompanyRegistrationPage';
import LogoutPage from './pages/LogoutPage';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/auth/ProtectedRoute';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthContextProvider>
          <SubscriptionContextProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/company-register" element={<CompanyRegisterPage />} />
                <Route path="/company-registration" element={<CompanyRegistrationPage />} />
                <Route path="/logout" element={<LogoutPage />} />
                
                {/* Protected Routes */}
                <Route
                  path="/app/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/employees"
                  element={
                    <ProtectedRoute>
                      <EmployeesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/employees/create"
                  element={
                    <ProtectedRoute>
                      <CreateEmployeePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/employees/create-modern"
                  element={
                    <ProtectedRoute>
                      <CreateEmployeeModernPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/employees/:id/edit"
                  element={
                    <ProtectedRoute>
                      <EditEmployeePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/employees/:id"
                  element={
                    <ProtectedRoute>
                      <EmployeeDetailsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/payroll"
                  element={
                    <ProtectedRoute>
                      <PayrollPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/payroll-robust"
                  element={
                    <ProtectedRoute>
                      <PayrollPageRobust />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/payroll-history"
                  element={
                    <ProtectedRoute>
                      <PayrollHistoryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/payroll-history/:periodId"
                  element={
                    <ProtectedRoute>
                      <PayrollHistoryDetailsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/period/:periodId/edit"
                  element={
                    <ProtectedRoute>
                      <PeriodEditPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/reports"
                  element={
                    <ProtectedRoute>
                      <ReportsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/settings"
                  element={
                    <ProtectedRoute>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/company-settings"
                  element={
                    <ProtectedRoute>
                      <CompanySettingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/subscription"
                  element={
                    <ProtectedRoute>
                      <SubscriptionPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/billing-history"
                  element={
                    <ProtectedRoute>
                      <BillingHistoryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <SuperAdminPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/support-backoffice"
                  element={
                    <ProtectedRoute>
                      <SupportBackofficePage />
                    </ProtectedRoute>
                  }
                />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </SubscriptionContextProvider>
        </AuthContextProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
