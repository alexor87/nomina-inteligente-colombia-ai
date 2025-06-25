
import * as XLSX from 'xlsx';
import { EmployeeWithStatus } from '@/types/employee-extended';
import { formatCurrency } from '@/lib/utils';

export class EmployeeExcelExportService {
  static async exportToExcel(employees: EmployeeWithStatus[], fileName: string = 'empleados') {
    try {
      // Map employee data to Excel-friendly format with readable headers
      const excelData = employees.map(employee => ({
        'Cédula': employee.cedula,
        'Tipo Documento': employee.tipoDocumento,
        'Nombre': employee.nombre,
        'Apellido': employee.apellido,
        'Email': employee.email || 'No registrado',
        'Teléfono': employee.telefono || 'No registrado',
        'Cargo': employee.cargo || 'No definido',
        'Centro de Costo': employee.centrosocial || 'Sin asignar',
        'Salario Base': employee.salarioBase,
        'Salario Base (Formato)': formatCurrency(employee.salarioBase),
        'Tipo Contrato': employee.tipoContrato,
        'Fecha Ingreso': employee.fechaIngreso,
        'Estado': employee.estado,
        'EPS': employee.eps || 'No asignada',
        'AFP': employee.afp || 'No asignada',
        'ARL': employee.arl || 'No asignada',
        'Caja Compensación': employee.cajaCompensacion || 'No asignada',
        'Banco': employee.banco || 'No asignado',
        'Tipo Cuenta': employee.tipoCuenta || 'No definido',
        'Número Cuenta': employee.numeroCuenta || 'No registrado',
        'Titular Cuenta': employee.titularCuenta || 'No registrado',
        'Estado Afiliación': employee.estadoAfiliacion,
        'Nivel Riesgo ARL': employee.nivelRiesgoARL || 'No definido',
        'Fecha Creación': employee.createdAt,
        'Última Actualización': employee.updatedAt
      }));

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Set column widths for better readability
      const columnWidths = [
        { wch: 15 }, // Cédula
        { wch: 12 }, // Tipo Documento
        { wch: 20 }, // Nombre
        { wch: 20 }, // Apellido
        { wch: 25 }, // Email
        { wch: 15 }, // Teléfono
        { wch: 20 }, // Cargo
        { wch: 20 }, // Centro de Costo
        { wch: 15 }, // Salario Base
        { wch: 18 }, // Salario Base (Formato)
        { wch: 15 }, // Tipo Contrato
        { wch: 12 }, // Fecha Ingreso
        { wch: 12 }, // Estado
        { wch: 20 }, // EPS
        { wch: 20 }, // AFP
        { wch: 20 }, // ARL
        { wch: 20 }, // Caja Compensación
        { wch: 20 }, // Banco
        { wch: 12 }, // Tipo Cuenta
        { wch: 15 }, // Número Cuenta
        { wch: 20 }, // Titular Cuenta
        { wch: 15 }, // Estado Afiliación
        { wch: 15 }, // Nivel Riesgo ARL
        { wch: 18 }, // Fecha Creación
        { wch: 18 }  // Última Actualización
      ];

      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Empleados');

      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0];
      const finalFileName = `${fileName}_${currentDate}.xlsx`;

      // Write and download file
      XLSX.writeFile(workbook, finalFileName);

      return {
        success: true,
        fileName: finalFileName,
        recordCount: employees.length
      };
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw new Error('Error al generar el archivo Excel');
    }
  }

  static getExportSummary(totalEmployees: number, filteredEmployees: number) {
    if (totalEmployees === filteredEmployees) {
      return `Se exportarán ${totalEmployees} empleados`;
    } else {
      return `Se exportarán ${filteredEmployees} empleados (filtrados de ${totalEmployees} totales)`;
    }
  }
}
