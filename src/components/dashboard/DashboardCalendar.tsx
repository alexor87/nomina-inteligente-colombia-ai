
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { useState } from 'react';

export const DashboardCalendar = () => {
  const [currentDate] = useState(new Date());
  
  // Mock calendar events
  const events = [
    {
      date: '2025-01-15',
      type: 'pago',
      title: 'Fecha de Pago',
      description: 'Nómina Enero 2025'
    },
    {
      date: '2025-01-30',
      type: 'corte',
      title: 'Fecha de Corte',
      description: 'Periodo Enero'
    },
    {
      date: '2025-02-01',
      type: 'festivo',
      title: 'Día Festivo',
      description: 'No laborable'
    },
    {
      date: '2025-02-15',
      type: 'vencimiento',
      title: 'Contrato Vence',
      description: 'Juan Pérez'
    }
  ];

  const getEventConfig = (type: string) => {
    switch (type) {
      case 'pago':
        return { color: 'bg-green-100 text-green-800 border-green-200', icon: '💰' };
      case 'corte':
        return { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '📅' };
      case 'festivo':
        return { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: '🎉' };
      case 'vencimiento':
        return { color: 'bg-red-100 text-red-800 border-red-200', icon: '⚠️' };
      default:
        return { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: '📋' };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    });
  };

  const upcomingEvents = events
    .filter(event => new Date(event.date) >= currentDate)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  return (
    <Card className="bg-white border-gray-100">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg">
          <Calendar className="h-5 w-5 mr-2 text-indigo-600" />
          Calendario de Eventos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No hay eventos próximos</p>
            <p className="text-sm">Los eventos aparecerán aquí</p>
          </div>
        ) : (
          upcomingEvents.map((event, index) => {
            const config = getEventConfig(event.type);
            return (
              <div 
                key={index} 
                className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors"
              >
                <div className="flex-shrink-0 text-center">
                  <div className="text-lg">{config.icon}</div>
                  <p className="text-xs font-medium text-gray-600 mt-1">
                    {formatDate(event.date)}
                  </p>
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {event.title}
                  </p>
                  <p className="text-xs text-gray-600">
                    {event.description}
                  </p>
                </div>
                
                <Badge 
                  variant="outline" 
                  className={`text-xs ${config.color} border`}
                >
                  {event.type === 'pago' ? 'Pago' :
                   event.type === 'corte' ? 'Corte' :
                   event.type === 'festivo' ? 'Festivo' :
                   'Vence'}
                </Badge>
              </div>
            );
          })
        )}
        
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-center text-xs text-gray-500">
            <Clock className="h-3 w-3 mr-1" />
            Próximos eventos importantes
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
