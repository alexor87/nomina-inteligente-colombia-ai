import React, { useEffect, useRef } from 'react';
import { useMaya } from '@/maya/MayaProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, FileText, Users, TrendingUp } from 'lucide-react';
import { MayaMessage } from './MayaMessage';
import { TypingIndicator } from './TypingIndicator';
import { FlowType } from '@/maya/types/GuidedFlow';

export const MayaChatArea: React.FC = () => {
  const { chatHistory, startGuidedFlow } = useMaya();
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
    { 
      icon: Users, 
      title: "Gestionar empleados", 
      desc: "Crear, editar o consultar empleados", 
      color: "from-blue-500 to-cyan-500",
      flowType: FlowType.EMPLOYEE_CREATE
    },
    { 
      icon: Zap, 
      title: "Calcular nómina", 
      desc: "Liquidar nómina del período", 
      color: "from-purple-500 to-pink-500",
      flowType: FlowType.PAYROLL_CALCULATE
    },
    { 
      icon: FileText, 
      title: "Ver reportes", 
      desc: "Análisis y estadísticas", 
      color: "from-emerald-500 to-teal-500"
    },
    { 
      icon: TrendingUp, 
      title: "Prestaciones", 
      desc: "Consultar liquidaciones", 
      color: "from-orange-500 to-amber-500"
    },
  ];

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto mb-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent pr-2"
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
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="mb-8 relative"
            >
              {/* Simple logo circle */}
              <div className="relative w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-lg">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold text-gray-900 mb-3"
            >
              ¡Hola! Soy MAYA
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-gray-600 max-w-md mb-10 text-sm leading-relaxed"
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
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (action.flowType) {
                        startGuidedFlow(action.flowType);
                      }
                    }}
                    disabled={!action.flowType}
                    className="group relative bg-white border border-gray-200 rounded-xl p-4 text-left transition-all hover:bg-gray-50 hover:border-gray-300 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center shadow-sm flex-shrink-0`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 mb-0.5 group-hover:text-primary transition-colors">
                          {action.title}
                        </h3>
                        <p className="text-xs text-gray-600 leading-snug">
                          {action.desc}
                        </p>
                        {!action.flowType && (
                          <span className="text-[10px] text-gray-400 mt-0.5 block">Próximamente</span>
                        )}
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
                      onQuickReply={(value) => {
                        // Quick reply will be handled by MayaMessage
                      }}
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
