
// CompanyInfo interface for voucher generation
export interface CompanyInfo {
  razon_social: string;
  nit: string;
  direccion?: string;
  ciudad?: string;
  telefono?: string;
  email?: string;
}

// Enhanced VoucherData interface for comprehensive voucher generation
export interface VoucherData {
  employee: {
    id?: string;
    nombre: string;
    apellido: string;
    cedula: string;
    cargo?: string;
    tipoContrato?: string;
    fechaIngreso?: string;
    eps?: string;
    afp?: string;
    cuentaBancaria?: string;
    banco?: string;
    centroCosto?: string;
    salarioBase: number;
    diasTrabajados?: number;
    horasExtra?: number;
    incapacidades?: number;
    bonificaciones?: number;
    ausencias?: number;
    totalDevengado: number;
    totalDeducciones: number;
    totalNeto: number;
    // Deducciones detalladas
    deduccionSalud?: number;
    deduccionPension?: number;
    deduccionFondoSolidaridad?: number;
    otrasDecucciones?: number;
    // Aportes patronales (informativos)
    aportePatronalSalud?: number;
    aportePatronalPension?: number;
    aportePatronalARL?: number;
    aportePatronalCCF?: number;
    aportePatronalICBF?: number;
    aportePatronalSENA?: number;
  };
  period: {
    startDate: string;
    endDate: string;
    type: string;
    numeroComprobante?: string;
    year?: number;
    mes?: number;
  };
  company: CompanyInfo;
}

