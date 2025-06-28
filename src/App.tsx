import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import RealtimeService from '@/components/RealtimeService';
import Layout from '@/components/Layout';
import Index from '@/pages/Index';
import AuthPage from '@/pages/AuthPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import VerifyEmailPage from '@/pages/VerifyEmailPage';
import LogoutPage from '@/pages/LogoutPage';
import ProtectedRoute from '@/components/ProtectedRoute';
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
import PayrollHistoryPage from '@/components/payroll-history/PayrollHistoryPage';
import PayrollHistoryDetailsPage from '@/pages/PayrollHistoryDetailsPage';
import PeriodEditPage from '@/pages/PeriodEditPage';
import ReportsPage from '@/pages/ReportsPage';
import SettingsPage from '@/pages/SettingsPage';
import CompanySettingsPage from '@/pages/CompanySettingsPage';
import SubscriptionPage from '@/pages/SubscriptionPage';
import BillingHistoryPage from '@/pages/BillingHistoryPage';
import SupportBackofficePage from '@/pages/SupportBackofficePage';
import SuperAdminPage from '@/pages/SuperAdminPage';
import CompanyRegisterPage from '@/pages/CompanyRegisterPage';
import CompanyRegistrationPage from '@/pages/CompanyRegistrationPage';
import NotFound from '@/pages/NotFound';
import { Toaster } from '@/components/ui/toaster';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
