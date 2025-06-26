
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Index } from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import { CompanyRegistrationPage } from "./pages/CompanyRegistrationPage";
import DashboardPage from "./pages/DashboardPage";
import EmployeesPage from "./pages/EmployeesPage";
import PayrollPage from "./pages/PayrollPage";
import PayrollBackendPage from "./pages/PayrollBackendPage";
import PayrollHistoryPage from "./pages/PayrollHistoryPage";
import PayrollHistoryDetailsPage from "./pages/PayrollHistoryDetailsPage";
import VouchersPage from "./pages/VouchersPage";
import PaymentsPage from "./pages/PaymentsPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import { SupportBackofficePage } from "./pages/SupportBackofficePage";
import { SuperAdminPage } from "./pages/SuperAdminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SubscriptionProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/registro-empresa" element={<CompanyRegistrationPage />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/empleados" element={
                <ProtectedRoute>
                  <EmployeesPage />
                </ProtectedRoute>
              } />
              <Route path="/nomina" element={
                <ProtectedRoute>
                  <PayrollPage />
                </ProtectedRoute>
              } />
              <Route path="/nomina-backend" element={
                <ProtectedRoute>
                  <PayrollBackendPage />
                </ProtectedRoute>
              } />
              <Route path="/historial-nomina" element={
                <ProtectedRoute>
                  <PayrollHistoryPage />
                </ProtectedRoute>
              } />
              <Route path="/historial-nomina/:periodId" element={
                <ProtectedRoute>
                  <PayrollHistoryDetailsPage />
                </ProtectedRoute>
              } />
              <Route path="/comprobantes" element={
                <ProtectedRoute>
                  <VouchersPage />
                </ProtectedRoute>
              } />
              <Route path="/pagos" element={
                <ProtectedRoute>
                  <PaymentsPage />
                </ProtectedRoute>
              } />
              <Route path="/reportes" element={
                <ProtectedRoute>
                  <ReportsPage />
                </ProtectedRoute>
              } />
              <Route path="/configuracion" element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              } />
              <Route path="/soporte-backoffice" element={
                <ProtectedRoute>
                  <SupportBackofficePage />
                </ProtectedRoute>
              } />
              <Route path="/super-admin" element={
                <ProtectedRoute>
                  <SuperAdminPage />
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SubscriptionProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
