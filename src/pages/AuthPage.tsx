
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AuthPage = () => {
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Redirigir si ya está autenticado
  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  const [signupForm, setSignupForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: ''
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
        navigate('/dashboard');
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Attempting signup with:', { 
        email: signupForm.email, 
        firstName: signupForm.firstName, 
        lastName: signupForm.lastName 
      });
      
      const { error } = await signUp(
        signupForm.email, 
        signupForm.password, 
        signupForm.firstName, 
        signupForm.lastName
      );
      
      if (error) {
        console.error('Signup error:', error);
        let errorMessage = 'Ocurrió un error inesperado.';
        
        if (error.message === 'User already registered') {
          errorMessage = 'El usuario ya está registrado. Intenta iniciar sesión.';
        } else if (error.message.includes('email_address_invalid')) {
          errorMessage = 'El formato del email no es válido. Usa un email como ejemplo@dominio.com';
        } else if (error.message.includes('weak_password')) {
          errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        toast({
          title: "Error de registro",
          description: errorMessage,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Registro exitoso",
          description: "Se ha enviado un email de confirmación a tu correo."
        });
        // Limpiar formulario
        setSignupForm({
          email: '',
          password: '',
          firstName: '',
          lastName: ''
        });
      }
    } catch (error) {
      console.error('Unexpected signup error:', error);
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">NóminaCol</h1>
          <p className="text-gray-600">Sistema de gestión de nómina</p>
        </div>

        <Card className="p-6">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="signup">Registrarse</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="admin@demo.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="admin123456"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg mb-4 text-sm">
                <strong>Credenciales de prueba:</strong><br/>
                Email: admin@demo.com<br/>
                Contraseña: admin123456
              </div>
              
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nombre</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={signupForm.firstName}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, firstName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Apellido</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={signupForm.lastName}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, lastName: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signupEmail">Email</Label>
                  <Input
                    id="signupEmail"
                    type="email"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="ejemplo@dominio.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signupPassword">Contraseña</Label>
                  <Input
                    id="signupPassword"
                    type="password"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Registrando...' : 'Registrarse'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
