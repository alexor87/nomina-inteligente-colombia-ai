
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Users, Calculator, FileText, TrendingUp, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthDialog } from '@/components/auth/AuthDialog';

const Index = () => {
  const navigate = useNavigate();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const features = [
    {
      icon: <Users className="h-8 w-8 text-blue-600" />,
      title: "Gestión de Empleados",
      description: "Administra la información completa de tus empleados con campos personalizables."
    },
    {
      icon: <Calculator className="h-8 w-8 text-green-600" />,
      title: "Nómina Automatizada",
      description: "Calcula automáticamente salarios, deducciones y aportes patronales."
    },
    {
      icon: <FileText className="h-8 w-8 text-purple-600" />,
      title: "Comprobantes Digitales",
      description: "Genera comprobantes de pago digitales cumpliendo con normativas colombianas."
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-orange-600" />,
      title: "Reportes Avanzados",
      description: "Obtén insights detallados sobre costos laborales y tendencias."
    },
    {
      icon: <Building2 className="h-8 w-8 text-indigo-600" />,
      title: "Multi-empresa",
      description: "Gestiona múltiples empresas desde una sola plataforma."
    },
    {
      icon: <Shield className="h-8 w-8 text-red-600" />,
      title: "Seguridad Avanzada",
      description: "Protección de datos con cifrado y auditoría completa."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Calculator className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Nómina Inteligente</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => setShowAuthDialog(true)}
              >
                Iniciar Sesión
              </Button>
              <Button 
                onClick={() => setShowAuthDialog(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Comenzar Gratis
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6">
            Nómina Inteligente para
            <span className="text-blue-600"> Colombia</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            La plataforma más completa para gestionar nómina, empleados y cumplimiento legal 
            en Colombia. Automatiza procesos y cumple con todas las normativas laborales.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => setShowAuthDialog(true)}
              className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3"
            >
              Comenzar Prueba Gratuita
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => setShowAuthDialog(true)}
              className="text-lg px-8 py-3"
            >
              Ver Características
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Todo lo que necesitas para tu nómina
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Herramientas completas y seguras para gestionar la nómina de tu empresa
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="mb-4">{feature.icon}</div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            ¿Listo para automatizar tu nómina?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Únete a cientos de empresas que ya confían en nuestra plataforma
          </p>
          <Button 
            size="lg" 
            onClick={() => setShowAuthDialog(true)}
            className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-3"
          >
            Comenzar Ahora
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Calculator className="h-8 w-8 text-blue-400" />
            <span className="ml-2 text-xl font-bold">Nómina Inteligente</span>
          </div>
          <p className="text-gray-400">
            © 2024 Nómina Inteligente. Plataforma segura para la gestión de nómina en Colombia.
          </p>
        </div>
      </footer>

      <AuthDialog 
        open={showAuthDialog} 
        onOpenChange={setShowAuthDialog} 
      />
    </div>
  );
};

export default Index;
