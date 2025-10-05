import React from 'react';
import { Brain, Sparkles, Plus, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMaya } from '@/maya/MayaProvider';
import { motion } from 'framer-motion';

export const MayaPageHeader: React.FC = () => {
  const { clearConversation } = useMaya();

  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="border-b border-white/10 bg-slate-900/50 backdrop-blur-xl"
    >
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ 
              rotate: [0, 5, -5, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <div className="relative w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-2xl">
              <Brain className="h-6 w-6 text-white" />
            </div>
          </motion.div>
          
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              MAYA
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Tu asistente inteligente de nómina
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearConversation}
            className="text-slate-300 hover:text-white hover:bg-white/10"
          >
            <Plus className="h-4 w-4 mr-1" />
            Nueva conversación
          </Button>
        </div>
      </div>
    </motion.header>
  );
};
