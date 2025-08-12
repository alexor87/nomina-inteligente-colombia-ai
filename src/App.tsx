
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { YearProvider } from "@/contexts/YearContext";
import { useSystemInitialization } from "@/hooks/useSystemInitialization";
import { Layout } from "@/components/layout/Layout";

// Components and pages
import { Index } from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import LogoutPage from "./pages/LogoutPage";
import DashboardPage from "./pages/DashboardPage";
import EmployeesPage from "./pages/EmployeesPage";
import CreateEmployeeModernPage from "./pages/CreateEmployeeModernPage";
import EditEmployeePage from "./pages/EditEmployeePage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import PayrollLiquidationPageSimplified from "./pages/PayrollLiquidationPageSimplified";
import VacationsAbsencesPage from "./pages/VacationsAbsencesPage";
import { PayrollHistoryPage } from "./pages/PayrollHistoryPage";
import { PayrollHistoryDetailPage } from "./pages/PayrollHistoryDetailPage";
import CompanyRegistrationPage from "./pages/CompanyRegistrationPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

const queryClient = new QueryClient();

/**
 * ✅ APLICACIÓN PRINCIPAL DE NÓMINA
 * Sistema simplificado de gestión de nómina
 */
function AppContent() {
  // Inicialización automática del sistema
  const { isInitializing, systemStatus } = useSystemInitialization();

  return (
    <div className="min-h-screen bg-background">
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register/company" element={<CompanyRegistrationPage />} />
        <Route path="/auth" element={<Navigate to="/login" replace />} />
        <Route path="/logout" element={<LogoutPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        {/* Rutas protegidas con Layout */}
        <Route path="/app" element={<Layout />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="employees/create" element={<CreateEmployeeModernPage />} />
          <Route path="employees/:employeeId/edit" element={<EditEmployeePage />} />
          <Route path="payroll" element={<PayrollLiquidationPageSimplified />} />
          <Route path="payroll-history" element={<PayrollHistoryPage />} />
          <Route path="payroll-history/:periodId" element={<PayrollHistoryDetailPage />} />
          <Route path="vacations-absences" element={<VacationsAbsencesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Routes>
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
              <AppContent />
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
