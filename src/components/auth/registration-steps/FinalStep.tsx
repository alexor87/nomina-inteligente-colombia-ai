
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

interface FinalStepProps {
  onComplete: () => void;
}

export const FinalStep = ({ onComplete }: FinalStepProps) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Card className="w-full max-w-lg mx-4 animate-scale-in relative overflow-hidden">
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="confetti-animation">
            {Array.from({ length: 50 }, (_, i) => (
              <div
                key={i}
                className="confetti-piece"
                style={{
                  left: `${Math.random() * 100}%`,
                  backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][Math.floor(Math.random() * 5)],
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}
              />
            ))}
          </div>
        </div>
      )}
      
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-4">
          <Sparkles className="h-8 w-8 text-yellow-500 mr-2 animate-pulse" />
          <CardTitle className="text-2xl text-blue-600">¡Bienvenido a NóminaFácil!</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="text-center space-y-6">
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">🎉 ¡Todo está listo!</h3>
            <p className="text-gray-600">
              Tienes <strong>15 días de prueba gratuita</strong> para explorar 
              todas las funcionalidades del plan de Nómina para empresas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-2xl mb-2">✨</div>
              <p className="font-medium">Cálculo automático</p>
              <p className="text-gray-600">de nómina y prestaciones</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-2xl mb-2">📊</div>
              <p className="font-medium">Reportes detallados</p>
              <p className="text-gray-600">y análisis completos</p>
            </div>
          </div>
        </div>

        <Button 
          onClick={onComplete}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3"
          size="lg"
        >
          Comencemos 🚀
        </Button>
      </CardContent>

      <style jsx>{`
        .confetti-animation {
          position: absolute;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        
        .confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          background-color: #3B82F6;
          animation: confetti-fall linear infinite;
        }
        
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </Card>
  );
};
