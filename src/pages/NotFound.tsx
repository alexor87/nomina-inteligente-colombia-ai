
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Home, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  const handleGoToLogin = async () => {
    // Force logout before going to login
    await signOut();
    navigate('/auth');
  };

  const handleGoToHome = async () => {
    // Force logout before going to home
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <Card className="max-w-md w-full text-center shadow-lg">
        <CardHeader className="pb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            ¡Oops! Algo salió mal
          </CardTitle>
          <CardDescription className="text-gray-600 mt-2">
            Ha ocurrido un error inesperado. Esto puede deberse a problemas de conectividad o configuración de la sesión.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">
            Si el problema persiste, intenta iniciar sesión nuevamente o contacta al soporte técnico.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={handleGoToLogin}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Ir al Login
            </Button>
            <Button 
              onClick={handleGoToHome}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <Home className="h-4 w-4 mr-2" />
              Ir al Inicio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
