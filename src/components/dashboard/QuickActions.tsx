
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
    },
    {
      title: 'Nuevo Empleado',
      icon: <Plus className="h-5 w-5" />,
      action: () => navigate('/app/employees/create'),
    },
    {
      title: 'Ver Empleados',
      icon: <Users className="h-5 w-5" />,
      action: () => navigate('/app/employees'),
    },
    {
      title: 'Reportes',
      icon: <BarChart3 className="h-5 w-5" />,
      action: () => navigate('/app/reports'),
    },
    {
      title: 'Configuración',
      icon: <Settings className="h-5 w-5" />,
      action: () => navigate('/app/settings'),
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
              variant="default"
              className="h-20 flex-col space-y-2"
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
