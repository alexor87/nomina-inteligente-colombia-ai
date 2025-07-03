
import { PayrollEmployee } from '@/types/payroll';

export interface CompanyInfo {
  razon_social?: string;
  nit?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
}

export interface VoucherData {
  employee: PayrollEmployee & {
    documento?: string;
    tipo_documento?: string;
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
   * SERVICIO PROFESIONAL DE COMPROBANTES TIPO ALELUYA
   * Diseño limpio, profesional y optimizado para Finppi
   */
  
  static generateProfessionalVoucherHTML(data: VoucherData): string {
    const { employee, period, company } = data;
    
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
      }).format(amount);
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    };

    // Cálculos detallados
    const salarioProporcional = Math.round((employee.baseSalary / 30) * employee.workedDays);
    
    // Deducciones calculadas
    const saludEmpleado = Math.round(employee.baseSalary * 0.04); // 4%
    const pensionEmpleado = Math.round(employee.baseSalary * 0.04); // 4%
    const fondoSolidaridad = employee.baseSalary > 4000000 ? Math.round(employee.baseSalary * 0.01) : 0; // 1% si > 4 SMMLV
    const otrasDeduccionesCalculadas = Math.max(0, employee.deductions - saludEmpleado - pensionEmpleado - fondoSolidaridad);
    
    // Horas extra calculadas (ejemplo con valor por hora)
    const valorHoraExtra = Math.round((employee.baseSalary / 240) * 1.25); // Hora extra ordinaria
    const totalHorasExtra = employee.extraHours * valorHoraExtra;

    const documento = employee.documento || employee.id?.slice(0, 8) || 'N/A';
    const tipoDocumento = employee.tipo_documento || 'CC';

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Comprobante de Nómina - ${employee.name}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: "Open Sans", -apple-system, BlinkMacSystemFont, sans-serif;
      margin: 40px;
      color: #333;
      line-height: 1.4;
      background: white;
    }
    
    .voucher-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
    }
    
    h1 {
      text-align: center;
      margin-bottom: 30px;
      color: #1e40af;
      font-size: 24px;
      font-weight: 600;
    }
    
    .section {
      margin-bottom: 25px;
    }
    
    .section-title {
      font-weight: 600;
      font-size: 16px;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 2px solid #e2e8f0;
      color: #1e40af;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      background: white;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    table, th, td {
      border: 1px solid #e2e8f0;
    }
    
    th, td {
      padding: 12px 16px;
      text-align: left;
      vertical-align: top;
    }
    
    th {
      background-color: #f8fafc;
      font-weight: 600;
      color: #475569;
      font-size: 14px;
    }
    
    td {
      font-size: 14px;
      color: #1e293b;
    }
    
    .highlight {
      font-weight: 600;
      background-color: #dbeafe;
      color: #1e40af;
    }
    
    .negative {
      color: #dc2626;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      margin-bottom: 25px;
    }
    
    .info-card {
      background: #f8fafc;
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid #3b82f6;
    }
    
    .info-card h3 {
      font-size: 14px;
      font-weight: 600;
      color: #475569;
      margin-bottom: 8px;
    }
    
    .info-card p {
      font-size: 14px;
      color: #1e293b;
      margin-bottom: 4px;
    }
    
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
    }
    
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    
    .signature-box {
      text-align: center;
      width: 300px;
    }
    
    .signature-line {
      border-top: 1px solid #94a3b8;
      margin-bottom: 8px;
      padding-top: 8px;
      font-size: 12px;
      color: #64748b;
    }
    
    .footer-brand {
      text-align: center;
      font-size: 12px;
      color: #64748b;
      line-height: 1.6;
    }
    
    .footer-brand .brand {
      font-weight: 600;
      color: #1e40af;
    }
    
    .footer-brand .website {
      color: #3b82f6;
      text-decoration: none;
    }
    
    @media print {
      body { margin: 20px; }
      .voucher-container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="voucher-container">
    <h1>Comprobante de Nómina</h1>

    <!-- Información General en Cards -->
    <div class="info-grid">
      <div class="info-card">
        <h3>EMPRESA</h3>
        <p><strong>${company.razon_social || 'Mi Empresa'}</strong></p>
        <p>NIT: ${company.nit || 'N/A'}</p>
        ${company.direccion ? `<p>${company.direccion}</p>` : ''}
      </div>
      
      <div class="info-card">
        <h3>EMPLEADO</h3>
        <p><strong>${employee.name}</strong></p>
        <p>${tipoDocumento}: ${documento}</p>
        ${employee.position ? `<p>Cargo: ${employee.position}</p>` : ''}
      </div>
      
      <div class="info-card">
        <h3>PERÍODO DE PAGO</h3>
        <p><strong>${formatDate(period.startDate)} - ${formatDate(period.endDate)}</strong></p>
        <p>Días trabajados: ${employee.workedDays}</p>
        <p>Salario Base: ${formatCurrency(employee.baseSalary)}</p>
      </div>
    </div>

    <!-- Resumen del Pago -->
    <div class="section">
      <div class="section-title">💵 Resumen del Pago</div>
      <table>
        <thead>
          <tr><th>Concepto</th><th style="text-align: right;">Valor</th></tr>
        </thead>
        <tbody>
          <tr><td>Salario Proporcional</td><td style="text-align: right;">${formatCurrency(salarioProporcional)}</td></tr>
          ${employee.transportAllowance > 0 ? `<tr><td>Subsidio de Transporte</td><td style="text-align: right;">${formatCurrency(employee.transportAllowance)}</td></tr>` : ''}
          ${employee.bonuses > 0 ? `<tr><td>Bonificaciones</td><td style="text-align: right;">${formatCurrency(employee.bonuses)}</td></tr>` : ''}
          ${totalHorasExtra > 0 ? `<tr><td>Horas Extras y Recargos</td><td style="text-align: right;">${formatCurrency(totalHorasExtra)}</td></tr>` : ''}
          ${employee.deductions > 0 ? `<tr class="negative"><td>Deducciones</td><td style="text-align: right;">-${formatCurrency(employee.deductions)}</td></tr>` : ''}
          <tr class="highlight"><td><strong>Total Neto a Pagar</strong></td><td style="text-align: right;"><strong>${formatCurrency(employee.netPay)}</strong></td></tr>
        </tbody>
      </table>
    </div>

    ${employee.extraHours > 0 ? `
    <!-- Horas Extras y Recargos -->
    <div class="section">
      <div class="section-title">⏱ Horas Extras, Ordinarias y Recargos</div>
      <table>
        <thead>
          <tr><th>Concepto</th><th style="text-align: center;">Cantidad</th><th style="text-align: right;">Valor</th></tr>
        </thead>
        <tbody>
          <tr><td>Hora Extra Ordinaria</td><td style="text-align: center;">${employee.extraHours} horas</td><td style="text-align: right;">${formatCurrency(totalHorasExtra)}</td></tr>
          <tr class="highlight"><td colspan="2"><strong>Total pago por horas</strong></td><td style="text-align: right;"><strong>${formatCurrency(totalHorasExtra)}</strong></td></tr>
        </tbody>
      </table>
    </div>
    ` : ''}

    ${employee.deductions > 0 ? `
    <!-- Retenciones y Deducciones -->
    <div class="section">
      <div class="section-title">💸 Retenciones y Deducciones</div>
      <table>
        <thead>
          <tr><th>Concepto</th><th style="text-align: center;">%</th><th style="text-align: right;">Valor</th></tr>
        </thead>
        <tbody>
          ${saludEmpleado > 0 ? `<tr><td>Salud</td><td style="text-align: center;">4%</td><td style="text-align: right;">${formatCurrency(saludEmpleado)}</td></tr>` : ''}
          ${pensionEmpleado > 0 ? `<tr><td>Pensión</td><td style="text-align: center;">4%</td><td style="text-align: right;">${formatCurrency(pensionEmpleado)}</td></tr>` : ''}
          ${fondoSolidaridad > 0 ? `<tr><td>Fondo de Solidaridad</td><td style="text-align: center;">1%</td><td style="text-align: right;">${formatCurrency(fondoSolidaridad)}</td></tr>` : ''}
          ${otrasDeduccionesCalculadas > 0 ? `<tr><td>Otros</td><td style="text-align: center;">-</td><td style="text-align: right;">${formatCurrency(otrasDeduccionesCalculadas)}</td></tr>` : ''}
          <tr class="highlight"><td colspan="2"><strong>Total Retenciones y Deducciones</strong></td><td style="text-align: right;"><strong>${formatCurrency(employee.deductions)}</strong></td></tr>
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- Footer con Firmas -->
    <div class="footer">
      <div class="signatures">
        <div class="signature-box">
          <div class="signature-line">Firma del Empleado</div>
          <p><strong>${employee.name}</strong></p>
          <p>${tipoDocumento}: ${documento}</p>
        </div>
        <div class="signature-box">
          <div class="signature-line">Firma del Representante Legal</div>
          <p><strong>${company.razon_social || 'Mi Empresa'}</strong></p>
          <p>NIT: ${company.nit || 'N/A'}</p>
        </div>
      </div>
      
      <div class="footer-brand">
        <p>Este documento fue generado con <span class="brand">Finppi</span> – Software de Nómina y Seguridad Social</p>
        <p><a href="https://www.finppi.com" class="website">www.finppi.com</a></p>
        <p style="margin-top: 8px; font-size: 11px;">Generado el ${new Date().toLocaleString('es-CO')}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Calcula deducciones detalladas por concepto
   */
  static calculateDetailedDeductions(baseSalary: number, totalDeductions: number) {
    const salud = Math.round(baseSalary * 0.04); // 4%
    const pension = Math.round(baseSalary * 0.04); // 4%
    const fondoSolidaridad = baseSalary > 4000000 ? Math.round(baseSalary * 0.01) : 0; // 1% si > 4 SMMLV
    const otros = Math.max(0, totalDeductions - salud - pension - fondoSolidaridad);

    return {
      salud,
      pension,
      fondoSolidaridad,
      otros,
      total: totalDeductions
    };
  }

  /**
   * Calcula horas extra con valores reales
   */
  static calculateExtraHours(baseSalary: number, extraHours: number) {
    const valorHoraOrdinaria = baseSalary / 240; // 240 horas mensuales
    const valorHoraExtra = valorHoraOrdinaria * 1.25; // 25% recargo
    const totalValue = Math.round(extraHours * valorHoraExtra);

    return {
      hours: extraHours,
      valuePerHour: valorHoraExtra,
      totalValue
    };
  }
}
