
import { useState } from 'react';
import { PayrollService } from '@/services/PayrollService';
import { PayrollCalculation } from '@/types';
import { SALARIO_MINIMO_2024 } from '@/constants';
import { PayrollForm } from './PayrollForm';
import { PayrollResults } from './PayrollResults';

export const PayrollCalculator = () => {
  const [calculation, setCalculation] = useState<PayrollCalculation>({
    salarioBase: SALARIO_MINIMO_2024,
    diasTrabajados: 30,
    horasExtra: 0,
    recargoNocturno: 0,
    recargoDominical: 0,
    bonificaciones: 0,
    auxilioTransporte: 0,
    totalDevengado: 0,
    saludEmpleado: 0,
    pensionEmpleado: 0,
    retencionFuente: 0,
    otrasDeducciones: 0,
    totalDeducciones: 0,
    netoPagado: 0,
    cesantias: 0,
    interesesCesantias: 0,
    prima: 0,
    vacaciones: 0
  });

  const [result, setResult] = useState<any>(null);

  const handleCalculate = () => {
    const payrollResult = PayrollService.calculatePayroll(calculation);
    setResult(payrollResult);
  };

  const handleInputChange = (field: keyof PayrollCalculation, value: string) => {
    setCalculation(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Calculadora de Nómina</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PayrollForm
          calculation={calculation}
          onInputChange={handleInputChange}
          onCalculate={handleCalculate}
        />
        <PayrollResults result={result} />
      </div>
    </div>
  );
};
