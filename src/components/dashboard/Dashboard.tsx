
import { MetricCard } from './MetricCard';
import { DashboardMetrics } from '@/types';

const mockMetrics: DashboardMetrics = {
  totalEmpleados: 24,
  nominasProcesadas: 18,
  alertasLegales: 3,
  gastosNomina: 48500000,
  tendenciaMensual: 5.2
};

export const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex space-x-3">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Procesar Nómina
          </button>
          <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            Generar Reporte
          </button>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Empleados"
          value={mockMetrics.totalEmpleados}
          change={8}
          icon="👥"
          color="blue"
        />
        <MetricCard
          title="Nóminas Procesadas"
          value={mockMetrics.nominasProcesadas}
          change={12}
          icon="✅"
          color="green"
        />
        <MetricCard
          title="Alertas Legales"
          value={mockMetrics.alertasLegales}
          change={-25}
          icon="⚠️"
          color="yellow"
        />
        <MetricCard
          title="Gastos Nómina"
          value={`$${(mockMetrics.gastosNomina / 1000000).toFixed(1)}M`}
          change={mockMetrics.tendenciaMensual}
          icon="💰"
          color="green"
        />
      </div>

      {/* Sección de alertas y próximas tareas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertas Importantes</h3>
          <div className="space-y-3">
            <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <span className="text-yellow-600 mr-3">⚠️</span>
              <div>
                <p className="text-sm font-medium text-gray-900">3 empleados sin afiliación ARL</p>
                <p className="text-xs text-gray-600">Revisa y actualiza las afiliaciones</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-red-600 mr-3">🚨</span>
              <div>
                <p className="text-sm font-medium text-gray-900">2 contratos vencen este mes</p>
                <p className="text-xs text-gray-600">Renueva antes del 25 de enero</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-blue-600 mr-3">ℹ️</span>
              <div>
                <p className="text-sm font-medium text-gray-900">Actualización legal disponible</p>
                <p className="text-xs text-gray-600">Nuevas tarifas 2024 del salario mínimo</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Empleados Recientes</h3>
          <div className="space-y-3">
            {[
              { name: 'María García', position: 'Desarrolladora', date: '15 Ene 2024', status: 'activo' },
              { name: 'Carlos López', position: 'Contador', date: '12 Ene 2024', status: 'activo' },
              { name: 'Ana Rodríguez', position: 'Diseñadora', date: '08 Ene 2024', status: 'pendiente' },
            ].map((employee, index) => (
              <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-sm font-semibold mr-3">
                    {employee.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{employee.name}</p>
                    <p className="text-xs text-gray-600">{employee.position}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{employee.date}</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    employee.status === 'activo' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {employee.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
