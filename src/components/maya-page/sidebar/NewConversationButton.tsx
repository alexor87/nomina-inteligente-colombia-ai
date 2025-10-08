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
      variant="default"
      className={cn(
        "w-full shadow-sm hover:shadow-md transition-all duration-200",
        collapsed ? "justify-center" : "justify-start"
      )}
      size={collapsed ? "icon" : "default"}
    >
      <Plus className="h-5 w-5" />
      {!collapsed && <span className="ml-2 font-medium">Nueva conversación</span>}
    </Button>
  );
};
