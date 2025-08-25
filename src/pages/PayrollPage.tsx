
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PayrollPage = () => {
  return (
    <div className="px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nómina</h1>
        <p className="text-gray-600">Gestiona los procesos de nómina de la empresa</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Módulo de Nómina</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Este módulo está en desarrollo. Aquí podrás gestionar todos los procesos relacionados con la nómina.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollPage;
