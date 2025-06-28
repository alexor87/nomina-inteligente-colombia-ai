
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';

interface MagicEditTransitionProps {
  isTransitioning: boolean;
  periodName: string;
  onComplete: () => void;
}

export const MagicEditTransition = ({ 
  isTransitioning, 
  periodName, 
  onComplete 
}: MagicEditTransitionProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    { text: "Abriendo período...", icon: "🔓" },
    { text: "Preparando datos...", icon: "📊" },
    { text: "Cargando modo edición...", icon: "✨" },
    { text: "¡Listo para editar!", icon: "🎉" }
  ];

  useEffect(() => {
    if (!isTransitioning) return;
    
    const timer = setInterval(() => {
      setCurrentStep(prev => {
        const next = prev + 1;
        if (next >= steps.length) {
          clearInterval(timer);
          setTimeout(onComplete, 500);
          return prev;
        }
        return next;
      });
    }, 800);

    return () => clearInterval(timer);
  }, [isTransitioning, onComplete, steps.length]);

  return (
    <AnimatePresence>
      {isTransitioning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 z-50 flex items-center justify-center"
        >
          <div className="text-center text-white">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="mx-auto mb-8"
            >
              <Sparkles className="h-16 w-16" />
            </motion.div>
            
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-3xl font-bold mb-4"
            >
              Entrando al Modo Edición Mágico
            </motion.h2>
            
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xl mb-8 opacity-90"
            >
              {periodName}
            </motion.p>

            <div className="space-y-4">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ 
                    x: 0, 
                    opacity: index <= currentStep ? 1 : 0.3,
                    scale: index === currentStep ? 1.1 : 1
                  }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center justify-center space-x-3 text-lg ${
                    index <= currentStep ? 'text-white' : 'text-white/50'
                  }`}
                >
                  <span className="text-2xl">{step.icon}</span>
                  <span>{step.text}</span>
                  {index === currentStep && (
                    <motion.div
                      animate={{ x: [0, 10, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <ArrowRight className="h-5 w-5" />
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
