import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { QuickReplyOption } from '../types';

interface MayaQuickRepliesProps {
  options: QuickReplyOption[];
  onSelect: (value: string) => void;
  disabled?: boolean;
}

export const MayaQuickReplies: React.FC<MayaQuickRepliesProps> = ({ 
  options, 
  onSelect,
  disabled = false 
}) => {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {options.map((option, index) => (
        <motion.div
          key={option.value}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelect(option.value)}
            disabled={disabled}
            className="h-auto py-2 px-3 text-xs hover:bg-primary hover:text-white transition-all"
          >
            {option.icon && <span className="mr-1.5">{option.icon}</span>}
            {option.label}
          </Button>
        </motion.div>
      ))}
    </div>
  );
};
