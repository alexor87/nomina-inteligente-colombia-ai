import React from 'react';
import { Button } from '@/components/ui/button';
import { MayaAvatar } from './MayaAvatar';
import { useMaya } from './MayaProvider';
import { motion, AnimatePresence } from 'framer-motion';

export const MayaReactivationButton: React.FC = () => {
  const { isVisible, showMessage, currentMessage, setPhase } = useMaya();

  // Solo mostrar si MAYA no está visible
  if (isVisible) {
    return null;
  }

  const handleClick = async () => {
    if (!currentMessage) {
      await setPhase('initial');
    }
    showMessage();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          onClick={handleClick}
          variant="outline"
          size="lg"
          className="rounded-full p-3 bg-white shadow-lg border-2 border-primary/20 hover:border-primary/40 hover:shadow-xl transition-all duration-300"
        >
          <MayaAvatar 
            emotionalState={currentMessage?.emotionalState || 'neutral'} 
            size="sm"
            isVisible={true}
          />
        </Button>
      </motion.div>
    </AnimatePresence>
  );
};