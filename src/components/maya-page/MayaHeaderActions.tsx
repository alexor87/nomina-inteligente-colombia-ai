import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface MayaHeaderActionsProps {
  onNewConversation: () => void;
  onDeleteConversation: () => Promise<void>;
  currentConversationId: string | null;
}

export const MayaHeaderActions: React.FC<MayaHeaderActionsProps> = ({ 
  onNewConversation,
  onDeleteConversation,
  currentConversationId
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = async () => {
    await onDeleteConversation();
    setShowDeleteDialog(false);
  };

  return (
    <>
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

        {/* New conversation button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onNewConversation}
          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 h-8 px-3"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          <span className="text-xs font-medium">Nueva</span>
        </Button>

        {/* Delete conversation button */}
        {currentConversationId && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDeleteDialog(true)}
            className="text-gray-600 hover:text-red-600 hover:bg-red-50 h-8 w-8"
            title="Eliminar conversación"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title="¿Eliminar conversación?"
        description="Esta acción no se puede deshacer. Se eliminará la conversación y todo su historial."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        isDestructive
      />
    </>
  );
};
