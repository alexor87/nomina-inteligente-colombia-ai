import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { useSystemInitialization } from "@/hooks/useSystemInitialization";
import { Layout } from "@/components/layout/Layout";
import { PayrollLiquidationUnified } from "@/components/payroll/PayrollLiquidationUnified";
import { PayrollHistoryUnified } from "@/components/payroll-history/PayrollHistoryUnified";

// Components and pages
import { Index } from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import EmployeesPage from "./pages/EmployeesPage";
// ✅ ALELUYA: Importar páginas nuevas unificadas
import PayrollPageAleluya from "./pages/PayrollPageAleluya";
import PayrollHistoryPageAleluya from "./pages/PayrollHistoryPageAleluya";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";

const queryClient = new QueryClient();

/**
 * ✅ COMPONENTE PRINCIPAL CON ARQUITECTURA ALELUYA
 * Ahora usa páginas unificadas sin complejidad técnica expuesta
 */
function AppContent() {
  // Inicialización automática del sistema
  const { isInitializing, systemStatus } = useSystemInitialization();

  return (
    <div className="min-h-screen bg-background">
      {/* ✅ ALELUYA: Sin indicador de inicialización técnica - UX limpia */}
      
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Rutas protegidas con Layout */}
        <Route path="/app" element={<Layout />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="employees" element={<EmployeesPage />} />
          {/* ✅ ALELUYA: Usar páginas simplificadas */}
          <Route path="payroll" element={<PayrollPageAleluya />} />
          <Route path="payroll-history" element={<PayrollHistoryPageAleluya />} />
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
