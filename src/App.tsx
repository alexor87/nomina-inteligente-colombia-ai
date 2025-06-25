
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Layout } from "@/components/layout/Layout";

import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import EmployeesPage from "./pages/EmployeesPage";
import PayrollPage from "./pages/PayrollPage";
import PayrollBackendPage from "./pages/PayrollBackendPage";
import PayrollHistoryPage from "./pages/PayrollHistoryPage";
import PaymentsPage from "./pages/PaymentsPage";
import VouchersPage from "./pages/VouchersPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import { CompanyRegistrationPage } from "./pages/CompanyRegistrationPage";
import { SuperAdminPage } from "./pages/SuperAdminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SubscriptionProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/register" element={<CompanyRegistrationPage />} />
              
              {/* Protected routes with Layout */}
              <Route path="/dashboard" element={
                <ProtectedRoute module="dashboard">
                  <Layout>
                    <DashboardPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/employees" element={
                <ProtectedRoute module="employees">
                  <Layout>
                    <EmployeesPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/payroll" element={
                <ProtectedRoute module="payroll">
                  <Layout>
                    <PayrollPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/payroll-backend" element={
                <ProtectedRoute module="payroll">
                  <Layout>
                    <PayrollBackendPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/payroll-history" element={
                <ProtectedRoute module="payroll">
                  <Layout>
                    <PayrollHistoryPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/payments" element={
                <ProtectedRoute module="payments">
                  <Layout>
                    <PaymentsPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/vouchers" element={
                <ProtectedRoute module="vouchers">
                  <Layout>
                    <VouchersPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/reports" element={
                <ProtectedRoute module="reports">
                  <Layout>
                    <ReportsPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/settings" element={
                <ProtectedRoute module="settings">
                  <Layout>
                    <SettingsPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/super-admin" element={
                <ProtectedRoute requireSuperAdmin={true} module="super-admin">
                  <Layout>
                    <SuperAdminPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SubscriptionProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
