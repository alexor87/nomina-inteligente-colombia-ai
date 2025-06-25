
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  UserPlus, 
  Upload, 
  Calendar, 
  FileText, 
  BarChart3, 
  Calculator,
  CreditCard,
  Settings
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DashboardQuickActions = () => {
  const navigate = useNavigate();

  const quickActions = [
    {
      title: 'Nuevo Empleado',
      description: 'Agregar empleado',
      icon: UserPlus,
      color: 'blue',
      action: () => navigate('/employees')
    },
    {
      title: 'Liquidar Nómina',
      description: 'Procesar período',
      icon: Calculator,
      color: 'green',
      action: () => navigate('/payroll-backend')
    },
    {
      title: 'Ver Pagos',
      description: 'Gestionar pagos',
      icon: CreditCard,
      color: 'purple',
      action: () => navigate('/payments')
    },
    {
      title: 'Comprobantes',
      description: 'Generar y enviar',
      icon: FileText,
      color: 'orange',
      action: () => navigate('/vouchers')
    },
    {
      title: 'Reportes',
      description: 'Ver análisis',
      icon: BarChart3,
      color: 'indigo',
      action: () => navigate('/reports')
    },
    {
      title: 'Configuración',
      description: 'Ajustar sistema',
      icon: Settings,
      color: 'gray',
      action: () => navigate('/settings')
    }
  ];

  const colorClasses = {
    blue: 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700',
    green: 'bg-green-50 hover:bg-green-100 border-green-200 text-green-700',
    purple: 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700',
    orange: 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700',
    indigo: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700',
    gray: 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700'
  };

  return (
    <Card className="bg-white border-gray-100">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Acciones Rápidas</h2>
          <span className="text-sm text-gray-500">Accesos directos</span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className={`h-20 flex-col space-y-2 ${colorClasses[action.color as keyof typeof colorClasses]} border-2 transition-all hover:shadow-sm`}
              onClick={action.action}
            >
              <action.icon className="h-6 w-6" />
              <div className="text-center">
                <p className="text-xs font-medium">{action.title}</p>
                <p className="text-xs opacity-75">{action.description}</p>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
