
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Send } from 'lucide-react';

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
  if (selectedCount === 0) return null;

  return (
    <Card className="p-4 bg-blue-50 border-blue-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="font-medium text-blue-900">
            {selectedCount} comprobante{selectedCount !== 1 ? 's' : ''} seleccionado{selectedCount !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center space-x-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={onDownloadSelected}
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar ZIP
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={onSendSelected}
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar por correo
            </Button>
          </div>
        </div>
        <Button 
          size="sm" 
          variant="ghost"
          onClick={onDeselectAll}
        >
          Deseleccionar todo
        </Button>
      </div>
    </Card>
  );
};
