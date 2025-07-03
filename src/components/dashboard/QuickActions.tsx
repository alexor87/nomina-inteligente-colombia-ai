
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Calculator, 
  FileText, 
  Download,
  Plus,
  Settings,
  CreditCard,
  BarChart3
} from 'lucide-react';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  color: string;
  disabled?: boolean;
}

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  const actions: QuickAction[] = [
    {
      title: 'Procesar Nómina',
      description: 'Liquidar nómina del período actual',
      icon: <Calculator className="h-5 w-5" />,
      action: () => navigate('/app/payroll'),
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      title: 'Nuevo Empleado',
      description: 'Agregar empleado al sistema',
      icon: <Plus className="h-5 w-5" />,
      action: () => navigate('/app/employees/new'),
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      title: 'Ver Empleados',
      description: 'Gestionar empleados activos',
      icon: <Users className="h-5 w-5" />,
      action: () => navigate('/app/employees'),
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      title: 'Generar Reportes',
      description: 'Crear reportes y análisis',
      icon: <BarChart3 className="h-5 w-5" />,
      action: () => navigate('/app/reports'),
      color: 'bg-orange-500 hover:bg-orange-600',
    },
    {
      title: 'Historial Nómina',
      description: 'Ver períodos anteriores',
      icon: <FileText className="h-5 w-5" />,
      action: () => navigate('/app/payroll-history'),
      color: 'bg-teal-500 hover:bg-teal-600',
    },
    {
      title: 'Configuración',
      description: 'Ajustes de empresa',
      icon: <Settings className="h-5 w-5" />,
      action: () => navigate('/app/settings'),
      color: 'bg-gray-500 hover:bg-gray-600',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5 text-blue-600" />
          <span>Acciones Rápidas</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className={`h-auto p-4 flex flex-col items-center space-y-2 text-white border-0 ${action.color} transition-all duration-200 hover:scale-105`}
              onClick={action.action}
              disabled={action.disabled}
            >
              <div className="p-2 bg-white/20 rounded-lg">
                {action.icon}
              </div>
              <div className="text-center">
                <div className="font-medium text-sm">{action.title}</div>
                <div className="text-xs opacity-90">{action.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
