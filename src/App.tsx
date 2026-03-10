
import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { YearProvider } from "@/contexts/YearContext";
import { useSystemInitialization } from "@/hooks/useSystemInitialization";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MayaFullScreenLayout } from "@/components/maya-page/layouts/MayaFullScreenLayout";
import { RootRedirect } from "@/components/routing/RootRedirect";
import { AdminLayout } from "@/components/admin/AdminLayout";

// Lazy-loaded pages for reduced initial bundle
const Index = lazy(() => import("./pages/Index"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const LogoutPage = lazy(() => import("./pages/LogoutPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const EmployeesPage = lazy(() => import("./pages/EmployeesPage"));
const CreateEmployeeModernPage = lazy(() => import("./pages/CreateEmployeeModernPage"));
const EditEmployeePage = lazy(() => import("./pages/EditEmployeePage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const PayrollLiquidationPageSimplified = lazy(() => import("./pages/PayrollLiquidationPageSimplified"));
const VacationsAbsencesPage = lazy(() => import("./pages/VacationsAbsencesPage"));
const PayrollHistoryPage = lazy(() => import("./pages/PayrollHistoryPage").then(m => ({ default: m.PayrollHistoryPage })));
const PayrollHistoryDetailPage = lazy(() => import("./pages/PayrollHistoryDetailPage"));
const CompanyRegistrationPage = lazy(() => import("./pages/CompanyRegistrationPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const SocialBenefitsPage = lazy(() => import("./pages/SocialBenefitsPage"));
const SocialBenefitLiquidationPage = lazy(() => import("./pages/SocialBenefitLiquidationPage"));
const MayaPage = lazy(() => import("./pages/MayaPage"));
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const AdminCompaniesPage = lazy(() => import("./pages/admin/AdminCompaniesPage"));
const AdminCompanyDetailPage = lazy(() => import("./pages/admin/AdminCompanyDetailPage"));
const AdminSubscriptionsPage = lazy(() => import("./pages/admin/AdminSubscriptionsPage"));
const AdminPlansPage = lazy(() => import("./pages/admin/AdminPlansPage"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminSettingsPage = lazy(() => import("./pages/admin/AdminSettingsPage"));
const AdminNotificationsPage = lazy(() => import("./pages/admin/AdminNotificationsPage"));
const AdminBillingPage = lazy(() => import("./pages/admin/AdminBillingPage"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

function AppContent() {
  const { isInitializing, systemStatus } = useSystemInitialization();

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/home" element={<Index />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register/company" element={<CompanyRegistrationPage />} />
          <Route path="/auth" element={<Navigate to="/login" replace />} />
          <Route path="/logout" element={<LogoutPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/app" element={<Navigate to="/modules/dashboard" replace />} />

          {/* SuperAdmin Routes */}
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/companies" element={<AdminCompaniesPage />} />
            <Route path="/admin/companies/:companyId" element={<AdminCompanyDetailPage />} />
            <Route path="/admin/plans" element={<AdminPlansPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/subscriptions" element={<AdminSubscriptionsPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
          </Route>

          <Route element={<MayaFullScreenLayout />}>
            <Route path="/maya" element={<MayaPage />} />
            <Route path="/modules/dashboard" element={<DashboardPage />} />
            <Route path="/modules/employees" element={<EmployeesPage />} />
            <Route path="/modules/employees/create" element={<CreateEmployeeModernPage />} />
            <Route path="/modules/employees/:employeeId/edit" element={<EditEmployeePage />} />
            <Route path="/modules/payroll" element={<PayrollLiquidationPageSimplified />} />
            <Route path="/modules/payroll-history" element={<PayrollHistoryPage />} />
            <Route path="/modules/payroll-history/:periodId" element={<PayrollHistoryDetailPage />} />
            <Route path="/modules/prestaciones-sociales" element={<SocialBenefitsPage />} />
            <Route path="/modules/prestaciones-sociales/liquidar/:benefitType/:periodKey" element={<SocialBenefitLiquidationPage />} />
            <Route path="/modules/vacations-absences" element={<VacationsAbsencesPage />} />
            <Route path="/modules/reports" element={<ReportsPage />} />
            <Route path="/modules/settings" element={<SettingsPage />} />
            <Route path="/modules/profile" element={<ProfilePage />} />
          </Route>
        </Routes>
      </Suspense>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <YearProvider>
              <BrowserRouter>
                <ErrorBoundary>
                  <AppContent />
                </ErrorBoundary>
                <Toaster />
                <Sonner />
              </BrowserRouter>
            </YearProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
