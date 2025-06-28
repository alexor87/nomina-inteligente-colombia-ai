
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Clock, User, Calendar } from 'lucide-react';

interface ReopenedPeriodBannerProps {
  periodName: string;
  reopenedBy: string;
  reopenedAt: string;
  onBackToHistory: () => void;
  onFinishEditing: () => void;
  isLoading?: boolean;
}

export const ReopenedPeriodBanner = ({
  periodName,
  reopenedBy,
  reopenedAt,
  onBackToHistory,
  onFinishEditing,
  isLoading = false
}: ReopenedPeriodBannerProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUserName = (email: string) => {
    return email.split('@')[0];
  };

  console.log('🎯 ReopenedPeriodBanner rendering with:', {
    periodName,
    reopenedBy,
    reopenedAt,
    isLoading
  });

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 to-orange-600 shadow-lg">
      <Card className="mx-4 mt-4 mb-2 bg-white/95 backdrop-blur-sm border-0 shadow-xl">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onBackToHistory}
              className="hover:bg-amber-50 text-amber-600 hover:text-amber-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Historial
            </Button>
            
            <div className="flex items-center space-x-3">
              <Badge className="bg-amber-100 text-amber-800 font-medium">
                🔓 Período Reabierto
              </Badge>
              <div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {periodName}
                  </h3>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                  <div className="flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    Reabierto por {getUserName(reopenedBy)}
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDate(reopenedAt)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600 flex items-center bg-blue-50 px-3 py-2 rounded-lg">
              💡 <span className="ml-1 font-medium">Editando período específico - Los cambios se guardan automáticamente</span>
            </div>

            <Button 
              onClick={onFinishEditing}
              disabled={isLoading}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              {isLoading ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Cerrando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Finalizar Edición
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
