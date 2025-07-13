
// CompanyInfo interface for voucher generation
export interface CompanyInfo {
  razon_social: string;
  nit: string;
  direccion?: string;
  ciudad?: string;
  telefono?: string;
  email?: string;
}

// VoucherData interface for voucher generation
export interface VoucherData {
  employee: {
    id?: string;
    nombre: string;
    apellido: string;
    cedula: string;
  };
  period: {
    startDate: string;
    endDate: string;
    type: string;
  };
  company: CompanyInfo;
}

export class PayrollVoucherService {
  /**
   * Generate a professional voucher HTML using pre-calculated data
   */
  static generateProfessionalVoucherHTML(data: VoucherData): string {
    const { employee, period, company } = data;
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Comprobante de Pago - ${employee.nombre} ${employee.apellido}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .company-info { margin-bottom: 20px; }
            .employee-info { margin-bottom: 20px; }
            .period-info { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .total { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>COMPROBANTE DE PAGO DE NÓMINA</h1>
            <h2>${company.razon_social}</h2>
            <p>NIT: ${company.nit}</p>
          </div>
          
          <div class="employee-info">
            <h3>Información del Empleado</h3>
            <p><strong>Nombre:</strong> ${employee.nombre} ${employee.apellido}</p>
            <p><strong>Cédula:</strong> ${employee.cedula}</p>
          </div>
          
          <div class="period-info">
            <h3>Período de Pago</h3>
            <p><strong>Desde:</strong> ${period.startDate}</p>
            <p><strong>Hasta:</strong> ${period.endDate}</p>
            <p><strong>Tipo:</strong> ${period.type}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Salario Base</td>
                <td>$0</td>
              </tr>
              <tr class="total">
                <td>TOTAL NETO A PAGAR</td>
                <td>$0</td>
              </tr>
            </tbody>
          </table>
          
          <div style="margin-top: 30px;">
            <p><em>Este comprobante se genera automáticamente y no requiere firma.</em></p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Calculate detailed deductions (placeholder - use pre-calculated data)
   */
  static calculateDetailedDeductions(baseSalary: number, totalDeductions: number) {
    return {
      salud: totalDeductions * 0.3,
      pension: totalDeductions * 0.3,
      otros: totalDeductions * 0.4
    };
  }

  /**
   * Calculate extra hours (placeholder - use pre-calculated data)
   */
  static calculateExtraHours(baseSalary: number, extraHours: number) {
    const hourlyRate = baseSalary / 240; // Approximate monthly hours
    return extraHours * hourlyRate * 1.25; // 25% extra for overtime
  }
}
