import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Layout } from '@/components/layout/Layout';
import { useRealtimeCleanup } from '@/hooks/useRealtimeCleanup';

// Public pages
import { Index } from '@/pages/Index';
import AuthPage from '@/pages/AuthPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import VerifyEmailPage from '@/pages/VerifyEmailPage';
import LogoutPage from '@/pages/LogoutPage';

// Protected pages
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
import CreateEmployeeModernPage from '@/pages/CreateEmployeeModernPage';
import EditEmployeeModernPageFixed from '@/pages/EditEmployeeModernPageFixed';
import PayrollPage from '@/pages/PayrollPage';
import ReportsPage from '@/pages/ReportsPage';

const queryClient = new QueryClient();

function AppContent() {
  // Hook para limpiar suscripciones realtime
  useRealtimeCleanup();

  return (
    <Router>
      <Routes>
        {/* Public root page - Landing page */}
        <Route path="/" element={<Index />} />
        
        {/* Auth routes - Public */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/login" element={<Navigate to="/auth" replace />} />
        <Route path="/register" element={<Navigate to="/auth" replace />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
        <Route path="/logout" element={<LogoutPage />} />
        
        {/* Protected routes - Main app */}
        <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          
          {/* Ruta actualizada para liquidación inteligente silenciosa */}
          <Route path="payroll" element={<PayrollIntelligentSilentPage />} />
          
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="employees/create" element={<CreateEmployeeModernPage />} />
          <Route path="employees/:employeeId" element={<EmployeeDetailsPage />} />
          <Route path="employees/:employeeId/edit" element={<EditEmployeeModernPageFixed />} />
          
          <Route path="settings" element={<SettingsPage />} />
          <Route path="company-settings" element={<CompanySettingsPage />} />
          
          <Route path="payroll-history" element={<PayrollHistoryPage />} />
          <Route path="payroll-history/:periodId" element={<PayrollHistoryDetailsPage />} />

          <Route path="subscription" element={<SubscriptionPage />} />
          <Route path="billing-history" element={<BillingHistoryPage />} />
          
          <Route path="reports" element={<ReportsPage />} />
        </Route>

        {/* Legacy redirects for backward compatibility */}
        <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/payroll" element={<Navigate to="/app/payroll" replace />} />
        <Route path="/employees" element={<Navigate to="/app/employees" replace />} />
        <Route path="/employees/create" element={<Navigate to="/app/employees/create" replace />} />
        <Route path="/employees/:employeeId" element={<Navigate to="/app/employees/:employeeId" replace />} />
        <Route path="/employees/:employeeId/edit" element={<Navigate to="/app/employees/:employeeId/edit" replace />} />
        <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
        <Route path="/company-settings" element={<Navigate to="/app/company-settings" replace />} />
        <Route path="/payroll-history" element={<Navigate to="/app/payroll-history" replace />} />
        <Route path="/subscription" element={<Navigate to="/app/subscription" replace />} />
        <Route path="/billing-history" element={<Navigate to="/app/billing-history" replace />} />
        <Route path="/reports" element={<Navigate to="/app/reports" replace />} />
      </Routes>
      <Toaster />
    </Router>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SubscriptionProvider>
          <AppContent />
        </SubscriptionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
