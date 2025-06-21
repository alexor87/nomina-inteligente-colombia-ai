
import { PayrollCalculation } from '@/types';
import { SALARIO_MINIMO_2024 } from '@/constants';

interface PayrollFormProps {
  calculation: PayrollCalculation;
  onInputChange: (field: keyof PayrollCalculation, value: string) => void;
  onCalculate: () => void;
}

export const PayrollForm = ({ calculation, onInputChange, onCalculate }: PayrollFormProps) => {
  return (
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
            onChange={(e) => onInputChange('salarioBase', e.target.value)}
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
            onChange={(e) => onInputChange('diasTrabajados', e.target.value)}
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
            onChange={(e) => onInputChange('horasExtra', e.target.value)}
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
            onChange={(e) => onInputChange('recargoNocturno', e.target.value)}
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
            onChange={(e) => onInputChange('recargoDominical', e.target.value)}
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
            onChange={(e) => onInputChange('bonificaciones', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            min={0}
          />
        </div>

        <button
          onClick={onCalculate}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Calcular Nómina
        </button>
      </div>
    </div>
  );
};
