
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Layout } from "@/components/layout/Layout";

// Pages
import DashboardPage from "./pages/DashboardPage";
import EmployeesPage from "./pages/EmployeesPage";
import PayrollPage from "./pages/PayrollPage";
import PayrollHistoryPage from "./pages/PayrollHistoryPage";
import PayrollHistoryDetailsPage from "./pages/PayrollHistoryDetailsPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
              <Route path="/app" element={<Layout />}>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="employees" element={<EmployeesPage />} />
                <Route path="payroll" element={<PayrollPage />} />
                <Route path="payroll-history" element={<PayrollHistoryPage />} />
                <Route path="payroll-history/:id" element={<PayrollHistoryDetailsPage />} />
                <Route path="payroll-history/:id/edit" element={<PayrollHistoryDetailsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
