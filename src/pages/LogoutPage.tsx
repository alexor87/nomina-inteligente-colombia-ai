
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Loader2 } from 'lucide-react';

const LogoutPage = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleLogout = async () => {
      await signOut();
      // Redirect after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    };

    handleLogout();
  }, [signOut, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Building2 className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Cerrando Sesión</h1>
        </div>

        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
            <p className="text-gray-600">Cerrando tu sesión...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LogoutPage;
