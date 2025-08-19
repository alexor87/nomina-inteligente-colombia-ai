
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { RecentEmployee } from '@/services/DashboardService';

interface MinimalEmployeeListProps {
  employees: RecentEmployee[];
}

export const MinimalEmployeeList: React.FC<MinimalEmployeeListProps> = ({ 
  employees 
}) => {
  return (
    <Card className="border-border/50 shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-foreground flex items-center space-x-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <span>Empleados Recientes</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {employees.length > 0 ? (
            employees.map((employee) => (
              <div key={employee.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs font-semibold text-muted-foreground">
                    {employee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{employee.name}</p>
                    <p className="text-xs text-muted-foreground">{employee.position}</p>
                  </div>
                </div>
                <Badge 
                  variant={employee.status === 'activo' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {employee.status}
                </Badge>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No hay empleados recientes</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
