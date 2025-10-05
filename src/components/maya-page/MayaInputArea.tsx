import React, { useState } from 'react';
import { useMaya } from '@/maya/MayaProvider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const MayaInputArea: React.FC = () => {
  const { sendMessage } = useMaya();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl"
    >
      <form onSubmit={handleSubmit} className="flex gap-3 items-end">
        <div className="flex-1">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu mensaje aquí... (Enter para enviar, Shift+Enter para nueva línea)"
            disabled={isLoading}
            className="min-h-[60px] max-h-[200px] bg-slate-900/50 border-white/10 text-slate-100 placeholder:text-slate-500 focus:border-purple-500/50 focus:ring-purple-500/20 resize-none"
          />
          <p className="text-xs text-slate-500 mt-2">
            💡 Tip: Pregúntame sobre empleados, nómina, reportes o cualquier duda que tengas
          </p>
        </div>
        
        <Button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-xl shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed h-[60px] px-6"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </form>
    </motion.div>
  );
};
