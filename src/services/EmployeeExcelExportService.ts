import * as XLSX from 'xlsx';
import { EmployeeWithStatus } from '@/types/employee-extended';

export class EmployeeExcelExportService {
  static async exportToExcel(employees: EmployeeWithStatus[], fileName: string = 'employees.xlsx'): Promise<void> {
    try {
      const formattedData = employees.map(this.formatEmployeeData);
      const ws = XLSX.utils.json_to_sheet(formattedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Employees');
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw error;
    }
  }

  private static formatEmployeeData(employee: EmployeeWithStatus) {
    return {
      'Cédula': employee.cedula,
      'Nombre': employee.nombre,
      'Apellido': employee.apellido,
      'Email': employee.email || '',
      'Teléfono': employee.telefono || '',
      'Cargo': employee.cargo || '',
      'Salario Base': employee.salarioBase,
      'Tipo Contrato': employee.tipoContrato,
      'Fecha Ingreso': employee.fechaIngreso,
      'Estado': employee.estado,
      'Centro de Costos': employee.centroCostos || employee.centrosocial || '',
      'EPS': employee.eps || '',
      'AFP': employee.afp || '',
      'ARL': employee.arl || '',
      'Caja Compensación': employee.cajaCompensacion || ''
    };
  }
}
