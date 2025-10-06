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
        className="w-full bg-muted hover:bg-muted/80 text-foreground border border-border/50 py-2.5"
        size={collapsed ? "icon" : "sm"}
        title={collapsed ? 'Nueva conversación' : undefined}
      >
        <Plus className="h-4 w-4" />
        {!collapsed && <span className="ml-1.5 text-sm">Nueva conversación</span>}
      </Button>
    </motion.div>
  );
};
