
const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Sistema de Nómina Empresarial
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Gestiona tu nómina de manera eficiente y profesional
        </p>
        <div className="space-x-4">
          <a 
            href="/auth"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Iniciar Sesión
          </a>
          <a 
            href="/register"
            className="bg-white text-blue-600 px-6 py-3 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors font-medium"
          >
            Registrar Empresa
          </a>
        </div>
      </div>
    </div>
  );
};

export default Index;
