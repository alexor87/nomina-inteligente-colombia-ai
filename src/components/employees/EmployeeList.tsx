
import { useState } from 'react';
import { Employee } from '@/types';

const mockEmployees: Employee[] = [
  {
    id: '1',
    cedula: '12345678',
    nombre: 'María',
    apellido: 'García',
    email: 'maria.garcia@email.com',
    salarioBase: 2500000,
    tipoContrato: 'indefinido',
    fechaIngreso: '2023-06-15',
    estado: 'activo',
    eps: 'Sura EPS',
    afp: 'Porvenir',
    arl: 'Sura ARL',
    cajaCompensacion: 'Compensar',
    cargo: 'Desarrolladora Senior',
    empresaId: '1',
    createdAt: '2023-06-15',
    updatedAt: '2024-01-15'
  },
  {
    id: '2',
    cedula: '23456789',
    nombre: 'Carlos',
    apellido: 'López',
    email: 'carlos.lopez@email.com',
    salarioBase: 1800000,
    tipoContrato: 'fijo',
    fechaIngreso: '2024-01-12',
    estado: 'activo',
    eps: 'Sanitas EPS',
    afp: 'Colfondos',
    arl: 'Colpatria ARL',
    cajaCompensacion: 'Colsubsidio',
    cargo: 'Contador',
    empresaId: '1',
    createdAt: '2024-01-12',
    updatedAt: '2024-01-15'
  }
];

export const EmployeeList = () => {
  const [employees] = useState<Employee[]>(mockEmployees);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEmployees = employees.filter(employee =>
    employee.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.cedula.includes(searchTerm)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'activo': return 'bg-green-100 text-green-800';
      case 'inactivo': return 'bg-red-100 text-red-800';
      case 'vacaciones': return 'bg-blue-100 text-blue-800';
      case 'incapacidad': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Empleados</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          + Nuevo Empleado
        </button>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar por nombre, apellido o cédula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="vacaciones">Vacaciones</option>
              <option value="incapacidad">Incapacidad</option>
            </select>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">Todos los contratos</option>
              <option value="indefinido">Indefinido</option>
              <option value="fijo">Término Fijo</option>
              <option value="obra">Obra o Labor</option>
              <option value="aprendizaje">Aprendizaje</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de empleados */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Empleado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cargo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Salario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contrato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {employee.nombre[0]}{employee.apellido[0]}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {employee.nombre} {employee.apellido}
                        </div>
                        <div className="text-sm text-gray-500">
                          CC: {employee.cedula}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.cargo}</div>
                    <div className="text-sm text-gray-500">{employee.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ${employee.salarioBase.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {employee.tipoContrato === 'indefinido' ? 'Indefinido' :
                       employee.tipoContrato === 'fijo' ? 'Término Fijo' :
                       employee.tipoContrato === 'obra' ? 'Obra o Labor' : 'Aprendizaje'}
                    </div>
                    <div className="text-sm text-gray-500">
                      Desde: {new Date(employee.fechaIngreso).toLocaleDateString('es-CO')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(employee.estado)}`}>
                      {employee.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        Ver
                      </button>
                      <button className="text-green-600 hover:text-green-900">
                        Nómina
                      </button>
                      <button className="text-gray-600 hover:text-gray-900">
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
