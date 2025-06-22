
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-blue-600 mb-4">NóminaCol</h1>
          <p className="text-xl text-gray-600 mb-8">
            Sistema integral de gestión de nómina para empresas colombianas
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-lg font-semibold mb-2">Dashboard Intuitivo</h3>
            <p className="text-gray-600">Visualiza métricas clave y mantén control total de tu nómina</p>
          </Card>
          
          <Card className="p-6">
            <div className="text-3xl mb-4">👥</div>
            <h3 className="text-lg font-semibold mb-2">Gestión de Empleados</h3>
            <p className="text-gray-600">Administra información completa de tu personal</p>
          </Card>
          
          <Card className="p-6">
            <div className="text-3xl mb-4">🧾</div>
            <h3 className="text-lg font-semibold mb-2">Cumplimiento Legal</h3>
            <p className="text-gray-600">Mantente al día con las normativas colombianas</p>
          </Card>
        </div>

        <div className="space-y-4">
          <Button 
            onClick={() => navigate('/auth')} 
            size="lg"
            className="text-lg px-8 py-3"
          >
            Iniciar Sesión
          </Button>
          <p className="text-sm text-gray-500">
            ¿No tienes cuenta? Puedes registrarte en la página de inicio de sesión
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
