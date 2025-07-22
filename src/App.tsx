
import { Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/toaster";
import { Layout } from '@/components/layout/Layout';
import { AuthProvider } from '@/contexts/AuthContext';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { EmployeesPage } from '@/pages/EmployeesPage';
import { PayrollPage } from '@/pages/PayrollPage';
import { PayrollHistoryPage } from '@/pages/PayrollHistoryPage';
import { PayrollHistoryDetailsPage } from '@/pages/PayrollHistoryDetailsPage';
import { PayrollAdjustmentPage } from '@/pages/PayrollAdjustmentPage';
import { VacationsAbsencesPage } from '@/pages/VacationsAbsencesPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/app" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="payroll" element={<PayrollPage />} />
            <Route path="payroll-history" element={<PayrollHistoryPage />} />
            <Route path="payroll-history/:periodId" element={<PayrollHistoryDetailsPage />} />
            <Route path="payroll-history/:periodId/adjust" element={<PayrollAdjustmentPage />} />
            <Route path="vacations-absences" element={<VacationsAbsencesPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="/" element={<LoginPage />} />
        </Routes>
      </AuthProvider>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
