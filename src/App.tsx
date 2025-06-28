
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import RealtimeService from '@/components/RealtimeService';
import { Layout } from '@/components/layout/Layout';
import { Index } from '@/pages/Index';
import AuthPage from '@/pages/AuthPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import VerifyEmailPage from '@/pages/VerifyEmailPage';
import LogoutPage from '@/pages/LogoutPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import DashboardPage from '@/pages/DashboardPage';
import EmployeesPage from '@/pages/EmployeesPage';
import CreateEmployeePage from '@/pages/CreateEmployeePage';
import CreateEmployeeModernPage from '@/pages/CreateEmployeeModernPage';
import EmployeeDetailsPage from '@/pages/EmployeeDetailsPage';
import EditEmployeePage from '@/pages/EditEmployeePage';
import PayrollPage from '@/pages/PayrollPage';
import PayrollModernPage from '@/pages/PayrollModernPage';
import PayrollIntelligentPage from '@/pages/PayrollIntelligentPage';
import PayrollIntelligentSilentPage from '@/pages/PayrollIntelligentSilentPage';
import PayrollHistoryPage from '@/pages/PayrollHistoryPage';
import PayrollHistoryDetailsPage from '@/pages/PayrollHistoryDetailsPage';
import PeriodEditPage from '@/pages/PeriodEditPage';
import ReportsPage from '@/pages/ReportsPage';
import SettingsPage from '@/pages/SettingsPage';
import CompanySettingsPage from '@/pages/CompanySettingsPage';
import SubscriptionPage from '@/pages/SubscriptionPage';
import BillingHistoryPage from '@/pages/BillingHistoryPage';
import { SupportBackofficePage } from '@/pages/SupportBackofficePage';
import { SuperAdminPage } from '@/pages/SuperAdminPage';
import CompanyRegisterPage from '@/pages/CompanyRegisterPage';
import { CompanyRegistrationPage } from '@/pages/CompanyRegistrationPage';
import NotFound from '@/pages/NotFound';
import { Toaster } from '@/components/ui/toaster';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SubscriptionProvider>
          <RealtimeService />
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/logout" element={<LogoutPage />} />
              
              {/* Legacy route redirects - redirect old URLs to new /app prefixed ones */}
              <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
              <Route path="/employees" element={<Navigate to="/app/employees" replace />} />
              <Route path="/employees/create" element={<Navigate to="/app/employees/create" replace />} />
              <Route path="/employees/create-modern" element={<Navigate to="/app/employees/create-modern" replace />} />
              <Route path="/employees/:id" element={<Navigate to="/app/employees/:id" replace />} />
              <Route path="/employees/:id/edit" element={<Navigate to="/app/employees/:id/edit" replace />} />
              <Route path="/payroll" element={<Navigate to="/app/payroll" replace />} />
              <Route path="/payroll-modern" element={<Navigate to="/app/payroll-modern" replace />} />
              <Route path="/payroll-intelligent" element={<Navigate to="/app/payroll-intelligent" replace />} />
              <Route path="/payroll-intelligent-silent" element={<Navigate to="/app/payroll-intelligent-silent" replace />} />
              <Route path="/payroll-history" element={<Navigate to="/app/payroll-history" replace />} />
              <Route path="/payroll-history/:periodId" element={<Navigate to="/app/payroll-history/:periodId" replace />} />
              <Route path="/payroll-history/:periodId/edit" element={<Navigate to="/app/payroll-history/:periodId/edit" replace />} />
              <Route path="/reports" element={<Navigate to="/app/reports" replace />} />
              <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
              <Route path="/company-settings" element={<Navigate to="/app/company-settings" replace />} />
              <Route path="/subscription" element={<Navigate to="/app/subscription" replace />} />
              <Route path="/billing-history" element={<Navigate to="/app/billing-history" replace />} />
              <Route path="/support-backoffice" element={<Navigate to="/app/support-backoffice" replace />} />
              <Route path="/superadmin" element={<Navigate to="/app/superadmin" replace />} />
              
              <Route path="/app" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<DashboardPage />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="employees" element={<EmployeesPage />} />
                <Route path="employees/create" element={<CreateEmployeePage />} />
                <Route path="employees/create-modern" element={<CreateEmployeeModernPage />} />
                <Route path="employees/:id" element={<EmployeeDetailsPage />} />
                <Route path="employees/:id/edit" element={<EditEmployeePage />} />
                <Route path="payroll" element={<PayrollPage />} />
                <Route path="payroll-modern" element={<PayrollModernPage />} />
                <Route path="payroll-intelligent" element={<PayrollIntelligentPage />} />
                <Route path="payroll-intelligent-silent" element={<PayrollIntelligentSilentPage />} />
                <Route path="payroll-history" element={<PayrollHistoryPage />} />
                <Route path="payroll-history/:periodId" element={<PayrollHistoryDetailsPage />} />
                <Route path="payroll-history/:periodId/edit" element={<PeriodEditPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="company-settings" element={<CompanySettingsPage />} />
                <Route path="subscription" element={<SubscriptionPage />} />
                <Route path="billing-history" element={<BillingHistoryPage />} />
                <Route path="support-backoffice" element={<SupportBackofficePage />} />
                <Route path="superadmin" element={<SuperAdminPage />} />
              </Route>
              
              <Route path="/company-register" element={<CompanyRegisterPage />} />
              <Route path="/company-registration" element={<CompanyRegistrationPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
          </div>
        </SubscriptionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
