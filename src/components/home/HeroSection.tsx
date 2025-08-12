
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center">
      <div className="container mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="max-w-xl">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
              <CheckCircle className="w-4 h-4 mr-2" />
              Cumplimiento legal garantizado
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              La nómina más 
              <span className="text-blue-600"> inteligente</span> de Colombia
            </h1>
            
            <p className="text-xl text-gray-600 leading-relaxed mb-8">
              Automatiza tu nómina, cumple con la DIAN y mantén a tu equipo feliz. 
              Todo en una plataforma diseñada especialmente para empresas colombianas.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                onClick={() => navigate('/register')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg"
              >
                Comenzar gratis
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              
              <Button 
                size="lg" 
                variant="outline"
                className="px-8 py-4 text-lg border-gray-300"
              >
                Ver demo
              </Button>
            </div>
            
            <div className="flex items-center gap-6 mt-8 text-sm text-gray-500">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                Sin tarjeta de crédito
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                Configuración en 5 minutos
              </div>
            </div>
          </div>
          
          <div className="lg:justify-self-end">
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Nómina Diciembre</span>
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                      Procesada
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Total empleados</span>
                      <span className="font-semibold">24</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Salarios base</span>
                      <span className="font-semibold">$48,500,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Deducciones</span>
                      <span className="font-semibold text-red-600">-$9,700,000</span>
                    </div>
                    <hr />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total a pagar</span>
                      <span className="text-blue-600">$38,800,000</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="absolute -top-4 -right-4 bg-blue-600 text-white p-4 rounded-xl shadow-lg">
                <div className="text-2xl font-bold">98%</div>
                <div className="text-xs">Precisión</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
