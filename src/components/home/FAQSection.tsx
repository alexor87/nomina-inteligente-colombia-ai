
import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQSection = () => {
  const faqs = [
    {
      question: "¿Qué tan fácil es migrar mi nómina actual?",
      answer: "Súper fácil. Nuestro equipo te ayuda a importar todos tus datos en menos de 24 horas. Solo necesitas enviar tu base de datos actual y nosotros nos encargamos del resto. Sin interrupciones en tu operación."
    },
    {
      question: "¿Cumple con todas las normas colombianas?",
      answer: "Absolutamente. Nuestra plataforma está diseñada específicamente para Colombia y cumple con todas las normas de la DIAN, Ministerio de Trabajo, y legislación laboral vigente. Se actualiza automáticamente con cada cambio legal."
    },
    {
      question: "¿Puedo procesar nóminas de diferentes frecuencias?",
      answer: "Sí, puedes manejar empleados con pago quincenal, mensual, por horas, destajo, comisiones, y cualquier esquema de pago. La plataforma se adapta a tus necesidades específicas."
    },
    {
      question: "¿Qué pasa si necesito ayuda técnica?",
      answer: "Tienes soporte directo con expertos en nómina colombiana por chat, teléfono y email. Además, ofrecemos capacitación gratuita para tu equipo y documentación completa."
    },
    {
      question: "¿Los datos de mis empleados están seguros?",
      answer: "Totalmente seguros. Usamos cifrado de grado bancario, servidores en Colombia, y cumplimos con la Ley de Protección de Datos Personales. Tus datos nunca salen del país ni se comparten con terceros."
    },
    {
      question: "¿Puedo personalizar los reportes?",
      answer: "Por supuesto. Puedes crear reportes personalizados, exportar a Excel, configurar envíos automáticos, y generar análisis específicos para tu industria. Todo desde una interfaz intuitiva."
    }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Preguntas frecuentes
            </h2>
            <p className="text-xl text-gray-600">
              Resolvemos las dudas más comunes sobre nuestra plataforma
            </p>
          </div>
          
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="border border-gray-200 rounded-lg px-6"
              >
                <AccordionTrigger className="text-left text-lg font-semibold text-gray-900 hover:text-blue-600">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 leading-relaxed text-base pt-2 pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
