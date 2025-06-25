
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Eye, Edit, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RecentEmployee {
  id: string;
  name: string;
  position: string;
  dateAdded: string;
  status: 'activo' | 'pendiente' | 'inactivo';
  avatar?: string;
}

interface DashboardRecentEmployeesProps {
  employees: RecentEmployee[];
}

export const DashboardRecentEmployees = ({ employees }: DashboardRecentEmployeesProps) => {
  const navigate = useNavigate();

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'activo':
        return { label: 'Activo', color: 'bg-green-100 text-green-800 border-green-200' };
      case 'pendiente':
        return { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
      case 'inactivo':
        return { label: 'Inactivo', color: 'bg-gray-100 text-gray-800 border-gray-200' };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  return (
    <Card className="bg-white border-gray-100">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center">
            <Users className="h-5 w-5 mr-2 text-blue-600" />
            Empleados Recientes
          </span>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/employees')}
            className="text-blue-600 hover:text-blue-700"
          >
            <Plus className="h-4 w-4 mr-1" />
            Nuevo
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {employees.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No hay empleados recientes</p>
            <p className="text-sm">Agrega tu primer empleado</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => navigate('/employees')}
            >
              Agregar Empleado
            </Button>
          </div>
        ) : (
          employees.map((employee) => {
            const statusConfig = getStatusConfig(employee.status);
            return (
              <div 
                key={employee.id} 
                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center text-blue-700 text-sm font-semibold">
                    {employee.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {employee.name}
                    </p>
                    <p className="text-xs text-gray-600 truncate">
                      {employee.position}
                    </p>
                    <p className="text-xs text-gray-500">
                      {employee.dateAdded}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${statusConfig.color} border`}
                  >
                    {statusConfig.label}
                  </Badge>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {employees.length > 0 && (
          <div className="text-center pt-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-600"
              onClick={() => navigate('/employees')}
            >
              Ver todos los empleados
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
