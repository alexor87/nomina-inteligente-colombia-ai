
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Building2 className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Recuperar Contraseña</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>¿Olvidaste tu contraseña?</CardTitle>
            <CardDescription>
              Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Enviar enlace de recuperación
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <div className="text-green-600 text-4xl mb-4">✓</div>
                <h3 className="font-semibold">¡Enlace enviado!</h3>
                <p className="text-gray-600 text-sm">
                  Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña.
                </p>
              </div>
            )}
            
            <div className="mt-6 text-center">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/login')}
                className="text-gray-600"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
