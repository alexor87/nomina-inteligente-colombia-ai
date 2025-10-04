import React from 'react';
import { motion } from 'framer-motion';

export const MayaTypingIndicator: React.FC = () => {
  return (
    <div className="flex items-center gap-1 p-3 bg-muted rounded-lg max-w-[80px]">
      <motion.div
        className="w-2 h-2 bg-primary/60 rounded-full"
        animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0 }}
      />
      <motion.div
        className="w-2 h-2 bg-primary/60 rounded-full"
        animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
      />
      <motion.div
        className="w-2 h-2 bg-primary/60 rounded-full"
        animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
      />
    </div>
  );
};
