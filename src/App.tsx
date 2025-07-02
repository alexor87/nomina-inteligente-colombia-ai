
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";

// Pages
import DashboardPage from "./pages/DashboardPage";
import EmployeesPage from "./pages/EmployeesPage";
import PayrollPage from "./pages/PayrollPage";
import PayrollHistoryPage from "./pages/PayrollHistoryPage";
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
          <SidebarProvider>
            <div className="min-h-screen flex w-full">
              <AppSidebar />
              <main className="flex-1 flex flex-col">
                <header className="h-12 flex items-center border-b bg-white px-4">
                  <SidebarTrigger />
                </header>
                <div className="flex-1">
                  <Routes>
                    <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
                    <Route path="/app/dashboard" element={<DashboardPage />} />
                    <Route path="/app/employees" element={<EmployeesPage />} />
                    <Route path="/app/payroll" element={<PayrollPage />} />
                    <Route path="/app/payroll-history" element={<PayrollHistoryPage />} />
                    <Route path="/app/payroll-history/:id" element={<PayrollHistoryPage />} />
                    <Route path="/app/payroll-history/:id/edit" element={<PayrollHistoryPage />} />
                    <Route path="/app/reports" element={<ReportsPage />} />
                    <Route path="/app/settings" element={<SettingsPage />} />
                  </Routes>
                </div>
              </main>
            </div>
          </SidebarProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
