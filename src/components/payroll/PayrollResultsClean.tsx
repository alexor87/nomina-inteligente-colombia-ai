
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calculator, Users, TrendingUp, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface PayrollResultsCleanProps {
  result: {
    totalEmployees: number;
    totalGrossPay: number;
    totalDeductions: number;
    totalNetPay: number;
    employerContributions: number;
    period: string;
    employees: any[];
  };
}

export const PayrollResultsClean = ({ result }: PayrollResultsCleanProps) => {
  const totalCost = result.totalGrossPay + result.employerContributions;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Resultados de Liquidación</h2>
          <p className="text-muted-foreground">
            Período: {result.period}
          </p>
        </div>
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          <Calculator className="h-4 w-4 mr-1" />
          Liquidación Completada
        </Badge>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{result.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              Empleados liquidados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devengado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(result.totalGrossPay)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total devengado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deducciones</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(result.totalDeductions)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total deducciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Neto a Pagar</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(result.totalNetPay)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total neto
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle>Información Complementaria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Aportes Patronales</h4>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(result.employerContributions)}
              </p>
              <p className="text-sm text-muted-foreground">
                Contribuciones del empleador
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Costo Total</h4>
              <p className="text-2xl font-bold text-gray-800">
                {formatCurrency(totalCost)}
              </p>
              <p className="text-sm text-muted-foreground">
                Devengado + Aportes patronales
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nota arquitectónica */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex items-center space-x-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-medium text-blue-800">Datos Basados en Novedades</h3>
              <p className="text-blue-700 text-sm">
                Esta liquidación se basa exclusivamente en las novedades registradas. 
                Las vacaciones/ausencias se sincronizan automáticamente con las novedades.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
