
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Calculator, FileText, TrendingUp, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const features = [
    {
      icon: <Users className="h-8 w-8 text-blue-600" />,
      title: "Gestión de Empleados",
      description: "Administra toda la información de tus empleados de forma centralizada"
    },
    {
      icon: <Calculator className="h-8 w-8 text-green-600" />,
      title: "Liquidación de Nómina",
      description: "Calcula automáticamente salarios, deducciones y prestaciones sociales"
    },
    {
      icon: <FileText className="h-8 w-8 text-purple-600" />,
      title: "Comprobantes Digitales",
      description: "Genera y envía comprobantes de pago electrónicos automáticamente"
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-orange-600" />,
      title: "Reportes Avanzados",
      description: "Analiza costos laborales y genera reportes para la DIAN"
    },
    {
      icon: <Shield className="h-8 w-8 text-red-600" />,
      title: "Cumplimiento Legal",
      description: "Mantente al día con la legislación laboral colombiana"
    },
    {
      icon: <Building2 className="h-8 w-8 text-indigo-600" />,
      title: "Multi-empresa",
      description: "Administra múltiples empresas desde una sola plataforma"
    }
  ];

  const plans = [
    {
      name: "Plan Básico",
      price: "$99.000",
      period: "/mes",
      features: [
        "Hasta 5 empleados",
        "1 nómina por mes",
        "Comprobantes PDF",
        "Soporte por email",
        "Reportes básicos"
      ],
      popular: false
    },
    {
      name: "Plan Profesional",
      price: "$299.000",
      period: "/mes",
      features: [
        "Hasta 25 empleados",
        "12 nóminas por mes",
        "Nómina electrónica",
        "Soporte telefónico",
        "Reportes avanzados",
        "Integraciones bancarias"
      ],
      popular: true
    },
    {
      name: "Plan Empresarial",
      price: "$599.000",
      period: "/mes",
      features: [
        "Hasta 100 empleados",
        "Nóminas ilimitadas",
        "API completa",
        "Soporte prioritario",
        "Reportes personalizados",
        "Consultoría incluida"
      ],
      popular: false
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <Building2 className="h-16 w-16 text-blue-600 mr-4" />
            <h1 className="text-5xl font-bold text-gray-900">
              Nómina Inteligente
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            La plataforma más completa para gestionar la nómina de tu empresa en Colombia. 
            Cumple con toda la normativa legal y automatiza tus procesos de RRHH.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
              onClick={() => navigate('/register-company')}
            >
              Comenzar Trial Gratuito
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate('/auth')}
            >
              Iniciar Sesión
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            ✨ 30 días gratis • Sin tarjeta de crédito • Configuración en 5 minutos
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  {feature.icon}
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pricing */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Planes que se adaptan a tu empresa
          </h2>
          <p className="text-gray-600 mb-8">
            Todos los planes incluyen 30 días de prueba gratuita
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative ${plan.popular ? 'border-blue-500 shadow-lg scale-105' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Más Popular
                  </span>
                </div>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="flex items-center justify-center">
                  <span className="text-4xl font-bold text-blue-600">{plan.price}</span>
                  <span className="text-gray-600 ml-2">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full" 
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => navigate('/register-company')}
                >
                  Comenzar Trial
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <Card className="bg-blue-600 text-white">
            <CardContent className="py-12">
              <h3 className="text-3xl font-bold mb-4">
                ¿Listo para automatizar tu nómina?
              </h3>
              <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
                Únete a miles de empresas que ya confían en Nómina Inteligente para 
                gestionar sus procesos de recursos humanos de manera eficiente y legal.
              </p>
              <Button 
                size="lg" 
                variant="secondary"
                className="bg-white text-blue-600 hover:bg-gray-100"
                onClick={() => navigate('/register-company')}
              >
                Crear mi cuenta empresarial
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
