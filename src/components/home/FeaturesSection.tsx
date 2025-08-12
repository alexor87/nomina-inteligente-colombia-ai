
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Calculator, 
  Shield, 
  Clock, 
  FileText, 
  Users, 
  TrendingUp,
  Smartphone,
  HeadphonesIcon
} from 'lucide-react';

const FeaturesSection = () => {
  const features = [
    {
      icon: <Calculator className="h-10 w-10 text-blue-600" />,
      title: "Cálculo Automático",
      description: "Salarios, horas extras, recargos nocturnos y festivos calculados automáticamente según la legislación colombiana."
    },
    {
      icon: <Shield className="h-10 w-10 text-green-600" />,
      title: "Cumplimiento DIAN",
      description: "Genera reportes que cumplen con todos los requerimientos de la DIAN y el Ministerio de Trabajo."
    },
    {
      icon: <Clock className="h-10 w-10 text-purple-600" />,
      title: "Ahorra 90% del tiempo",
      description: "Lo que antes te tomaba días, ahora lo haces en minutos. Automatización completa de procesos."
    },
    {
      icon: <FileText className="h-10 w-10 text-orange-600" />,
      title: "Comprobantes Digitales",
      description: "Desprendibles de pago digitales que los empleados pueden descargar desde cualquier dispositivo."
    },
    {
      icon: <Users className="h-10 w-10 text-indigo-600" />,
      title: "Gestión de Empleados",
      description: "Perfiles completos con documentos, contratos, vacaciones y todo el historial laboral."
    },
    {
      icon: <TrendingUp className="h-10 w-10 text-red-600" />,
      title: "Reportes Inteligentes",
      description: "Análisis detallados de costos laborales, tendencias y presupuestos para tomar mejores decisiones."
    },
    {
      icon: <Smartphone className="h-10 w-10 text-cyan-600" />,
      title: "Acceso Móvil",
      description: "Consulta información desde cualquier lugar. Diseño responsive para todos los dispositivos."
    },
    {
      icon: <HeadphonesIcon className="h-10 w-10 text-pink-600" />,
      title: "Soporte Especializado",
      description: "Equipo de expertos en nómina colombiana listos para ayudarte cuando lo necesites."
    }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Todo lo que necesitas para tu nómina
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Una plataforma completa que se adapta a las necesidades específicas 
            de las empresas colombianas
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <CardContent className="p-8 text-center">
                <div className="mb-6 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
