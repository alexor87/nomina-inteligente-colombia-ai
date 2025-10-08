import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIBlockDetector } from '@/hooks/use-ui-block-detector';
import { forceUIReset } from '@/utils/ui/overlayRecovery';

export const OverlayResetButton: React.FC = () => {
  const isBlocked = useUIBlockDetector();

  const handleReset = () => {
    forceUIReset();
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleReset}
      className={`
        transition-all duration-200
        ${isBlocked ? 'text-destructive hover:text-destructive/90 animate-pulse' : ''}
      `}
      title={isBlocked ? 'UI bloqueada - Click para recuperar' : 'Cerrar overlays'}
    >
      <X className="h-5 w-5" />
    </Button>
  );
};
