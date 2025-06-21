
import { useState } from 'react';
import { PayrollService } from '@/services/PayrollService';
import { PayrollCalculation } from '@/types';
import { SALARIO_MINIMO_2024 } from '@/constants';

export const PayrollCalculator = () => {
  const [calculation, setCalculation] = useState<PayrollCalculation>({
    salarioBase: SALARIO_MINIMO_2024,
    diasTrabajados: 30,
    horasExtra: 0,
    recargoNocturno: 0,
    recargoDominical: 0,
    bonificaciones: 0
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
        {/* Formulario de entrada */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Datos del Empleado</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Salario Base *
              </label>
              <input
                type="number"
                value={calculation.salarioBase}
                onChange={(e) => handleInputChange('salarioBase', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min={SALARIO_MINIMO_2024}
              />
              <p className="text-xs text-gray-500 mt-1">
                Salario mínimo 2024: ${SALARIO_MINIMO_2024.toLocaleString()}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Días Trabajados
              </label>
              <input
                type="number"
                value={calculation.diasTrabajados}
                onChange={(e) => handleInputChange('diasTrabajados', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min={1}
                max={30}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horas Extra
              </label>
              <input
                type="number"
                value={calculation.horasExtra}
                onChange={(e) => handleInputChange('horasExtra', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min={0}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recargo Nocturno
              </label>
              <input
                type="number"
                value={calculation.recargoNocturno}
                onChange={(e) => handleInputChange('recargoNocturno', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min={0}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recargo Dominical
              </label>
              <input
                type="number"
                value={calculation.recargoDominical}
                onChange={(e) => handleInputChange('recargoDominical', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min={0}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bonificaciones
              </label>
              <input
                type="number"
                value={calculation.bonificaciones}
                onChange={(e) => handleInputChange('bonificaciones', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min={0}
              />
            </div>

            <button
              onClick={handleCalculate}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Calcular Nómina
            </button>
          </div>
        </div>

        {/* Resultados */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Resultado del Cálculo</h2>
          
          {result ? (
            <div className="space-y-4">
              {/* Devengados */}
              <div>
                <h3 className="text-lg font-medium text-green-700 mb-2">💰 Devengados</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Salario Base:</span>
                    <span className="font-medium">${result.salarioBase.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Auxilio de Transporte:</span>
                    <span className="font-medium">${result.auxilioTransporte.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Horas Extra:</span>
                    <span className="font-medium">${result.horasExtra.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cesantías:</span>
                    <span className="font-medium">${result.cesantias.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Intereses Cesantías:</span>
                    <span className="font-medium">${result.interesesCesantias.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Prima:</span>
                    <span className="font-medium">${result.prima.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vacaciones:</span>
                    <span className="font-medium">${result.vacaciones.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold text-green-700">
                    <span>Total Devengado:</span>
                    <span>${result.totalDevengado.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Deducciones */}
              <div>
                <h3 className="text-lg font-medium text-red-700 mb-2">📉 Deducciones</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Salud (4%):</span>
                    <span className="font-medium">${result.saludEmpleado.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pensión (4%):</span>
                    <span className="font-medium">${result.pensionEmpleado.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Retención Fuente:</span>
                    <span className="font-medium">${result.retencionFuente.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold text-red-700">
                    <span>Total Deducciones:</span>
                    <span>${result.totalDeducciones.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Neto a pagar */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-blue-900">Neto a Pagar:</span>
                  <span className="text-2xl font-bold text-blue-900">
                    ${result.netoPagado.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <span className="text-4xl mb-4 block">🧮</span>
              <p>Completa los datos y haz clic en "Calcular Nómina" para ver los resultados</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
