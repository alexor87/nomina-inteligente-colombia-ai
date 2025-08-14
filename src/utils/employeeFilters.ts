import { EmployeeWithStatus } from '@/types/employee-extended';

export const filterByStatus = (employees: EmployeeWithStatus[], status: string): EmployeeWithStatus[] => {
  if (status === 'all') return employees;
  return employees.filter(employee => employee.estado === status);
};

export const filterByContractType = (employees: EmployeeWithStatus[], contractType: string): EmployeeWithStatus[] => {
  if (contractType === 'all') return employees;
  return employees.filter(employee => employee.tipoContrato === contractType);
};

export const filterBySearchTerm = (employees: EmployeeWithStatus[], searchTerm: string): EmployeeWithStatus[] => {
  if (!searchTerm) return employees;
  const lowerSearchTerm = searchTerm.toLowerCase();
  return employees.filter(employee => {
    return employee.nombre.toLowerCase().includes(lowerSearchTerm) ||
           employee.apellido.toLowerCase().includes(lowerSearchTerm) ||
           employee.cedula.toLowerCase().includes(lowerSearchTerm) ||
           (employee.email && employee.email.toLowerCase().includes(lowerSearchTerm)) ||
           (employee.cargo && employee.cargo.toLowerCase().includes(lowerSearchTerm));
  });
};

export const filterBySalaryRange = (employees: EmployeeWithStatus[], minSalary: number, maxSalary: number): EmployeeWithStatus[] => {
  return employees.filter(employee => employee.salarioBase >= minSalary && employee.salarioBase <= maxSalary);
};

export const filterByDepartment = (employees: EmployeeWithStatus[], department: string): EmployeeWithStatus[] => {
  if (!department || department === 'all') return employees;
  
  return employees.filter(employee => {
    const employeeDepartment = employee.centroCostos || (employee as any).centrosocial || '';
    return employeeDepartment.toLowerCase().includes(department.toLowerCase());
  });
};
