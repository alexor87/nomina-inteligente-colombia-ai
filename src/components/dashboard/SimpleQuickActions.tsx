
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Calculator, 
  BarChart3,
  Plus
} from 'lucide-react';

export const SimpleQuickActions: React.FC = () => {
  const navigate = useNavigate();

  const actions = [
    {
      title: 'Procesar Nómina',
      icon: <Calculator className="h-4 w-4" />,
      action: () => navigate('/app/payroll'),
      primary: true,
    },
    {
      title: 'Nuevo Empleado',
      icon: <Plus className="h-4 w-4" />,
      action: () => navigate('/modules/employees/create'),
      primary: false,
    },
    {
      title: 'Ver Empleados',
      icon: <Users className="h-4 w-4" />,
      action: () => navigate('/modules/employees'),
      primary: false,
    },
    {
      title: 'Reportes',
      icon: <BarChart3 className="h-4 w-4" />,
      action: () => navigate('/app/reports'),
      primary: false,
    },
  ];

  return (
    <Card className="border-border/50 shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-foreground">
          Acciones Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.primary ? "default" : "ghost"}
              className={`w-full justify-start h-10 ${
                action.primary 
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              onClick={action.action}
            >
              {action.icon}
              <span className="ml-2 font-medium">{action.title}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
