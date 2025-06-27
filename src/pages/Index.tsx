
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Users, 
  Calculator, 
  FileText, 
  Shield, 
  Clock,
  Building2,
  ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate('/app/dashboard');
    }
  }, [user, loading, navigate]);

  // Show loading while checking auth status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Only show landing page for non-authenticated users
  if (user) {
    return null; // Will redirect via useEffect
  }

  const features = [
    {
      icon: Calculator,
      title: "Cálculo Automático de Nómina",
      description: "Calcula automáticamente salarios, deducciones, prestaciones sociales y aportes parafiscales según la legislación colombiana."
    },
    {
      icon: Users,
      title: "Gestión de Empleados",
      description: "Administra la información completa de tus empleados, contratos, afiliaciones y datos bancarios."
    },
    {
      icon: FileText,
      title: "Comprobantes Electrónicos",
      description: "Genera y envía comprobantes de pago electrónicos cumpliendo con los requisitos de la DIAN."
    },
    {
      icon: Shield,
      title: "Cumplimiento Legal",
      description: "Mantente al día con todas las obligaciones laborales y tributarias vigentes en Colombia."
    },
    {
      icon: Clock,
      title: "Reportes en Tiempo Real",
      description: "Accede a reportes detallados de nómina, costos laborales y proyecciones presupuestales."
    }
  ];

  const plans = [
    {
      name: "Plan Básico",
      price: "$99.000",
      period: "/mes",
      employees: "Hasta 5 empleados",
      features: [
        "Nómina mensual básica",
        "Gestión de empleados",
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
      employees: "Hasta 25 empleados",
      features: [
        "Nómina ilimitada",
        "Gestión avanzada de empleados",
        "Comprobantes electrónicos DIAN",
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
      employees: "Hasta 100 empleados",
      features: [
        "Todo lo del plan profesional",
        "API completa",
        "Soporte prioritario 24/7",
        "Consultoría personalizada",
        "Reportes personalizados",
        "Manager dedicado"
      ],
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Calculator className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">NóminaFácil</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate('/auth')}>
                Iniciar Sesión
              </Button>
              <Button onClick={() => navigate('/register')}>
                Registrarse
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            La plataforma más <span className="text-blue-600">completa</span> para gestionar tu nómina
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Automatiza el cálculo de nómina, gestiona a tus empleados y cumple con todas las obligaciones laborales de Colombia desde una sola plataforma.
          </p>
          
          {/* Company Registration CTA */}
          <div className="flex flex-col items-center mb-8">
            <Card className="w-full max-w-md hover:shadow-lg transition-shadow cursor-pointer border-blue-200" onClick={() => navigate('/register/company')}>
              <CardHeader className="text-center">
                <Building2 className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                <CardTitle className="text-lg">Registro Empresarial</CardTitle>
                <CardDescription>
                  Registra tu empresa y comienza con 15 días gratis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={(e) => {e.stopPropagation(); navigate('/register/company')}}>
                  Registrar Empresa
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <div className="text-center mt-2">
                  <Badge variant="secondary">15 días gratis</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <p className="text-sm text-gray-500">
            ¿Ya tienes cuenta?{' '}
            <Button variant="link" onClick={() => navigate('/auth')} className="text-blue-600 p-0 h-auto">
              Inicia sesión aquí
            </Button>
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Todo lo que necesitas para gestionar tu nómina
            </h3>
            <p className="text-xl text-gray-600">
              Herramientas profesionales diseñadas específicamente para empresas colombianas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <feature.icon className="h-10 w-10 text-blue-600 mb-4" />
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

      {/* Pricing Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Planes que se adaptan a tu empresa
            </h3>
            <p className="text-xl text-gray-600">
              Comienza con 15 días gratis, sin compromisos
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative hover:shadow-lg transition-shadow ${
                  plan.popular ? 'border-blue-500 shadow-lg' : ''
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600">
                    Más Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-blue-600">{plan.price}</span>
                    <span className="text-gray-600">{plan.period}</span>
                  </div>
                  <CardDescription className="text-lg font-medium">
                    {plan.employees}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full" 
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => navigate('/register/company')}
                  >
                    Comenzar Trial Gratuito
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold mb-4">
            ¿Listo para simplificar tu gestión de nómina?
          </h3>
          <p className="text-xl mb-8 opacity-90">
            Únete a cientos de empresas que ya confían en NóminaFácil para gestionar su capital humano
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-blue-600 hover:bg-gray-100"
              onClick={() => navigate('/register/company')}
            >
              Comenzar Trial Gratuito
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white hover:text-blue-600"
              onClick={() => navigate('/auth')}
            >
              Ver Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Calculator className="h-6 w-6 text-blue-400 mr-2" />
                <span className="text-lg font-bold">NóminaFácil</span>
              </div>
              <p className="text-gray-400">
                La plataforma más completa para gestionar nómina en Colombia.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Producto</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Características</a></li>
                <li><a href="#" className="hover:text-white">Precios</a></li>
                <li><a href="#" className="hover:text-white">Integraciones</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Soporte</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Documentación</a></li>
                <li><a href="#" className="hover:text-white">Centro de Ayuda</a></li>
                <li><a href="#" className="hover:text-white">Contacto</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Acerca de</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Carreras</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 NóminaFácil. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
