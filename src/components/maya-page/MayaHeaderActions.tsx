import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface MayaHeaderActionsProps {
  onNewConversation: () => void;
}

export const MayaHeaderActions: React.FC<MayaHeaderActionsProps> = ({ onNewConversation }) => {
  return (
    <div className="flex items-center gap-2">
      {/* AI Active Badge */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Badge 
          variant="outline" 
          className="bg-blue-600 border-blue-600 text-white px-2.5 py-1 text-xs font-medium"
        >
          <motion.span
            animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-white mr-1.5 inline-block"
          />
          IA • Activo
        </Badge>
      </motion.div>

      {/* Action button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onNewConversation}
        className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 h-8 px-3"
      >
        <Plus className="h-4 w-4 mr-1.5" />
        <span className="text-xs font-medium">Nueva</span>
      </Button>
    </div>
  );
};
