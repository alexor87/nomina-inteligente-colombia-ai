import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient } from './integrations/queryClient';
import { Toaster } from '@/components/ui/toaster';
import { Shell } from '@/components/Shell';
import { DashboardPage } from '@/pages/DashboardPage';
import { EmployeesPage } from '@/pages/EmployeesPage';
import { PayrollPage } from '@/pages/PayrollPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ProvisionSocialBenefitsPage } from '@/pages/ProvisionSocialBenefitsPage';
import { VacationsAbsencesPage } from './pages/VacationsAbsencesPage';
import { VoiceAgentProvider } from '@/contexts/VoiceAgentContext';
import { OptimizedVoiceAgent } from '@/components/voice/OptimizedVoiceAgent';

function App() {
  return (
    <QueryClient>
      <BrowserRouter>
        <VoiceAgentProvider>
          <Routes>
            <Route path="/" element={<Shell />}>
              <Route index element={<DashboardPage />} />
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="payroll" element={<PayrollPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="prestaciones-sociales" element={<ProvisionSocialBenefitsPage />} />
              <Route path="vacations-absences" element={<VacationsAbsencesPage />} />
            </Route>
          </Routes>
          <OptimizedVoiceAgent />
          <Toaster />
        </VoiceAgentProvider>
      </BrowserRouter>
    </QueryClient>
  );
}

export default App;
