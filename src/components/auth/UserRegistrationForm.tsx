import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, User, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface UserRegistrationData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

export const UserRegistrationForm = () => {
  const [formData, setFormData] = useState<UserRegistrationData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.email.trim()) {
      toast({
        title: "Campo requerido",
        description: "El email es obligatorio",
        variant: "destructive"
      });
      return;
    }

    if (!formData.password.trim() || formData.password.length < 6) {
      toast({
        title: "Campo requerido",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive"
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Las contraseñas no coinciden",
        description: "Por favor verifica que ambas contraseñas sean iguales",
        variant: "destructive"
      });
      return;
    }

    if (!formData.firstName.trim()) {
      toast({
        title: "Campo requerido",
        description: "El nombre es obligatorio",
        variant: "destructive"
      });
      return;
    }

    if (!formData.lastName.trim()) {
      toast({
        title: "Campo requerido",
        description: "El apellido es obligatorio",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);

    try {
      console.log('Creating user account:', {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName
      });
      
      const { error } = await signUp(
        formData.email, 
        formData.password, 
        formData.firstName, 
        formData.lastName
      );
      
      if (error) {
        console.error('Registration error:', error);
        
        let errorMessage = "Ha ocurrido un error inesperado";
        
        if (error.message?.includes('User already registered') || error.message?.includes('already been registered')) {
          errorMessage = "Ya existe un usuario con este email";
        } else if (error.message?.includes('Invalid email')) {
          errorMessage = "El formato del email no es válido";
        } else if (error.message?.includes('Password should be at least 6 characters')) {
          errorMessage = "La contraseña debe tener al menos 6 caracteres";
        } else if (error.message?.includes('Signup is disabled')) {
          errorMessage = "El registro está temporalmente deshabilitado";
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        toast({
          title: "Error al registrar usuario",
          description: errorMessage,
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "¡Registro exitoso!",
        description: "Ahora configuremos tu empresa para completar el proceso.",
      });

      // Redirigir al asistente de configuración de empresa
      setTimeout(() => {
        navigate('/register/company');
      }, 1500);
      
    } catch (error: any) {
      console.error('Unexpected error during registration:', error);
      toast({
        title: "Error inesperado",
        description: "Ha ocurrido un error inesperado. Por favor intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof UserRegistrationData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <User className="h-12 w-12 text-blue-600 mr-3" />
              <CardTitle className="text-2xl">Crear Cuenta</CardTitle>
            </div>
            <CardDescription>
              Regístrate para acceder a la plataforma de nómina
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Nombre *</Label>
                  <Input
                    id="firstName"
                    placeholder="Juan"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Apellido *</Label>
                  <Input
                    id="lastName"
                    placeholder="Pérez"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">Contraseña *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    className="pl-10"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirma tu contraseña"
                    className="pl-10"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  'Crear cuenta'
                )}
              </Button>
            </form>

            <div className="text-center mt-6 space-y-2">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/auth')}
                className="text-gray-600"
              >
                ¿Ya tienes cuenta? Inicia sesión
              </Button>
              
              <div className="text-sm text-gray-500">
                ¿Necesitas registrar una empresa?{' '}
                <Button 
                  variant="link" 
                  onClick={() => navigate('/register/company')}
                  className="text-blue-600 p-0 h-auto"
                >
                  Registro empresarial
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
