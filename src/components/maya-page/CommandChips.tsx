import React from 'react';
import { Hash, AtSign, Slash, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const suggestions = [
  { icon: Slash, label: '/ayuda', description: 'Ver comandos' },
  { icon: AtSign, label: '@empleado', description: 'Mencionar' },
  { icon: Hash, label: '#reporte', description: 'Categoría' },
  { icon: Sparkles, label: 'Sugerencias IA', description: 'Ideas automáticas' },
];

export const CommandChips: React.FC = () => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {suggestions.map((item, idx) => {
        const Icon = item.icon;
        return (
          <motion.button
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-600 hover:bg-gray-200 hover:text-gray-900 hover:border-gray-300 transition-all whitespace-nowrap"
            disabled
            title={item.description}
          >
            <Icon className="h-3.5 w-3.5 text-blue-600" />
            <span className="font-medium">{item.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
};
