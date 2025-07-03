
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  FileText
} from 'lucide-react';

interface ComplianceItem {
  id: string;
  title: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'overdue';
  priority: 'high' | 'medium' | 'low';
  description: string;
}

export const ComplianceCalendar: React.FC = () => {
  const complianceItems: ComplianceItem[] = [
    {
      id: '1',
      title: 'Declaración de Retenciones',
      dueDate: '2025-02-15',
      status: 'pending',
      priority: 'high',
      description: 'Declaración mensual de retenciones en la fuente'
    },
    {
      id: '2',
      title: 'Pago Seguridad Social',
      dueDate: '2025-02-10',
      status: 'completed',
      priority: 'high',
      description: 'Pago mensual de seguridad social'
    },
    {
      id: '3',
      title: 'Reporte PILA',
      dueDate: '2025-02-20',
      status: 'pending',
      priority: 'medium',
      description: 'Planilla integrada de liquidación de aportes'
    },
    {
      id: '4',
      title: 'Declaración IVA',
      dueDate: '2025-01-30',
      status: 'overdue',
      priority: 'high',
      description: 'Declaración bimestral de IVA'
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completado</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800">Vencido</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-yellow-500';
      default:
        return 'border-l-green-500';
    }
  };

  const pendingItems = complianceItems.filter(item => item.status === 'pending').length;
  const overdueItems = complianceItems.filter(item => item.status === 'overdue').length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span>Cumplimiento Legal</span>
          </CardTitle>
          <div className="flex space-x-2">
            {overdueItems > 0 && (
              <Badge variant="destructive">{overdueItems} vencidos</Badge>
            )}
            <Badge variant="secondary">{pendingItems} pendientes</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {complianceItems.map((item) => (
            <div
              key={item.id}
              className={`p-3 border-l-4 bg-gray-50 rounded-r-lg ${getPriorityColor(item.priority)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(item.status)}
                  <div>
                    <h4 className="font-medium text-gray-900">{item.title}</h4>
                    <p className="text-sm text-gray-600">{item.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Vence: {new Date(item.dueDate).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(item.status)}
                  {item.status === 'pending' && (
                    <Button size="sm" variant="outline">
                      <FileText className="h-3 w-3 mr-1" />
                      Procesar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Button variant="outline" className="w-full">
            <Calendar className="h-4 w-4 mr-2" />
            Ver Calendario Completo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
