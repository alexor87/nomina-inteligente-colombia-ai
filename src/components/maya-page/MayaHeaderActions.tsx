import React, { useState } from 'react';
import { Plus, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface MayaHeaderActionsProps {
  onNewConversation: () => void;
  onDeleteConversation: () => void;
  hasActiveConversation: boolean;
}

export const MayaHeaderActions: React.FC<MayaHeaderActionsProps> = ({ 
  onNewConversation,
  onDeleteConversation,
  hasActiveConversation 
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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

        {/* Delete button - Solo visible si hay conversación activa */}
        {hasActiveConversation && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
            title="Eliminar conversación"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              ¿Eliminar conversación?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La conversación y todos sus mensajes 
              serán eliminados permanentemente del historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDeleteConversation();
                setShowDeleteDialog(false);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Sí, eliminar permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
