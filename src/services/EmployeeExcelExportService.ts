import * as XLSX from 'xlsx';
import { EmployeeWithStatus } from '@/types/employee-extended';

export class EmployeeExcelExportService {
  static async exportToExcel(employees: EmployeeWithStatus[]): Promise<void> {
    // Prepare data for Excel
    const data = employees.map(employee => ({
      ID: employee.id,
      Cedula: employee.cedula,
      Nombre: employee.nombre,
      Apellido: employee.apellido,
      Email: employee.email,
      Telefono: employee.telefono,
      Cargo: employee.cargo,
      Salario: employee.salarioBase,
      TipoContrato: employee.tipoContrato,
      fechaIngreso: employee.fechaIngreso,
      centroCostos: employee.centroCostos || (employee as any).centrosocial || 'No asignado',
      eps: employee.eps || 'Sin asignar',
      afp: employee.afp || 'Sin asignar',
      arl: employee.arl || 'Sin asignar',
      cajaCompensacion: employee.cajaCompensacion || 'Sin asignar',
      estadoAfiliacion: employee.estadoAfiliacion,
      nivelRiesgoARL: employee.nivelRiesgoARL,
      ultimaLiquidacion: (employee as any).ultimaLiquidacion
    }));

    // Create a new workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');

    // Generate the Excel file
    XLSX.writeFile(wb, 'employees.xlsx');
  }
}
