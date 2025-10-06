import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
      className={cn(
        "w-full hover:bg-muted/50 border-border/50",
        collapsed ? "justify-center" : "justify-start"
      )}
      size={collapsed ? "icon" : "default"}
    >
      <Plus className="h-4 w-4" />
      {!collapsed && <span className="ml-2">Nueva conversación</span>}
    </Button>
  );
};
