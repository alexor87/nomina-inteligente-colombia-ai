import React from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ToggleButtonProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const ToggleButton: React.FC<ToggleButtonProps> = ({ collapsed, onToggle }) => {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onToggle}
      className="opacity-50 hover:opacity-100 hover:bg-muted transition-all h-7 w-7 p-0"
      title={collapsed ? 'Expandir' : 'Colapsar'}
    >
      {collapsed ? (
        <PanelLeftOpen className="h-3.5 w-3.5" />
      ) : (
        <PanelLeftClose className="h-3.5 w-3.5" />
      )}
    </Button>
  );
};
