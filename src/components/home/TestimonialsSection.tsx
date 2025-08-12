
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Quote } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const TestimonialsSection = () => {
  const testimonials = [
    {
      name: "María González",
      role: "Directora de Talento Humano",
      company: "TechCorp Colombia",
      avatar: "MG",
      rating: 5,
      text: "Antes gastábamos 3 días completos cada mes en nómina. Ahora lo hacemos en 2 horas y sin errores. El cumplimiento con la DIAN es automático y perfecto."
    },
    {
      name: "Carlos Rodríguez", 
      role: "Gerente General",
      company: "Distribuidora del Valle",
      avatar: "CR",
      rating: 5,
      text: "Como empresa familiar, necesitábamos algo simple pero completo. Esta plataforma nos permitió profesionalizar nuestra nómina sin complicaciones."
    },
    {
      name: "Ana Lucia Moreno",
      role: "Contadora",
      company: "Grupo Empresarial Andino",
      avatar: "AM",
      rating: 5,
      text: "Los reportes son exactamente lo que necesito para presentar a gerencia y auditorías. La integración con nuestro sistema contable es perfecta."
    },
    {
      name: "Diego Hernández",
      role: "CEO",
      company: "StartUp Innovation",
      avatar: "DH", 
      rating: 5,
      text: "Siendo una startup, cada peso cuenta. Esta herramienta nos ahorra tanto dinero en contadores externos que prácticamente se paga sola."
    }
  ];

  return (
    <section className="py-24 bg-gray-50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Más de 500 empresas confían en nosotros
          </h2>
          <p className="text-xl text-gray-600">
            Descubre por qué somos la opción #1 en nómina digital
          </p>
        </div>
        
        <Carousel className="max-w-5xl mx-auto">
          <CarouselContent>
            {testimonials.map((testimonial, index) => (
              <CarouselItem key={index} className="md:basis-1/2">
                <Card className="h-full">
                  <CardContent className="p-8">
                    <Quote className="h-8 w-8 text-blue-600 mb-6" />
                    
                    <div className="flex mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    
                    <p className="text-gray-700 text-lg leading-relaxed mb-8">
                      "{testimonial.text}"
                    </p>
                    
                    <div className="flex items-center">
                      <div className="bg-blue-600 text-white rounded-full h-12 w-12 flex items-center justify-center font-semibold mr-4">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                        <p className="text-gray-600">{testimonial.role}</p>
                        <p className="text-blue-600 font-medium">{testimonial.company}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </section>
  );
};

export default TestimonialsSection;
