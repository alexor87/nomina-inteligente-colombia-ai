
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Calendar, Check } from 'lucide-react';

const SubscriptionPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Suscripción y Planes</h1>
      </div>

      {/* Plan actual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Plan Actual</span>
          </CardTitle>
          <CardDescription>
            Información de tu suscripción actual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Plan Profesional</h3>
              <p className="text-gray-600">$299.000/mes</p>
              <p className="text-sm text-gray-500 flex items-center mt-2">
                <Calendar className="h-4 w-4 mr-2" />
                Próxima facturación: 15 de enero de 2024
              </p>
            </div>
            <Badge className="bg-green-100 text-green-800">Activo</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Planes disponibles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Plan Básico</CardTitle>
            <CardDescription>Para empresas pequeñas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-4">$99.000<span className="text-sm font-normal">/mes</span></div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center"><Check className="h-4 w-4 text-green-500 mr-2" />Hasta 5 empleados</li>
              <li className="flex items-center"><Check className="h-4 w-4 text-green-500 mr-2" />1 nómina por mes</li>
              <li className="flex items-center"><Check className="h-4 w-4 text-green-500 mr-2" />Soporte por email</li>
            </ul>
            <Button variant="outline" className="w-full mt-4">Cambiar Plan</Button>
          </CardContent>
        </Card>

        <Card className="border-blue-500 relative">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-blue-500">Plan Actual</Badge>
          </div>
          <CardHeader>
            <CardTitle>Plan Profesional</CardTitle>
            <CardDescription>Para empresas en crecimiento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-4">$299.000<span className="text-sm font-normal">/mes</span></div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center"><Check className="h-4 w-4 text-green-500 mr-2" />Hasta 25 empleados</li>
              <li className="flex items-center"><Check className="h-4 w-4 text-green-500 mr-2" />12 nóminas por mes</li>
              <li className="flex items-center"><Check className="h-4 w-4 text-green-500 mr-2" />Soporte telefónico</li>
              <li className="flex items-center"><Check className="h-4 w-4 text-green-500 mr-2" />Nómina electrónica</li>
            </ul>
            <Button disabled className="w-full mt-4">Plan Actual</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan Empresarial</CardTitle>
            <CardDescription>Para grandes empresas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-4">$599.000<span className="text-sm font-normal">/mes</span></div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center"><Check className="h-4 w-4 text-green-500 mr-2" />Hasta 100 empleados</li>
              <li className="flex items-center"><Check className="h-4 w-4 text-green-500 mr-2" />Nóminas ilimitadas</li>
              <li className="flex items-center"><Check className="h-4 w-4 text-green-500 mr-2" />Soporte prioritario</li>
              <li className="flex items-center"><Check className="h-4 w-4 text-green-500 mr-2" />API completa</li>
            </ul>
            <Button className="w-full mt-4">Actualizar Plan</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SubscriptionPage;
