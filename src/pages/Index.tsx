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
  ArrowRight,
  Star,
  TrendingUp,
  Award,
  Globe
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { CompanyRegistrationWizard } from "@/components/auth/CompanyRegistrationWizard";
import { CompanyService } from "@/services/CompanyService";
import { useToast } from "@/hooks/use-toast";
import { useCompanyRegistrationStore } from "@/components/auth/hooks/useCompanyRegistrationStore";

export const Index = () => {
  const navigate = useNavigate();
  const { user, loading, refreshUserData } = useAuth();
  const { toast } = useToast();
  const [showRegistrationWizard, setShowRegistrationWizard] = useState(false);
  const [processingRegistration, setProcessingRegistration] = useState(false);
  const { data } = useCompanyRegistrationStore();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate('/app/dashboard');
    }
  }, [user, loading, navigate]);

  // Show loading while checking auth status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Only show landing page for non-authenticated users
  if (user) {
    return null; // Will redirect via useEffect
  }

  const handleRegistrationComplete = async () => {
    setProcessingRegistration(true);
    
    try {
      console.log('Processing company registration:', data);
      
      // Convert wizard data to company registration format
      const registrationData = {
        nit: `${data.identificationNumber}-${data.verificationDigit}`,
        razon_social: data.identificationNumber || 'Mi Empresa',
        email: data.invitedMember?.email || 'contacto@empresa.com',
        telefono: '',
        ciudad: 'Bogotá',
        plan: 'profesional' as const,
      };

      const companyId = await CompanyService.createCompany({
        nit: registrationData.nit,
        razon_social: registrationData.razon_social,
        email: registrationData.email,
        telefono: registrationData.telefono,
        ciudad: registrationData.ciudad,
        plan: registrationData.plan,
      });
      
      console.log('Company created successfully:', companyId);
      
      // Refresh user data to ensure roles and profile are loaded
      await refreshUserData();
      
      toast({
        title: "¡Bienvenido a NóminaFácil!",
        description: "Tu empresa ha sido registrada exitosamente. ¡Comienza tu prueba gratuita!",
      });

      // Navigate to dashboard
      setTimeout(() => {
        navigate('/app/dashboard');
      }, 1500);
      
    } catch (error: any) {
      console.error('Error creating company:', error);
      
      let errorMessage = "Ha ocurrido un error inesperado";
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error al registrar empresa",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setProcessingRegistration(false);
      setShowRegistrationWizard(false);
    }
  };

  const handleCancelRegistration = () => {
    setShowRegistrationWizard(false);
  };

  if (processingRegistration) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Configurando tu empresa...</p>
        </div>
      </div>
    );
  }

  const features = [
    {
      icon: Calculator,
      title: "Cálculo Automático de Nómina",
      description: "Calcula automáticamente salarios, deducciones, prestaciones sociales y aportes parafiscales según la legislación colombiana.",
      color: "text-blue-600"
    },
    {
      icon: Users,
      title: "Gestión de Empleados",
      description: "Administra la información completa de tus empleados, contratos, afiliaciones y datos bancarios.",
      color: "text-green-600"
    },
    {
      icon: FileText,
      title: "Comprobantes Electrónicos",
      description: "Genera y envía comprobantes de pago electrónicos cumpliendo con los requisitos de la DIAN.",
      color: "text-purple-600"
    },
    {
      icon: Shield,
      title: "Cumplimiento Legal",
      description: "Mantente al día con todas las obligaciones laborales y tributarias vigentes en Colombia.",
      color: "text-red-600"
    },
    {
      icon: Clock,
      title: "Reportes en Tiempo Real",
      description: "Accede a reportes detallados de nómina, costos laborales y proyecciones presupuestales.",
      color: "text-orange-600"
    },
    {
      icon: TrendingUp,
      title: "Análisis Inteligente",
      description: "Obtén insights valiosos sobre tu estructura de costos y tendencias salariales.",
      color: "text-indigo-600"
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
      popular: false,
      color: "border-gray-200"
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
      popular: true,
      color: "border-blue-500 ring-2 ring-blue-200"
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
      popular: false,
      color: "border-gray-200"
    }
  ];

  const testimonials = [
    {
      name: "María González",
      role: "Directora de RRHH",
      company: "TechCorp S.A.S",
      content: "NóminaFácil nos ha ahorrado horas de trabajo cada mes. El cálculo automático es impecable.",
      rating: 5
    },
    {
      name: "Carlos Ramírez",
      role: "Contador",
      company: "Consultores Unidos",
      content: "La integración con la DIAN es perfecta. Los comprobantes electrónicos funcionan sin problemas.",
      rating: 5
    },
    {
      name: "Ana Morales",
      role: "CEO",
      company: "StartUp Innovadora",
      content: "Desde que usamos NóminaFácil, el manejo de nómina es transparente y confiable.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Registration Wizard Overlay */}
      {showRegistrationWizard && (
        <CompanyRegistrationWizard 
          onComplete={handleRegistrationComplete} 
          onCancel={handleCancelRegistration}
        />
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-blue-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <Calculator className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                NóminaFácil
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate('/auth')} className="text-gray-700 hover:text-blue-600">
                Iniciar Sesión
              </Button>
              <Button onClick={() => setShowRegistrationWizard(true)} className="bg-blue-600 hover:bg-blue-700">
                Comenzar Prueba
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="max-w-7xl mx-auto text-center relative">
          <Badge className="mb-4 bg-blue-100 text-blue-800 border-blue-200">
            <Award className="w-4 h-4 mr-1" />
            Plataforma líder en Colombia
          </Badge>
          
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            La plataforma más{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              completa
            </span>{' '}
            para gestionar tu nómina
          </h2>
          
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            Automatiza el cálculo de nómina, gestiona a tus empleados y cumple con todas las obligaciones laborales de Colombia desde una sola plataforma inteligente.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              onClick={() => setShowRegistrationWizard(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              Comenzar Prueba Gratuita
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => setShowRegistrationWizard(true)}
              className="border-blue-200 text-blue-600 hover:bg-blue-50 px-8 py-4 text-lg font-semibold"
            >
              Ver Demo
            </Button>
          </div>

          <div className="flex items-center justify-center space-x-8 text-sm text-gray-500">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              15 días gratis
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              Sin tarjeta de crédito
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              Soporte incluido
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-green-100 text-green-800 border-green-200">
              <Globe className="w-4 h-4 mr-1" />
              Funcionalidades
            </Badge>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Todo lo que necesitas para gestionar tu nómina
            </h3>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Herramientas profesionales diseñadas específicamente para empresas colombianas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg group">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-xl font-semibold">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-yellow-100 text-yellow-800 border-yellow-200">
              <Star className="w-4 h-4 mr-1" />
              Testimonios
            </Badge>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Lo que dicen nuestros clientes
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-white hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4 italic">"{testimonial.content}"</p>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                    <p className="text-sm text-blue-600">{testimonial.company}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-100 text-purple-800 border-purple-200">
              <TrendingUp className="w-4 h-4 mr-1" />
              Planes
            </Badge>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
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
                className={`relative hover:shadow-xl transition-all duration-300 ${plan.color} ${
                  plan.popular ? 'transform scale-105' : ''
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white">
                    Más Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-blue-600">{plan.price}</span>
                    <span className="text-gray-600">{plan.period}</span>
                  </div>
                  <CardDescription className="text-lg font-medium text-gray-700">
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
                    className={`w-full ${
                      plan.popular 
                        ? "bg-blue-600 hover:bg-blue-700 text-white" 
                        : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                    }`}
                    onClick={() => setShowRegistrationWizard(true)}
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
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h3 className="text-3xl md:text-4xl font-bold mb-4">
            ¿Listo para simplificar tu gestión de nómina?
          </h3>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Únete a cientos de empresas que ya confían en NóminaFácil para gestionar su capital humano de manera eficiente y profesional
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-blue-600 hover:bg-gray-100 font-semibold px-8 py-4"
              onClick={() => setShowRegistrationWizard(true)}
            >
              Comenzar Trial Gratuito
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white hover:text-blue-600 font-semibold px-8 py-4"
              onClick={() => setShowRegistrationWizard(true)}
            >
              Contactar Ventas
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-2">
                  <Calculator className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold">NóminaFácil</span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                La plataforma más completa para gestionar nómina en Colombia.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Producto</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Características</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Precios</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integraciones</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Soporte</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentación</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Centro de Ayuda</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contacto</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Estado del Sistema</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Acerca de</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Carreras</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Prensa</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2024 NóminaFácil. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
