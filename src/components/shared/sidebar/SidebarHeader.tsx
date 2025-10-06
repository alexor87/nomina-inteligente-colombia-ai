import React from 'react';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { ToggleButton } from './ToggleButton';

interface SidebarHeaderProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({ collapsed, onToggle }) => {
  return (
    <div className="p-4 flex items-center gap-3 border-b border-border">
      {!collapsed ? (
        <>
          <motion.div 
            className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center"
            whileHover={{ scale: 1.05 }}
          >
            <Sparkles className="h-5 w-5 text-primary" />
          </motion.div>
          <div className="flex-1">
            <h1 className="font-bold text-lg text-foreground">MAYA</h1>
            <p className="text-xs text-muted-foreground">Tu asistente de RRHH</p>
          </div>
          <ToggleButton collapsed={collapsed} onToggle={onToggle} />
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 w-full">
          <motion.div 
            className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center"
            whileHover={{ scale: 1.1 }}
          >
            <Sparkles className="h-4 w-4 text-primary" />
          </motion.div>
          <ToggleButton collapsed={collapsed} onToggle={onToggle} />
        </div>
      )}
    </div>
  );
};
