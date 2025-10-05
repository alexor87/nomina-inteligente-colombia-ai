import React, { useEffect, useRef } from 'react';
import { useMaya } from '@/maya/MayaProvider';
import { MayaAvatar } from '@/maya/MayaAvatar';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Sparkles } from 'lucide-react';

export const MayaChatArea: React.FC = () => {
  const { chatHistory, currentMessage } = useMaya();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const allMessages = currentMessage && chatHistory.length === 0 
    ? [{ role: 'assistant', content: currentMessage.message, timestamp: currentMessage.timestamp }]
    : chatHistory;

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto mb-4 space-y-4 scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent pr-2"
    >
      <AnimatePresence mode="popLayout">
        {allMessages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center py-20"
          >
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="mb-6"
            >
              <div className="relative w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-2xl">
                <Sparkles className="h-10 w-10 text-white" />
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-full blur-2xl opacity-50 animate-pulse"></div>
              </div>
            </motion.div>
            
            <h2 className="text-3xl font-bold text-white mb-3 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              ¡Hola! Soy MAYA
            </h2>
            <p className="text-slate-300 max-w-md mb-8">
              Tu asistente inteligente para gestión de nómina. Puedo ayudarte con empleados, liquidaciones, reportes y mucho más.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
              {[
                { text: "Crear un nuevo empleado", emoji: "👤" },
                { text: "Calcular liquidación de nómina", emoji: "💰" },
                { text: "Ver reportes del mes", emoji: "📊" },
                { text: "Consultar prestaciones sociales", emoji: "🎁" }
              ].map((suggestion, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  whileHover={{ scale: 1.05 }}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-left cursor-pointer hover:bg-white/10 transition-all"
                >
                  <span className="text-2xl mb-2 block">{suggestion.emoji}</span>
                  <p className="text-sm text-slate-200">{suggestion.text}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          allMessages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="flex-shrink-0">
                    <MayaAvatar 
                      emotionalState={currentMessage?.emotionalState || 'neutral'} 
                      size="sm"
                      isVisible={true}
                    />
                  </div>
                )}
                
                <div className={`max-w-[70%] ${isUser ? 'order-first' : ''}`}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className={`rounded-2xl px-5 py-3 ${
                      isUser 
                        ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-xl shadow-purple-500/20' 
                        : 'bg-slate-800/80 backdrop-blur-sm text-slate-100 border border-white/10'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </motion.div>
                  
                  {/* Quick replies for MAYA messages */}
                  {!isUser && msg.quickReplies && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {msg.quickReplies.map((reply: any, replyIdx: number) => (
                        <Button
                          key={replyIdx}
                          variant="outline"
                          size="sm"
                          className="bg-slate-800/50 border-white/10 text-slate-200 hover:bg-white/10 hover:text-white text-xs"
                        >
                          {reply.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </AnimatePresence>
    </div>
  );
};
