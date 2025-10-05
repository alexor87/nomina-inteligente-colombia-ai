import React, { useEffect, useRef } from 'react';
import { useMaya } from '@/maya/MayaProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, FileText, Users, TrendingUp } from 'lucide-react';
import { MayaMessage } from './MayaMessage';
import { TypingIndicator } from './TypingIndicator';

export const MayaChatArea: React.FC = () => {
  const { chatHistory } = useMaya();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isLoading] = React.useState(false); // Will be connected to actual loading state

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Group consecutive messages from same sender
  const groupedMessages = React.useMemo(() => {
    const groups: { role: string; messages: typeof chatHistory; showAvatar: boolean }[] = [];
    
    chatHistory.forEach((msg, idx) => {
      const lastGroup = groups[groups.length - 1];
      const prevMsg = chatHistory[idx - 1];
      
      if (lastGroup && lastGroup.role === msg.role) {
        lastGroup.messages.push(msg);
      } else {
        groups.push({
          role: msg.role,
          messages: [msg],
          showAvatar: !prevMsg || prevMsg.role !== msg.role
        });
      }
    });
    
    return groups;
  }, [chatHistory]);

  const quickActions = [
    { icon: Users, title: "Gestionar empleados", desc: "Crear, editar o consultar empleados", color: "from-blue-500 to-cyan-500" },
    { icon: Zap, title: "Calcular nómina", desc: "Liquidar nómina del período", color: "from-purple-500 to-pink-500" },
    { icon: FileText, title: "Ver reportes", desc: "Análisis y estadísticas", color: "from-emerald-500 to-teal-500" },
    { icon: TrendingUp, title: "Prestaciones", desc: "Consultar liquidaciones", color: "from-orange-500 to-amber-500" },
  ];

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto mb-4 space-y-3 scrollbar-thin scrollbar-thumb-purple-500/10 scrollbar-track-transparent pr-2"
    >
      <AnimatePresence mode="popLayout">
        {groupedMessages.length === 0 ? (
          // Empty state - Hero with action cards
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center py-12"
          >
            {/* Hero section */}
            <motion.div
              animate={{ 
                y: [0, -8, 0],
                rotate: [0, 5, -5, 0],
              }}
              transition={{ 
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="mb-8 relative"
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-full blur-2xl opacity-30 animate-pulse" />
              
              {/* Main orb */}
              <div className="relative w-24 h-24 bg-gradient-to-br from-purple-600 via-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-2xl ring-1 ring-white/20">
                <Sparkles className="h-12 w-12 text-white" />
                
                {/* Subtle sparkles around */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1.5 h-1.5 bg-white rounded-full"
                    style={{
                      top: `${50 + 40 * Math.sin((i * Math.PI * 2) / 6)}%`,
                      left: `${50 + 40 * Math.cos((i * Math.PI * 2) / 6)}%`,
                    }}
                    animate={{
                      scale: [0, 1, 0],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold text-white mb-3 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent"
            >
              ¡Hola! Soy MAYA
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-slate-300 max-w-md mb-10 text-sm leading-relaxed"
            >
              Tu asistente inteligente para gestión de nómina.
              <br />
              Puedo ayudarte con empleados, liquidaciones, reportes y más.
            </motion.p>

            {/* Action cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full px-4">
              {quickActions.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + idx * 0.08 }}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative bg-slate-800/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-left transition-all hover:bg-slate-800/60 hover:border-white/20"
                  >
                    {/* Gradient glow on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity`} />
                    
                    <div className="relative flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white mb-0.5 group-hover:text-purple-300 transition-colors">
                          {action.title}
                        </h3>
                        <p className="text-xs text-slate-400 leading-snug">
                          {action.desc}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ) : (
          // Messages
          <>
            {groupedMessages.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-2">
                {group.messages.map((msg, msgIdx) => (
                  <MayaMessage
                    key={msg.id || `${groupIdx}-${msgIdx}`}
                    message={msg}
                    isLatest={groupIdx === groupedMessages.length - 1 && msgIdx === group.messages.length - 1}
                    showAvatar={msgIdx === 0 && group.showAvatar}
                  />
                ))}
              </div>
            ))}
            
            {/* Typing indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 items-start"
              >
                <div className="w-9" /> {/* Avatar space */}
                <TypingIndicator />
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
