
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Building2, ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { CompanyRegistrationWizard } from '@/components/auth/CompanyRegistrationWizard';
import { CompanyRegistrationService } from '@/services/CompanyRegistrationService';
import { useCompanyRegistrationStore } from '@/components/auth/hooks/useCompanyRegistrationStore';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCompanyWizard, setShowCompanyWizard] = useState(false);
  
  const { signIn, signUp, refreshUserData } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: wizardData } = useCompanyRegistrationStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Error de autenticación",
            description: error.message,
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Inicio de sesión exitoso",
          description: "Bienvenido de vuelta",
        });

        navigate('/app/dashboard');
      } else {
        const { error } = await signUp(email, password, firstName, lastName);
        if (error) {
          toast({
            title: "Error en el registro",
            description: error.message,
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Cuenta creada exitosamente",
          description: "Por favor verifica tu email para continuar",
        });

        // Auto-configure company if wizard data exists
        if (wizardData && Object.keys(wizardData).length > 0) {
          await handleQuickCompanySetup();
        } else {
          setShowCompanyWizard(true);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCompanySetup = async () => {
    try {
      console.log('🚀 Setting up company with wizard data:', wizardData);
      
      // Create company with wizard data
      const registrationData = {
        nit: wizardData.identificationNumber || '900000000-1',
        razon_social: wizardData.identificationNumber || 'Mi Empresa',
        email: wizardData.invitedMember?.email || email,
        telefono: '',
        direccion: 'Bogotá',
        plan: 'profesional' as const,
      };

      console.log('📝 Company registration data:', registrationData);
      
      const result = await CompanyRegistrationService.registerCompany(registrationData);
      
      if (!result.success) {
        throw new Error(result.message || 'Error registrando empresa');
      }
      
      console.log('✅ Company created successfully:', result.company?.id);
      
      // Refresh user data to ensure roles and profile are loaded
      await refreshUserData();
      
      toast({
        title: "¡Empresa configurada exitosamente!",
        description: "Tu plataforma está lista. Acceso completo habilitado.",
      });
      
      // Navigate to dashboard with full access
      setTimeout(() => {
        navigate('/app/dashboard');
      }, 1500);
      
    } catch (error: any) {
      console.error('❌ Error in quick company setup:', error);
      toast({
        title: "Error configurando empresa",
        description: error.message || "Error en la configuración automática",
        variant: "destructive",
      });
      
      // Fallback to wizard
      setShowCompanyWizard(true);
    }
  };

  const handleCompanyWizardComplete = async () => {
    setShowCompanyWizard(false);
    
    // Refresh user data to get the new company and roles
    await refreshUserData();
    
    toast({
      title: "¡Configuración completada!",
      description: "Tu empresa ha sido configurada exitosamente. Acceso completo habilitado.",
    });
    
    navigate('/app/dashboard');
  };

  if (showCompanyWizard) {
    return (
      <CompanyRegistrationWizard 
        onComplete={handleCompanyWizardComplete}
        onCancel={() => {
          setShowCompanyWizard(false);
          navigate('/app/dashboard');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </CardTitle>
          <CardDescription className="text-center">
            {isLogin 
              ? 'Accede a tu plataforma de nómina' 
              : 'Crea tu cuenta y configura tu empresa'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nombre</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required={!isLogin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Apellido</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required={!isLogin}
                    />
                  </div>
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {isLogin 
                ? '¿No tienes cuenta? Crear una nueva' 
                : '¿Ya tienes cuenta? Iniciar sesión'
              }
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
