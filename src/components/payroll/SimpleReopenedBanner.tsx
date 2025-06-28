
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Calendar } from 'lucide-react';

interface SimpleReopenedBannerProps {
  periodName: string;
  onBackToHistory: () => void;
  onFinishEditing: () => void;
  isLoading?: boolean;
}

export const SimpleReopenedBanner = ({
  periodName,
  onBackToHistory,
  onFinishEditing,
  isLoading = false
}: SimpleReopenedBannerProps) => {
  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onBackToHistory}
              className="text-amber-700 hover:text-amber-800"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver
            </Button>
            
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                Editando: {periodName}
              </span>
              <span className="text-xs text-amber-600">• Auto-guardado activo</span>
            </div>
          </div>

          <Button 
            onClick={onFinishEditing}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 text-white"
            size="sm"
          >
            <Save className="h-4 w-4 mr-1" />
            {isLoading ? 'Finalizando...' : 'Finalizar'}
          </Button>
        </div>
      </div>
    </div>
  );
};
