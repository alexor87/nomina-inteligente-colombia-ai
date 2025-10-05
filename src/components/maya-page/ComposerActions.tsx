import React from 'react';
import { Mic, Paperclip, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const ComposerActions: React.FC = () => {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="text-slate-400 hover:text-white hover:bg-white/5 h-8 w-8 p-0"
        disabled
        title="Próximamente: Comando de voz"
      >
        <Mic className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="text-slate-400 hover:text-white hover:bg-white/5 h-8 w-8 p-0"
        disabled
        title="Próximamente: Adjuntar archivos"
      >
        <Paperclip className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="text-slate-400 hover:text-white hover:bg-white/5 h-8 w-8 p-0"
        disabled
        title="Próximamente: Emojis"
      >
        <Smile className="h-4 w-4" />
      </Button>
    </div>
  );
};
