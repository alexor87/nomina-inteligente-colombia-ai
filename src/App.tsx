import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { useSystemInitialization } from "@/hooks/useSystemInitialization";

// Components and pages
import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import EmployeesPage from "./pages/EmployeesPage";
import PayrollPage from "./pages/PayrollPage";
import PayrollHistoryPage from "./pages/PayrollHistoryPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";

const queryClient = new QueryClient();

/**
 * ✅ COMPONENTE PRINCIPAL CON INICIALIZACIÓN CRÍTICA
 * Incluye diagnóstico y reparación automática al cargar
 */
function AppContent() {
  // Inicialización automática del sistema
  const { isInitializing, systemStatus } = useSystemInitialization();

  return (
    <div className="min-h-screen bg-background">
      {/* Indicador de inicialización crítica */}
      {isInitializing && (
        <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white px-4 py-2 text-center text-sm z-50">
          🔧 Inicializando y diagnosticando sistema de nómina...
        </div>
      )}
      
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/app/dashboard" element={<DashboardPage />} />
        <Route path="/app/employees" element={<EmployeesPage />} />
        <Route path="/app/payroll" element={<PayrollPage />} />
        <Route path="/app/payroll-history" element={<PayrollHistoryPage />} />
        <Route path="/app/reports" element={<ReportsPage />} />
        <Route path="/app/settings" element={<SettingsPage />} />
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
