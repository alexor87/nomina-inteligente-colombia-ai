
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Calculator, 
  FileText, 
  BarChart3,
  Settings,
  Plus
} from 'lucide-react';

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  const actions = [
    {
      title: 'Procesar Nómina',
      icon: <Calculator className="h-5 w-5" />,
      action: () => navigate('/app/payroll'),
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      title: 'Nuevo Empleado',
      icon: <Plus className="h-5 w-5" />,
      action: () => navigate('/app/employees/new'),
      color: 'bg-green-600 hover:bg-green-700',
    },
    {
      title: 'Ver Empleados',
      icon: <Users className="h-5 w-5" />,
      action: () => navigate('/app/employees'),
      color: 'bg-purple-600 hover:bg-purple-700',
    },
    {
      title: 'Reportes',
      icon: <BarChart3 className="h-5 w-5" />,
      action: () => navigate('/app/reports'),
      color: 'bg-orange-600 hover:bg-orange-700',
    },
    {
      title: 'Configuración',
      icon: <Settings className="h-5 w-5" />,
      action: () => navigate('/app/settings'),
      color: 'bg-gray-600 hover:bg-gray-700',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acciones Rápidas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className={`h-20 flex-col space-y-2 text-white border-0 ${action.color}`}
              onClick={action.action}
            >
              {action.icon}
              <span className="text-sm font-medium">{action.title}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
