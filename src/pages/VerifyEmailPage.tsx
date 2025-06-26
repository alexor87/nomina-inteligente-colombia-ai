
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Loader2 } from 'lucide-react';

const VerifyEmailPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Simulate email verification
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsVerified(true);
      } catch (err) {
        setError('Error al verificar el email');
      } finally {
        setIsVerifying(false);
      }
    };

    if (token) {
      verifyEmail();
    } else {
      setError('Token de verificación no válido');
      setIsVerifying(false);
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Building2 className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Verificación de Email</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Verificando tu email</CardTitle>
            <CardDescription>
              Estamos confirmando tu dirección de correo electrónico
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            {isVerifying && (
              <div className="space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                <p className="text-gray-600">Verificando...</p>
              </div>
            )}

            {!isVerifying && isVerified && (
              <div className="space-y-4">
                <div className="text-green-600 text-4xl mb-4">✓</div>
                <h3 className="font-semibold">¡Email verificado!</h3>
                <p className="text-gray-600 text-sm">
                  Tu email ha sido verificado exitosamente. Ya puedes iniciar sesión.
                </p>
                <Button onClick={() => navigate('/login')} className="w-full">
                  Iniciar Sesión
                </Button>
              </div>
            )}

            {!isVerifying && error && (
              <div className="space-y-4">
                <div className="text-red-600 text-4xl mb-4">✗</div>
                <h3 className="font-semibold text-red-600">Error de verificación</h3>
                <p className="text-gray-600 text-sm">{error}</p>
                <Button onClick={() => navigate('/login')} variant="outline" className="w-full">
                  Volver al Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
