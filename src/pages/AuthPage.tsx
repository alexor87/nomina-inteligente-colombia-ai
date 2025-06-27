
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Building2, ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { CompanyRegistrationWizard } from '@/components/auth/CompanyRegistrationWizard';
import { CompanyService } from '@/services/CompanyService';
import { useCompanyRegistrationStore } from '@/components/auth/hooks/useCompanyRegistrationStore';

const AuthPage = () => {
  const { signIn, user, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegistrationWizard, setShowRegistrationWizard] = useState(false);
  const [processingRegistration, setProcessingRegistration] = useState(false);
  const { data } = useCompanyRegistrationStore();

  // Redirigir si ya está autenticado
  React.useEffect(() => {
    if (user) {
      navigate('/app/dashboard');
    }
  }, [user, navigate]);

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(loginForm.email, loginForm.password);
      
      if (error) {
        console.error('Login error:', error);
        let errorMessage = 'Ocurrió un error inesperado.';
        
        if (error.message === 'Invalid login credentials') {
          errorMessage = 'Credenciales inválidas. Verifica tu email y contraseña.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Por favor confirma tu email antes de iniciar sesión.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        toast({
          title: "Error de inicio de sesión",
          description: errorMessage,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Bienvenido",
          description: "Has iniciado sesión correctamente."
        });
        navigate('/app/dashboard');
      }
    } catch (error) {
      console.error('Unexpected login error:', error);
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrationComplete = async () => {
    setProcessingRegistration(true);
    
    try {
      console.log('Processing company registration:', data);
      
      // Convert wizard data to company registration format
      const registrationData = {
        nit: `${data.identificationNumber}-${data.verificationDigit}`,
        razon_social: data.identificationNumber || 'Mi Empresa',
        email: data.invitedMember?.email || 'contacto@empresa.com',
        telefono: '',
        ciudad: 'Bogotá',
        plan: 'profesional' as const,
      };

      const companyId = await CompanyService.createCompany({
        nit: registrationData.nit,
        razon_social: registrationData.razon_social,
        email: registrationData.email,
        telefono: registrationData.telefono,
        ciudad: registrationData.ciudad,
        plan: registrationData.plan,
      });
      
      console.log('Company created successfully:', companyId);
      
      // Refresh user data to ensure roles and profile are loaded
      await refreshUserData();
      
      toast({
        title: "¡Bienvenido a NóminaFácil!",
        description: "Tu empresa ha sido registrada exitosamente. ¡Comienza tu prueba gratuita!",
      });

      // Navigate to dashboard
      setTimeout(() => {
        navigate('/app/dashboard');
      }, 1500);
      
    } catch (error: any) {
      console.error('Error creating company:', error);
      
      let errorMessage = "Ha ocurrido un error inesperado";
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error al registrar empresa",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setProcessingRegistration(false);
      setShowRegistrationWizard(false);
    }
  };

  if (processingRegistration) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Configurando tu empresa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Registration Wizard Overlay */}
      {showRegistrationWizard && (
        <CompanyRegistrationWizard onComplete={handleRegistrationComplete} />
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Volver al inicio
            </button>
            
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-600 mr-2" />
              <h1 className="text-xl font-bold text-blue-600">NóminaFácil</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">Iniciar Sesión</CardTitle>
              <p className="text-gray-600 mt-2">
                Accede a tu plataforma de gestión de nómina
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium">
                    Correo electrónico
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="ejemplo@empresa.com"
                      className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 font-medium">
                    Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={loginForm.password}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Tu contraseña"
                      className="pl-10 pr-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Iniciando sesión...
                    </div>
                  ) : (
                    'Iniciar Sesión'
                  )}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">¿No tienes cuenta?</span>
                </div>
              </div>

              <Button
                onClick={() => setShowRegistrationWizard(true)}
                variant="outline"
                className="w-full h-12 border-blue-200 text-blue-600 hover:bg-blue-50 font-medium"
              >
                Registrar mi empresa
              </Button>

              <div className="text-center">
                <button className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </CardContent>
          </Card>

          <div className="text-center mt-8">
            <p className="text-gray-600 text-sm">
              Al iniciar sesión, aceptas nuestros{' '}
              <a href="#" className="text-blue-600 hover:underline">Términos de Servicio</a>{' '}
              y{' '}
              <a href="#" className="text-blue-600 hover:underline">Política de Privacidad</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
