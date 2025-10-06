import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface NewConversationButtonProps {
  onClick: () => void;
  collapsed?: boolean;
}

export const NewConversationButton: React.FC<NewConversationButtonProps> = ({ 
  onClick, 
  collapsed = false 
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
    >
      <Button
        onClick={onClick}
        className="w-full bg-muted hover:bg-muted/80 text-foreground border border-border/50"
        size={collapsed ? "icon" : "sm"}
      >
        <Plus className="h-3.5 w-3.5" />
        {!collapsed && <span className="ml-1.5 text-xs">Nueva conversación</span>}
      </Button>
    </motion.div>
  );
};
