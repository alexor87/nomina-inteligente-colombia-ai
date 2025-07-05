
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Layout } from "@/components/layout/Layout";

// Pages
import { Index } from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import LogoutPage from "./pages/LogoutPage";
import DashboardPage from "./pages/DashboardPage";
import EmployeesPage from "./pages/EmployeesPage";
import CreateEmployeePage from "./pages/CreateEmployeePage";
import CreateEmployeeModernPage from "./pages/CreateEmployeeModernPage";
import EditEmployeePage from "./pages/EditEmployeePage";
import EmployeeDetailsPage from "./pages/EmployeeDetailsPage";
import PayrollPage from "./pages/PayrollPage";
import PayrollPageRobust from "./pages/PayrollPageRobust";
import PayrollHistoryPage from "./pages/PayrollHistoryPage";
import PayrollHistoryDetailsPage from "./pages/PayrollHistoryDetailsPage";
import PeriodEditPage from "./pages/PeriodEditPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import CompanySettingsPage from "./pages/CompanySettingsPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import BillingHistoryPage from "./pages/BillingHistoryPage";
import CompanyRegisterPage from "./pages/CompanyRegisterPage";
import { CompanyRegistrationPage } from "./pages/CompanyRegistrationPage";
import { SuperAdminPage } from "./pages/SuperAdminPage";
import { SupportBackofficePage } from "./pages/SupportBackofficePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <SubscriptionProvider>
              <Toaster />
              <Sonner />
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/logout" element={<LogoutPage />} />
                <Route path="/company-register" element={<CompanyRegisterPage />} />
                <Route path="/company-registration" element={<CompanyRegistrationPage />} />
                
                {/* Protected app routes */}
                <Route path="/app" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Navigate to="/app/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  
                  {/* Employee management */}
                  <Route path="employees" element={<EmployeesPage />} />
                  <Route path="employees/create" element={<CreateEmployeePage />} />
                  <Route path="employees/create-modern" element={<CreateEmployeeModernPage />} />
                  <Route path="employees/:id/edit" element={<EditEmployeePage />} />
                  <Route path="employees/:id" element={<EmployeeDetailsPage />} />
                  
                  {/* Payroll management */}
                  <Route path="payroll" element={<PayrollPageRobust />} />
                  <Route path="payroll-history" element={<PayrollHistoryPage />} />
                  <Route path="payroll-history/:periodId" element={<PayrollHistoryDetailsPage />} />
                  <Route path="period-edit/:periodId" element={<PeriodEditPage />} />
                  
                  {/* Reports */}
                  <Route path="reports" element={<ReportsPage />} />
                  
                  {/* Settings */}
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="company-settings" element={<CompanySettingsPage />} />
                  <Route path="subscription" element={<SubscriptionPage />} />
                  <Route path="billing-history" element={<BillingHistoryPage />} />
                </Route>
                
                {/* Super admin routes */}
                <Route path="/super-admin" element={
                  <ProtectedRoute requiredRole="soporte">
                    <SuperAdminPage />
                  </ProtectedRoute>
                } />
                
                <Route path="/support" element={
                  <ProtectedRoute requiredRole="soporte">
                    <SupportBackofficePage />
                  </ProtectedRoute>
                } />
                
                {/* Catch all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </SubscriptionProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
