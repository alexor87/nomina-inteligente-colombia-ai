
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import DashboardPage from "./pages/DashboardPage";
import EmployeesPage from "./pages/EmployeesPage";
import PayrollPage from "./pages/PayrollPage";
import PayrollBackendPage from "./pages/PayrollBackendPage";
import PayrollHistoryPage from "./pages/PayrollHistoryPage";
import PaymentsPage from "./pages/PaymentsPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import VouchersPage from "./pages/VouchersPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/empleados" element={<EmployeesPage />} />
            <Route path="/payroll" element={<PayrollPage />} />
            <Route path="/payroll-backend" element={<PayrollBackendPage />} />
            <Route path="/liquidar-nomina" element={<PayrollPage />} />
            <Route path="/payroll-history" element={<PayrollHistoryPage />} />
            <Route path="/historial-nomina" element={<PayrollHistoryPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/pagos" element={<PaymentsPage />} />
            <Route path="/vouchers" element={<VouchersPage />} />
            <Route path="/comprobantes" element={<VouchersPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/reportes" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/configuracion" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
