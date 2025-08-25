
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Layout } from '@/components/layout/Layout';
import DashboardPage from '@/pages/DashboardPage';
import EmployeesPage from '@/pages/EmployeesPage';
import PayrollPage from '@/pages/PayrollPage';
import { ReportsPage } from '@/components/reports/ReportsPage';
import SettingsPage from '@/pages/SettingsPage';
import SocialBenefitsPage from '@/pages/SocialBenefitsPage';
import VacationsAbsencesPage from './pages/VacationsAbsencesPage';
import { AuthProvider } from '@/contexts/AuthContext';
import { RoleProvider } from '@/contexts/RoleContext';

// Create a client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RoleProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<DashboardPage />} />
                <Route path="employees" element={<EmployeesPage />} />
                <Route path="payroll" element={<PayrollPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="prestaciones-sociales" element={<SocialBenefitsPage />} />
                <Route path="vacations-absences" element={<VacationsAbsencesPage />} />
              </Route>
            </Routes>
            <Toaster />
          </BrowserRouter>
        </RoleProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
