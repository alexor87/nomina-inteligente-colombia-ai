import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { AppLayout } from '@/components/layout/AppLayout';
import { Dashboard } from '@/pages/Dashboard';
import { Employees } from '@/pages/Employees';
import { EmployeeForm } from '@/pages/EmployeeForm';
import { Payroll } from '@/pages/Payroll';
import Index from './pages/Index'; // Fixed: default import
import { Settings } from '@/pages/Settings';
import { PayrollPeriods } from '@/pages/PayrollPeriods';
import { PayrollModern } from '@/pages/PayrollModern';
import { VoucherGenerator } from '@/pages/VoucherGenerator';
import { Reports } from '@/pages/Reports';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-react-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<Index />} />

              <Route
                path="/app/*"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Routes>
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="employees" element={<Employees />} />
                        <Route path="employees/create" element={<EmployeeForm />} />
                        <Route path="employees/edit/:id" element={<EmployeeForm />} />
                        <Route path="payroll" element={<Payroll />} />
                        <Route path="payroll/modern" element={<PayrollModern />} />
                        <Route path="payroll/periods" element={<PayrollPeriods />} />
                        <Route path="vouchers" element={<VoucherGenerator />} />
                        <Route path="reports" element={<Reports />} />
                        <Route path="settings" element={<Settings />} />
                        <Route path="*" element={<Navigate to="dashboard" />} />
                      </Routes>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Router>
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
