import React from 'react';
import { Brain, Sparkles, ArrowLeft } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useMaya } from '@/maya/MayaProvider';
import { motion } from 'framer-motion';
import { MayaHeaderActions } from './MayaHeaderActions';
import { Button } from '@/components/ui/button';

export const MayaPageHeader: React.FC = () => {
  const { clearConversation, deleteCurrentConversation, currentConversationId } = useMaya();
  const location = useLocation();
  const comesFromModules = location.state?.from?.startsWith('/modules');

  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="relative border-b border-gray-200 bg-white/80 backdrop-blur-sm"
    >
      {/* Subtle gradient border effect */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {comesFromModules && (
            <Link to="/modules/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          )}
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
            <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-lg opacity-40 animate-pulse" />
            <div className="relative w-11 h-11 bg-primary rounded-full flex items-center justify-center shadow-xl ring-2 ring-blue-100">
              <Brain className="h-5 w-5 text-white" />
            </div>
          </motion.div>
          
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              MAYA
            </h1>
            <p className="text-[10px] text-gray-600 flex items-center gap-1 mt-0.5">
              <Sparkles className="h-2.5 w-2.5" />
              Asistente inteligente de nómina
            </p>
          </div>
        </div>

        <MayaHeaderActions 
          onNewConversation={clearConversation}
          onDeleteConversation={deleteCurrentConversation}
          hasActiveConversation={!!currentConversationId}
        />
      </div>
    </motion.header>
  );
};
