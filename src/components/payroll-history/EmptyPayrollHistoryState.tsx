
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Users, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const EmptyPayrollHistoryState = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">¡Bienvenido a NóminaFácil!</CardTitle>
          <p className="text-gray-600 mt-2">
            Tu empresa es nueva y aún no tienes historial de nómina.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
              <Users className="h-6 w-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-medium text-blue-900">1. Agrega Empleados</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Comienza registrando a tus empleados en el sistema
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg">
              <FileText className="h-6 w-6 text-green-600 mt-1" />
              <div>
                <h3 className="font-medium text-green-900">2. Procesa Nómina</h3>
                <p className="text-sm text-green-700 mt-1">
                  Crea y procesa tu primera nómina
                </p>
              </div>
            </div>
          </div>

          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              Una vez que proceses tu primera nómina, aparecerá aquí en el historial.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={() => navigate('/app/employees')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Users className="h-4 w-4 mr-2" />
                Gestionar Empleados
              </Button>
              
              <Button 
                onClick={() => navigate('/app/payroll')}
                variant="outline"
              >
                <FileText className="h-4 w-4 mr-2" />
                Procesar Nómina
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
