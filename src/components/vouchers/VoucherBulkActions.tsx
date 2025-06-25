
import { Button } from '@/components/ui/button';
import { Download, Mail, X } from 'lucide-react';

interface VoucherBulkActionsProps {
  selectedCount: number;
  onDownloadSelected: () => void;
  onSendSelected: () => void;
  onDeselectAll: () => void;
}

export const VoucherBulkActions = ({
  selectedCount,
  onDownloadSelected,
  onSendSelected,
  onDeselectAll
}: VoucherBulkActionsProps) => {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-blue-900">
            {selectedCount} comprobante{selectedCount > 1 ? 's' : ''} seleccionado{selectedCount > 1 ? 's' : ''}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeselectAll}
            className="text-blue-600 hover:text-blue-800 h-8 px-2"
          >
            <X className="h-4 w-4 mr-1" />
            Deseleccionar
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onSendSelected}
            className="flex items-center space-x-2 text-purple-600 border-purple-200 hover:bg-purple-50"
          >
            <Mail className="h-4 w-4" />
            <span>Enviar por correo</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onDownloadSelected}
            className="flex items-center space-x-2 text-green-600 border-green-200 hover:bg-green-50"
          >
            <Download className="h-4 w-4" />
            <span>📤 Descargar todos</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
