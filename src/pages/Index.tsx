
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-4xl mx-auto text-center px-6">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            <span className="text-blue-600">Nómina</span>Col
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Plataforma SaaS para gestión de nómina empresarial en Colombia
          </p>
          <p className="text-sm text-gray-500 mb-8">
            Cumple con toda la legislación laboral y de seguridad social vigente
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Dashboard Inteligente</h3>
            <p className="text-sm text-gray-600">
              Métricas en tiempo real y alertas automáticas de cumplimiento legal
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestión de Empleados</h3>
            <p className="text-sm text-gray-600">
              Registro completo con validaciones automáticas y trazabilidad
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nómina Electrónica</h3>
            <p className="text-sm text-gray-600">
              Cálculos automáticos y generación XML conforme a la DIAN
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors mr-4"
          >
            Ver Demo
          </button>
          <button
            onClick={() => navigate('/payroll')}
            className="border border-blue-600 text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            Calculadora de Nómina
          </button>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            💡 <strong>Próximamente:</strong> Agente de IA integrado para modificaciones con lenguaje natural
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
