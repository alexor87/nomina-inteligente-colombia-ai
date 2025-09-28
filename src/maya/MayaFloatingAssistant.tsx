import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MayaAvatar } from './MayaAvatar';
import { useMaya } from './MayaProvider';
import { MayaReactivationButton } from './MayaReactivationButton';

export const MayaFloatingAssistant: React.FC = () => {
  const { currentMessage, isVisible, hideMessage, showMessage } = useMaya();
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isVisible || !currentMessage) {
    return <MayaReactivationButton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 100, x: 50 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: 100, x: 50 }}
      className="fixed bottom-6 right-6 z-50 max-w-sm"
    >
      <Card className="overflow-hidden shadow-2xl border-2 border-primary/20 bg-white/95 backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/10 to-primary/5 border-b">
          <div className="flex items-center gap-3">
            <MayaAvatar 
              emotionalState={currentMessage.emotionalState} 
              isVisible={true}
              size="sm"
            />
            <div>
              <p className="font-semibold text-sm text-gray-900">MAYA</p>
              <p className="text-xs text-gray-600">Asistente de Nómina</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-8 w-8 p-0 hover:bg-primary/10"
            >
              {isMinimized ? (
                <Maximize2 className="h-4 w-4" />
              ) : (
                <Minimize2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={hideMessage}
              className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-4">
                {/* Message */}
                <div className="mb-3">
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {currentMessage.message}
                  </p>
                </div>

                {/* Contextual Actions */}
                {currentMessage.contextualActions && currentMessage.contextualActions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Sugerencias:
                    </p>
                    {currentMessage.contextualActions.map((action, index) => (
                      <div key={index} className="text-xs text-gray-600 bg-gray-50 rounded-md p-2">
                        {action}
                      </div>
                    ))}
                  </div>
                )}

                {/* Timestamp */}
                <div className="mt-3 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    {new Date(currentMessage.timestamp).toLocaleTimeString('es-CO', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Minimized State - Only Avatar */}
      {isMinimized && (
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -left-2 cursor-pointer"
          onClick={() => setIsMinimized(false)}
        >
          <MayaAvatar 
            emotionalState={currentMessage.emotionalState} 
            isVisible={true}
            size="md"
          />
        </motion.div>
      )}
    </motion.div>
  );
};