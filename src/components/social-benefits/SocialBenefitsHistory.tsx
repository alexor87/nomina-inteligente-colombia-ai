
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { History } from 'lucide-react';

export const SocialBenefitsHistory = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Historial de Prestaciones Sociales
        </CardTitle>
        <CardDescription>
          Consulta todos los cálculos y liquidaciones de prestaciones sociales realizados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <History className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Próximamente</h3>
          <p className="text-gray-600">
            El historial detallado de prestaciones sociales estará disponible en la siguiente fase
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
