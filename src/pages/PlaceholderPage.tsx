
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

/**
 * ✅ PÁGINA TEMPORAL PARA RUTAS ELIMINADAS
 * Muestra mensaje informativo sobre módulos eliminados
 */
const PlaceholderPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <Construction className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-xl text-gray-900">
            Módulo Eliminado
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            Los módulos de liquidación e historial han sido eliminados del sistema.
          </p>
          <p className="text-sm text-gray-500">
            El módulo de novedades se ha conservado para uso futuro.
          </p>
          <Button 
            onClick={() => navigate('/modules/dashboard')}
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlaceholderPage;
