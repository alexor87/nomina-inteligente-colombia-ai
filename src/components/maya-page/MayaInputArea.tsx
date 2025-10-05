import React, { useState, useRef, useEffect } from 'react';
import { useMaya } from '@/maya/MayaProvider';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { ComposerActions } from './ComposerActions';
import { CommandChips } from './CommandChips';

export const MayaInputArea: React.FC = () => {
  const { sendMessage } = useMaya();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      await sendMessage(message);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="relative bg-white backdrop-blur-sm border border-gray-200 rounded-2xl p-4 shadow-lg"
    >
      {/* Subtle gradient border on top */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
      
      {/* Command chips */}
      <div className="mb-3">
        <CommandChips />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Input area with actions */}
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu mensaje... (Enter para enviar, Shift+Enter para nueva línea)"
              disabled={isLoading}
              rows={1}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none transition-all disabled:opacity-50"
              style={{ minHeight: '48px', maxHeight: '200px' }}
            />
          </div>

          {/* Send button */}
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="relative bg-primary hover:bg-primary/90 text-white shadow-lg disabled:opacity-40 disabled:cursor-not-allowed h-12 w-12 p-0 rounded-xl transition-all"
          >
            {/* Glow effect on hover */}
            <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-10 blur-xl rounded-xl transition-opacity" />
            
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin relative z-10" />
            ) : (
              <Send className="h-5 w-5 relative z-10" />
            )}
          </Button>
        </div>

        {/* Bottom actions and hint */}
        <div className="flex items-center justify-between">
          <ComposerActions />
          
          <p className="text-[10px] text-gray-500">
            <span className="inline-flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              Pregúntame sobre empleados, nómina, reportes
            </span>
          </p>
        </div>
      </form>
    </motion.div>
  );
};
