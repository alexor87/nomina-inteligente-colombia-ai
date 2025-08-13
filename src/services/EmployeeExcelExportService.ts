import * as XLSX from 'xlsx';
import { EmployeeWithStatus } from '@/types/employee-extended';

export class EmployeeExcelExportService {
  static async exportToExcel(employees: EmployeeWithStatus[], fileName: string = 'employees.xlsx'): Promise<void> {
    try {
      const employeeData = employees.map(employee => ({
        'Cédula': employee.cedula,
        'Nombre': employee.nombre,
        'Apellido': employee.apellido,
        'Email': employee.email || '',
        'Teléfono': employee.telefono || '',
        'Cargo': employee.cargo || '',
        'Salario Base': employee.salarioBase,
        'Centro de Costos': employee.centroCostos || '',
        'Estado': employee.estado,
        'Fecha Ingreso': employee.fechaIngreso,
        'EPS': employee.eps || '',
        'AFP': employee.afp || '',
        'ARL': employee.arl || ''
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(employeeData);

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
      XLSX.writeFile(workbook, fileName);

      console.log('✅ Excel file generated successfully');
    } catch (error) {
      console.error('❌ Error generating Excel file:', error);
      throw error;
    }
  }
}
