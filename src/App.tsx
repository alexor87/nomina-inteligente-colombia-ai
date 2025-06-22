
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import EmployeesPage from "./pages/EmployeesPage";
import PayrollPage from "./pages/PayrollPage";
import PayrollHistoryPage from "./pages/PayrollHistoryPage";
import PaymentsPage from "./pages/PaymentsPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/empleados" element={<EmployeesPage />} />
          <Route path="/comprobantes" element={<div>Comprobantes - Próximamente</div>} />
          <Route path="/liquidar-nomina" element={<PayrollPage />} />
          <Route path="/historial-nomina" element={<PayrollHistoryPage />} />
          <Route path="/pagos" element={<PaymentsPage />} />
          <Route path="/dian" element={<div>DIAN / Nómina Electrónica - Próximamente</div>} />
          <Route path="/reportes" element={<ReportsPage />} />
          <Route path="/alertas" element={<div>Alertas - Próximamente</div>} />
          <Route path="/configuracion" element={<SettingsPage />} />
          {/* Legacy routes for compatibility */}
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/payroll" element={<PayrollPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
