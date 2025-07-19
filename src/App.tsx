
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useVacationNovedadSync } from "@/hooks/useVacationNovedadSync";
import { Index } from "./pages/Index";

const queryClient = new QueryClient();

const AppContent = () => {
  // ✅ INICIALIZAR SINCRONIZACIÓN BIDIRECCIONAL GLOBALMENTE
  useVacationNovedadSync();
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<Index />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