export class PayrollVoucherService {
  /**
   * Generate a professional voucher HTML using pre-calculated data
   */
  static generateProfessionalVoucherHTML(data: VoucherData): string {
    const { employee, period, company } = data;
    
    const formatCurrency = (amount: number = 0): string => {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP'
      }).format(amount);
    };

    const formatDate = (dateString: string): string => {
      return new Date(dateString).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const currentDate = new Date().toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Comprobante de Pago - ${employee.nombre} ${employee.apellido}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              margin: 0; 
              padding: 20px;
              background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
              color: #2c3e50;
              line-height: 1.4;
            }
            
            .voucher-container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              border-radius: 12px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.1);
              overflow: hidden;
            }
            
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              position: relative;
            }
            
            .header::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
              opacity: 0.3;
            }
            
            .header h1 {
              font-size: 24px;
              font-weight: 700;
              margin-bottom: 8px;
              position: relative;
              z-index: 1;
            }
            
            .header h2 {
              font-size: 20px;
              font-weight: 500;
              margin-bottom: 5px;
              position: relative;
              z-index: 1;
            }
            
            .header .nit {
              font-size: 14px;
              opacity: 0.9;
              position: relative;
              z-index: 1;
            }
            
            .voucher-number {
              position: absolute;
              top: 20px;
              right: 20px;
              background: rgba(255,255,255,0.2);
              padding: 8px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
            }
            
            .content-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 30px;
              padding: 30px;
            }
            
            .info-section {
              background: #f8f9fa;
              border-radius: 8px;
              padding: 20px;
              border-left: 4px solid #667eea;
            }
            
            .info-section h3 {
              color: #667eea;
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 15px;
              display: flex;
              align-items: center;
            }
            
            .info-section h3::before {
              content: '👤';
              margin-right: 8px;
              font-size: 18px;
            }
            
            .period-section h3::before {
              content: '📅';
            }
            
            .info-item {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              font-size: 14px;
            }
            
            .info-item .label {
              font-weight: 600;
              color: #555;
            }
            
            .info-item .value {
              color: #2c3e50;
            }
            
            .liquidation-section {
              grid-column: 1 / -1;
              margin-top: 20px;
            }
            
            .liquidation-header {
              background: linear-gradient(90deg, #667eea, #764ba2);
              color: white;
              padding: 15px 20px;
              border-radius: 8px 8px 0 0;
              font-size: 18px;
              font-weight: 600;
              text-align: center;
            }
            
            .tables-container {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 0;
            }
            
            .earnings-table, .deductions-table {
              border: none;
            }
            
            .earnings-table {
              border-right: 2px solid #e9ecef;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 14px;
            }
            
            .earnings-header {
              background: linear-gradient(135deg, #10b981, #059669);
              color: white;
            }
            
            .deductions-header {
              background: linear-gradient(135deg, #ef4444, #dc2626);
              color: white;
            }
            
            .employer-header {
              background: linear-gradient(135deg, #8b5cf6, #7c3aed);
              color: white;
            }
            
            th {
              padding: 12px 15px;
              text-align: left;
              font-weight: 600;
              font-size: 13px;
            }
            
            td {
              padding: 10px 15px;
              border-bottom: 1px solid #f1f3f4;
            }
            
            .amount {
              text-align: right;
              font-weight: 600;
              font-family: 'Courier New', monospace;
            }
            
            .subtotal {
              background: #f8f9fa;
              font-weight: 700;
              border-top: 2px solid #dee2e6;
            }
            
            .net-total {
              background: linear-gradient(135deg, #667eea, #764ba2);
              color: white;
              font-size: 16px;
              font-weight: 700;
              text-align: center;
            }
            
            .net-total td {
              padding: 15px;
              border: none;
            }
            
            .employer-contributions {
              margin-top: 20px;
              background: #f8f9fa;
              border-radius: 8px;
              overflow: hidden;
            }
            
            .footer {
              background: #2c3e50;
              color: white;
              padding: 20px 30px;
              text-align: center;
            }
            
            .footer-grid {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 20px;
              margin-bottom: 15px;
              font-size: 12px;
            }
            
            .footer-item h4 {
              color: #ecf0f1;
              margin-bottom: 5px;
              font-size: 13px;
            }
            
            .qr-validation {
              background: rgba(255,255,255,0.1);
              padding: 10px;
              border-radius: 6px;
              font-size: 11px;
              margin-top: 10px;
            }
            
            @media print {
              body { background: white; padding: 0; }
              .voucher-container { box-shadow: none; margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="voucher-container">
            <!-- Header Profesional -->
            <div class="header">
              <div class="voucher-number">No. ${period.numeroComprobante || 'AUTO-001'}</div>
              <h1>COMPROBANTE DE PAGO DE NÓMINA</h1>
              <h2>${company.razon_social}</h2>
              <div class="nit">NIT: ${company.nit}</div>
              <div style="font-size: 12px; margin-top: 10px; opacity: 0.9;">
                Generado el ${currentDate}
              </div>
            </div>
            
            <!-- Información Principal -->
            <div class="content-grid">
              <!-- Información del Empleado -->
              <div class="info-section">
                <h3>Información del Empleado</h3>
                <div class="info-item">
                  <span class="label">Nombre Completo:</span>
                  <span class="value">${employee.nombre} ${employee.apellido}</span>
                </div>
                <div class="info-item">
                  <span class="label">Documento:</span>
                  <span class="value">${employee.cedula}</span>
                </div>
                ${employee.cargo ? `
                <div class="info-item">
                  <span class="label">Cargo:</span>
                  <span class="value">${employee.cargo}</span>
                </div>` : ''}
                ${employee.eps ? `
                <div class="info-item">
                  <span class="label">EPS:</span>
                  <span class="value">${employee.eps}</span>
                </div>` : ''}
                ${employee.afp ? `
                <div class="info-item">
                  <span class="label">Fondo de Pensión:</span>
                  <span class="value">${employee.afp}</span>
                </div>` : ''}
                <div class="info-item">
                  <span class="label">Salario Base:</span>
                  <span class="value">${formatCurrency(employee.salarioBase)}</span>
                </div>
              </div>
              
              <!-- Información del Período -->
              <div class="info-section period-section">
                <h3>Período de Liquidación</h3>
                <div class="info-item">
                  <span class="label">Fecha Inicio:</span>
                  <span class="value">${formatDate(period.startDate)}</span>
                </div>
                <div class="info-item">
                  <span class="label">Fecha Fin:</span>
                  <span class="value">${formatDate(period.endDate)}</span>
                </div>
                <div class="info-item">
                  <span class="label">Tipo de Período:</span>
                  <span class="value">${period.type.charAt(0).toUpperCase() + period.type.slice(1)}</span>
                </div>
                ${employee.diasTrabajados ? `
                <div class="info-item">
                  <span class="label">Días Trabajados:</span>
                  <span class="value">${employee.diasTrabajados}</span>
                </div>` : ''}
                ${employee.horasExtra ? `
                <div class="info-item">
                  <span class="label">Horas Extra:</span>
                  <span class="value">${employee.horasExtra}</span>
                </div>` : ''}
              </div>
              
              <!-- Detalle de Liquidación -->
              <div class="liquidation-section">
                <div class="liquidation-header">
                  💰 DETALLE DE LIQUIDACIÓN DE NÓMINA
                </div>
                
                <div class="tables-container">
                  <!-- Tabla de Devengados -->
                  <table class="earnings-table">
                    <thead>
                      <tr class="earnings-header">
                        <th colspan="2">✅ DEVENGADOS</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Salario Base</td>
                        <td class="amount">${formatCurrency(employee.salarioBase)}</td>
                      </tr>
                      ${employee.horasExtra ? `
                      <tr>
                        <td>Horas Extra</td>
                        <td class="amount">${formatCurrency(this.calculateExtraHours(employee.salarioBase, employee.horasExtra))}</td>
                      </tr>` : ''}
                      ${employee.bonificaciones ? `
                      <tr>
                        <td>Bonificaciones</td>
                        <td class="amount">${formatCurrency(employee.bonificaciones)}</td>
                      </tr>` : ''}
                      <tr class="subtotal">
                        <td><strong>TOTAL DEVENGADO</strong></td>
                        <td class="amount"><strong>${formatCurrency(employee.totalDevengado)}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                  
                  <!-- Tabla de Deducciones -->
                  <table class="deductions-table">
                    <thead>
                      <tr class="deductions-header">
                        <th colspan="2">❌ DEDUCCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${employee.deduccionSalud ? `
                      <tr>
                        <td>Salud (4%)</td>
                        <td class="amount">${formatCurrency(employee.deduccionSalud)}</td>
                      </tr>` : ''}
                      ${employee.deduccionPension ? `
                      <tr>
                        <td>Pensión (4%)</td>
                        <td class="amount">${formatCurrency(employee.deduccionPension)}</td>
                      </tr>` : ''}
                      ${employee.deduccionFondoSolidaridad ? `
                      <tr>
                        <td>Fondo Solidaridad</td>
                        <td class="amount">${formatCurrency(employee.deduccionFondoSolidaridad)}</td>
                      </tr>` : ''}
                      ${employee.otrasDecucciones ? `
                      <tr>
                        <td>Otras Deducciones</td>
                        <td class="amount">${formatCurrency(employee.otrasDecucciones)}</td>
                      </tr>` : ''}
                      <tr class="subtotal">
                        <td><strong>TOTAL DEDUCCIONES</strong></td>
                        <td class="amount"><strong>${formatCurrency(employee.totalDeducciones)}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <!-- Total Neto -->
                <table style="margin-top: 0;">
                  <tr class="net-total">
                    <td><strong>💵 NETO A PAGAR</strong></td>
                    <td class="amount"><strong>${formatCurrency(employee.totalNeto)}</strong></td>
                  </tr>
                </table>
                
                <!-- Aportes Patronales (Informativos) -->
                <div class="employer-contributions">
                  <table>
                    <thead>
                      <tr class="employer-header">
                        <th colspan="2">🏢 APORTES PATRONALES (Solo informativos)</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${employee.aportePatronalSalud ? `
                      <tr>
                        <td>Salud Patronal (8.5%)</td>
                        <td class="amount">${formatCurrency(employee.aportePatronalSalud)}</td>
                      </tr>` : ''}
                      ${employee.aportePatronalPension ? `
                      <tr>
                        <td>Pensión Patronal (12%)</td>
                        <td class="amount">${formatCurrency(employee.aportePatronalPension)}</td>
                      </tr>` : ''}
                      ${employee.aportePatronalARL ? `
                      <tr>
                        <td>ARL</td>
                        <td class="amount">${formatCurrency(employee.aportePatronalARL)}</td>
                      </tr>` : ''}
                      ${employee.aportePatronalCCF ? `
                      <tr>
                        <td>Caja Compensación (4%)</td>
                        <td class="amount">${formatCurrency(employee.aportePatronalCCF)}</td>
                      </tr>` : ''}
                      ${employee.aportePatronalICBF ? `
                      <tr>
                        <td>ICBF (3%)</td>
                        <td class="amount">${formatCurrency(employee.aportePatronalICBF)}</td>
                      </tr>` : ''}
                      ${employee.aportePatronalSENA ? `
                      <tr>
                        <td>SENA (2%)</td>
                        <td class="amount">${formatCurrency(employee.aportePatronalSENA)}</td>
                      </tr>` : ''}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <!-- Footer Legal -->
            <div class="footer">
              <div class="footer-grid">
                <div class="footer-item">
                  <h4>📄 Validación</h4>
                  <div>Comprobante generado digitalmente</div>
                  <div>Hash: ${period.numeroComprobante?.slice(-8) || 'AUTO123'}</div>
                </div>
                <div class="footer-item">
                  <h4>⚖️ Marco Legal</h4>
                  <div>Código Sustantivo del Trabajo</div>
                  <div>Resolución DIAN vigente</div>
                </div>
                <div class="footer-item">
                  <h4>📧 Soporte</h4>
                  <div>${company.email || 'contacto@empresa.com'}</div>
                  <div>${company.telefono || '+57 (1) 234-5678'}</div>
                </div>
              </div>
              
              <div class="qr-validation">
                🔐 Este comprobante es válido sin firma manuscrita. 
                Para verificar su autenticidad, consulte con el código ${period.numeroComprobante || 'AUTO-001'} 
                en nuestro portal web.
              </div>
            </div>
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
