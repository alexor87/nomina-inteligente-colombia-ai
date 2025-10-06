import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NewConversationButtonProps {
  onClick: () => void;
  collapsed?: boolean;
}

export const NewConversationButton: React.FC<NewConversationButtonProps> = ({ 
  onClick, 
  collapsed = false 
}) => {
  return (
    <Button
      onClick={onClick}
      variant="outline"
      className="w-full justify-start hover:bg-muted/50 border-border/50"
      size={collapsed ? "icon" : "default"}
    >
      <Plus className="h-4 w-4" />
      {!collapsed && <span className="ml-2">Nueva conversación</span>}
    </Button>
  );
};
