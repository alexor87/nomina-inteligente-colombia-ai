
import { PayrollSummary } from './PayrollSummary';

interface PayrollResultsProps {
  result: any;
}

export const PayrollResults = ({ result }: PayrollResultsProps) => {
  if (!result) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Resultado del Cálculo</h2>
        <div className="text-center text-gray-500 py-8">
          <span className="text-4xl mb-4 block">🧮</span>
          <p>Completa los datos y haz clic en "Calcular Nómina" para ver los resultados</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Resultado del Cálculo</h2>
      
      <div className="space-y-6">
        {/* PAGO AL EMPLEADO */}
        <PayrollSummary
          title="PAGO AL EMPLEADO"
          icon="💰"
          bgColor="bg-green-50"
          borderColor="border-green-200"
          textColor="text-green-800"
        >
          <div className="space-y-2 text-sm mb-4">
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
              <span>Recargo Nocturno:</span>
              <span className="font-medium">${result.recargoNocturno.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Recargo Dominical:</span>
              <span className="font-medium">${result.recargoDominical.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Bonificaciones:</span>
              <span className="font-medium">${result.bonificaciones.toLocaleString()}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold text-green-700">
              <span>Subtotal Devengado:</span>
              <span>${result.totalDevengado.toLocaleString()}</span>
            </div>
          </div>

          {/* Deducciones */}
          <div className="border-t pt-3">
            <h4 className="font-medium text-red-700 mb-2">📉 Deducciones</h4>
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
          <div className="bg-blue-600 text-white rounded-lg p-3 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">NETO A PAGAR:</span>
              <span className="text-2xl font-bold">
                ${result.netoPagado.toLocaleString()}
              </span>
            </div>
          </div>
        </PayrollSummary>

        {/* PROVISIONES DEL EMPLEADOR */}
        <PayrollSummary
          title="PROVISIONES A APARTAR (Empleador)"
          icon="🏦"
          bgColor="bg-orange-50"
          borderColor="border-orange-200"
          textColor="text-orange-800"
        >
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Cesantías (8.33%):</span>
              <span className="font-medium">${result.cesantias.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Intereses Cesantías (12%):</span>
              <span className="font-medium">${result.interesesCesantias.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Prima (8.33%):</span>
              <span className="font-medium">${result.prima.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Vacaciones (4.17%):</span>
              <span className="font-medium">${result.vacaciones.toLocaleString()}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold text-orange-700">
              <span>Total Provisiones:</span>
              <span>${(result.cesantias + result.interesesCesantias + result.prima + result.vacaciones).toLocaleString()}</span>
            </div>
          </div>
          <p className="text-xs text-orange-600 mt-2">
            * Estas provisiones no se pagan al empleado, se apartan para pagos futuros
          </p>
        </PayrollSummary>

        {/* RESUMEN TOTAL PARA EMPLEADOR */}
        <PayrollSummary
          title="COSTO TOTAL EMPLEADOR"
          icon="📊"
          bgColor="bg-gray-50"
          borderColor="border-gray-200"
          textColor="text-gray-800"
        >
          <div className="flex justify-between items-center text-lg font-bold text-gray-900">
            <span>Pago + Provisiones:</span>
            <span>
              ${(result.netoPagado + result.cesantias + result.interesesCesantias + result.prima + result.vacaciones).toLocaleString()}
            </span>
          </div>
        </PayrollSummary>
      </div>
    </div>
  );
};
