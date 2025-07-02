
import * as XLSX from 'xlsx';
import { EmployeeWithStatus } from '@/types/employee-extended';

export interface ExportResult {
  recordCount: number;
  fileName: string;
}

export class EmployeeExcelExportService {
  static async exportToExcel(employees: EmployeeWithStatus[], fileName: string = 'employees.xlsx'): Promise<ExportResult> {
    try {
      const formattedData = employees.map(this.formatEmployeeData);
      const ws = XLSX.utils.json_to_sheet(formattedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Employees');
      XLSX.writeFile(wb, fileName);
      
      return {
        recordCount: employees.length,
        fileName: fileName
      };
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw error;
    }
  }

  static getExportSummary(totalCount: number, filteredCount: number): string {
    if (totalCount === filteredCount) {
      return `Exportando ${totalCount} empleados`;
    }
    return `Exportando ${filteredCount} de ${totalCount} empleados (filtrados)`;
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
