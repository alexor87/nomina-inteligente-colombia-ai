import React from 'react';
import { Brain, Sparkles } from 'lucide-react';
import { useMaya } from '@/maya/MayaProvider';
import { motion } from 'framer-motion';
import { MayaHeaderActions } from './MayaHeaderActions';

export const MayaPageHeader: React.FC = () => {
  const { clearConversation } = useMaya();

  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="relative border-b border-white/5 bg-slate-900/40 backdrop-blur-2xl"
    >
      {/* Subtle gradient border effect */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ 
              rotate: [0, 5, -5, 0],
            }}
            transition={{ 
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-full blur-lg opacity-40 animate-pulse" />
            <div className="relative w-11 h-11 bg-gradient-to-br from-purple-600 via-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-xl ring-1 ring-white/10">
              <Brain className="h-5 w-5 text-white" />
            </div>
          </motion.div>
          
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              MAYA
            </h1>
            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
              <Sparkles className="h-2.5 w-2.5" />
              Asistente inteligente de nómina
            </p>
          </div>
        </div>

        <MayaHeaderActions onNewConversation={clearConversation} />
      </div>
    </motion.header>
  );
};
