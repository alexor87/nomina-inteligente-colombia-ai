
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { useSystemInitialization } from "@/hooks/useSystemInitialization";
import { Layout } from "@/components/layout/Layout";

// Components and pages
import { Index } from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import EmployeesPage from "./pages/EmployeesPage";
import CreateEmployeeModernPage from "./pages/CreateEmployeeModernPage";
import EditEmployeePage from "./pages/EditEmployeePage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import PayrollLiquidationPageSimplified from "./pages/PayrollLiquidationPageSimplified";
import VacationsAbsencesPage from "./pages/VacationsAbsencesPage";

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
        
        {/* Rutas protegidas con Layout */}
        <Route path="/app" element={<Layout />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="employees/create" element={<CreateEmployeeModernPage />} />
          <Route path="employees/:employeeId/edit" element={<EditEmployeePage />} />
          <Route path="payroll" element={<PayrollLiquidationPageSimplified />} />
          <Route path="vacations-absences" element={<VacationsAbsencesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
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
            <BrowserRouter>
              <AppContent />
              <Toaster />
              <Sonner />
            </BrowserRouter>
          </SubscriptionProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
