import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Archive } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ArchiveToggleProps {
  mode: 'active' | 'archived';
  onModeChange: (mode: 'active' | 'archived') => void;
  activeCount: number;
  archivedCount: number;
  collapsed?: boolean;
}

export const ArchiveToggle: React.FC<ArchiveToggleProps> = ({
  mode,
  onModeChange,
  activeCount,
  archivedCount,
  collapsed = false
}) => {
  if (collapsed) {
    return (
      <div className="flex flex-col gap-2 py-2">
        <button
          onClick={() => onModeChange('active')}
          className={`relative p-2 rounded-lg transition-colors ${
            mode === 'active' 
              ? 'bg-primary/10 text-primary' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
        </button>
        <button
          onClick={() => onModeChange('archived')}
          className={`relative p-2 rounded-lg transition-colors ${
            mode === 'archived' 
              ? 'bg-primary/10 text-primary' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Archive className="h-4 w-4" />
          {archivedCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
              {archivedCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="relative bg-muted/50 rounded-lg p-0.5 flex gap-0.5">
      <button
        onClick={() => onModeChange('active')}
        className={`relative flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1 ${
          mode === 'active'
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <span>Activas</span>
        <Badge variant="secondary" className="h-4 px-1.5 text-[11px]">
          {activeCount}
        </Badge>
        {mode === 'active' && (
          <motion.div
            layoutId="archive-toggle-indicator"
            className="absolute inset-0 bg-background rounded-md shadow-sm -z-10"
            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
          />
        )}
      </button>
      
      <button
        onClick={() => onModeChange('archived')}
        className={`relative flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1 ${
          mode === 'archived'
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <span>Archivadas</span>
        {archivedCount > 0 && (
          <Badge variant="secondary" className="h-4 px-1.5 text-[11px]">
            {archivedCount}
          </Badge>
        )}
        {mode === 'archived' && (
          <motion.div
            layoutId="archive-toggle-indicator"
            className="absolute inset-0 bg-background rounded-md shadow-sm -z-10"
            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
          />
        )}
      </button>
    </div>
  );
};
