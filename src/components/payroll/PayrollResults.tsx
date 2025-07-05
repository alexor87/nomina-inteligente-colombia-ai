
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

interface PayrollResultsProps {
  result: any;
}

export const PayrollResults = ({ result }: PayrollResultsProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="text-center">
        <Construction className="h-12 w-12 text-orange-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Módulo Eliminado</h2>
        <p className="text-gray-600">
          El componente de resultados de nómina ha sido eliminado del sistema.
        </p>
      </div>
    </div>
  );
};
