
import { PayrollEmployee } from '@/types/payroll';

export class PayrollPDFService {
  /**
   * GENERADOR DE PDF PROFESIONAL TIPO ALELUYA
   * Diseño corporativo con estructura clara y legible
   */
  
  static generateProfessionalVoucherHTML(
    employee: PayrollEmployee,
    period: { startDate: string; endDate: string; type: string },
    companyInfo?: any
  ): string {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
      }).format(amount);
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const salarioProporcional = Math.round((employee.baseSalary / 30) * employee.workedDays);

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Comprobante de Pago - ${employee.name}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            background-color: #fff;
        }
        
        .voucher-container {
            max-width: 800px;
            margin: 20px auto;
            padding: 30px;
            border: 2px solid #2563eb;
            border-radius: 8px;
            background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 25px;
        }
        
        .company-info {
            flex: 1;
        }
        
        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 5px;
        }
        
        .company-details {
            font-size: 11px;
            color: #64748b;
            line-height: 1.3;
        }
        
        .document-title {
            text-align: center;
            flex: 1;
        }
        
        .document-title h1 {
            font-size: 18px;
            color: #1e40af;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .period-info {
            font-size: 11px;
            color: #64748b;
            background: #f1f5f9;
            padding: 8px 15px;
            border-radius: 5px;
            border-left: 4px solid #2563eb;
        }
        
        .employee-section {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 25px;
            border: 1px solid #e2e8f0;
        }
        
        .employee-section h2 {
            font-size: 14px;
            color: #1e40af;
            margin-bottom: 15px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 8px;
        }
        
        .employee-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        
        .employee-field {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
        }
        
        .field-label {
            font-weight: bold;
            color: #475569;
        }
        
        .field-value {
            color: #1e293b;
        }
        
        .payment-section {
            margin-bottom: 25px;
        }
        
        .section-title {
            font-size: 16px;
            color: #1e40af;
            font-weight: bold;
            margin-bottom: 15px;
            text-align: center;
            padding: 10px;
            background: linear-gradient(135deg, #2563eb, #3b82f6);
            color: white;
            border-radius: 5px;
        }
        
        .payment-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
        }
        
        .payment-table th {
            background: linear-gradient(135deg, #1e40af, #2563eb);
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: bold;
            font-size: 13px;
        }
        
        .payment-table td {
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
            background: #fff;
        }
        
        .payment-table tr:nth-child(even) td {
            background: #f8fafc;
        }
        
        .payment-table tr:hover td {
            background: #f1f5f9;
        }
        
        .amount-cell {
            text-align: right;
            font-weight: bold;
            color: #059669;
        }
        
        .deduction-amount {
            color: #dc2626;
        }
        
        .totals-section {
            background: linear-gradient(135deg, #f8fafc, #ffffff);
            padding: 20px;
            border-radius: 8px;
            border: 2px solid #e2e8f0;
            margin-bottom: 25px;
        }
        
        .totals-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            text-align: center;
        }
        
        .total-item {
            padding: 15px;
            border-radius: 8px;
            border: 2px solid;
        }
        
        .total-devengado {
            background: #dcfce7;
            border-color: #22c55e;
        }
        
        .total-deducciones {
            background: #fee2e2;
            border-color: #ef4444;
        }
        
        .total-neto {
            background: #dbeafe;
            border-color: #3b82f6;
        }
        
        .total-label {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .total-amount {
            font-size: 18px;
            font-weight: bold;
        }
        
        .footer {
            border-top: 2px solid #e2e8f0;
            padding-top: 20px;
            text-align: center;
            color: #64748b;
            font-size: 10px;
        }
        
        .signature-section {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
        }
        
        .signature-box {
            width: 200px;
            text-align: center;
            border-top: 1px solid #94a3b8;
            padding-top: 10px;
        }
        
        @media print {
            .voucher-container {
                margin: 0;
                border: none;
                box-shadow: none;
            }
        }
    </style>
</head>
<body>
    <div class="voucher-container">
        <!-- ENCABEZADO PROFESIONAL -->
        <div class="header">
            <div class="company-info">
                <div class="company-name">${companyInfo?.razon_social || 'Mi Empresa'}</div>
                <div class="company-details">
                    ${companyInfo?.nit ? `NIT: ${companyInfo.nit}<br>` : ''}
                    ${companyInfo?.direccion ? `${companyInfo.direccion}<br>` : ''}
                    ${companyInfo?.telefono ? `Tel: ${companyInfo.telefono}<br>` : ''}
                    ${companyInfo?.email ? `Email: ${companyInfo.email}` : ''}
                </div>
            </div>
            
            <div class="document-title">
                <h1>COMPROBANTE DE PAGO</h1>
                <div class="period-info">
                    <strong>Período:</strong> ${formatDate(period.startDate)} - ${formatDate(period.endDate)}<br>
                    <strong>Tipo:</strong> ${period.type.toUpperCase()}<br>
                    <strong>Generado:</strong> ${formatDate(new Date().toISOString())}
                </div>
            </div>
        </div>
        
        <!-- INFORMACIÓN DEL EMPLEADO -->
        <div class="employee-section">
            <h2>📋 INFORMACIÓN DEL EMPLEADO</h2>
            <div class="employee-grid">
                <div class="employee-field">
                    <span class="field-label">Nombre Completo:</span>
                    <span class="field-value">${employee.name}</span>
                </div>
                <div class="employee-field">
                    <span class="field-label">Cargo:</span>
                    <span class="field-value">${employee.position || 'No especificado'}</span>
                </div>
                <div class="employee-field">
                    <span class="field-label">EPS:</span>
                    <span class="field-value">${employee.eps || 'No asignada'}</span>
                </div>
                <div class="employee-field">
                    <span class="field-label">AFP:</span>
                    <span class="field-value">${employee.afp || 'No asignada'}</span>
                </div>
            </div>
        </div>
        
        <!-- DETALLE DE DEVENGADOS -->
        <div class="payment-section">
            <div class="section-title">💰 CONCEPTOS DEVENGADOS</div>
            <table class="payment-table">
                <thead>
                    <tr>
                        <th>Concepto</th>
                        <th style="text-align: center;">Cantidad/Días</th>
                        <th style="text-align: right;">Valor</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Salario Base (Mensual)</td>
                        <td style="text-align: center;">-</td>
                        <td class="amount-cell">${formatCurrency(employee.baseSalary)}</td>
                    </tr>
                    <tr>
                        <td>Salario Proporcional</td>
                        <td style="text-align: center;">${employee.workedDays} días</td>
                        <td class="amount-cell">${formatCurrency(salarioProporcional)}</td>
                    </tr>
                    <tr>
                        <td>Horas Extra</td>
                        <td style="text-align: center;">${employee.extraHours} horas</td>
                        <td class="amount-cell">${formatCurrency(0)}</td>
                    </tr>
                    <tr>
                        <td>Bonificaciones</td>
                        <td style="text-align: center;">-</td>
                        <td class="amount-cell">${formatCurrency(employee.bonuses)}</td>
                    </tr>
                    <tr>
                        <td>Auxilio de Transporte</td>
                        <td style="text-align: center;">-</td>
                        <td class="amount-cell">${formatCurrency(employee.transportAllowance)}</td>
                    </tr>
                    ${employee.disabilities > 0 ? `
                    <tr>
                        <td>Incapacidades</td>
                        <td style="text-align: center;">-</td>
                        <td class="amount-cell deduction-amount">-${formatCurrency(employee.disabilities)}</td>
                    </tr>` : ''}
                </tbody>
            </table>
        </div>
        
        <!-- TOTALES FINALES -->
        <div class="totals-section">
            <div class="totals-grid">
                <div class="total-item total-devengado">
                    <div class="total-label" style="color: #15803d;">Total Devengado</div>
                    <div class="total-amount" style="color: #15803d;">${formatCurrency(employee.grossPay)}</div>
                </div>
                
                <div class="total-item total-deducciones">
                    <div class="total-label" style="color: #dc2626;">Total Deducciones</div>
                    <div class="total-amount" style="color: #dc2626;">-${formatCurrency(employee.deductions)}</div>
                </div>
                
                <div class="total-item total-neto">
                    <div class="total-label" style="color: #1d4ed8;">Neto a Pagar</div>
                    <div class="total-amount" style="color: #1d4ed8;">${formatCurrency(employee.netPay)}</div>
                </div>
            </div>
        </div>
        
        <!-- FIRMAS -->
        <div class="signature-section">
            <div class="signature-box">
                <div class="signature-label">Elaboró</div>
            </div>
            <div class="signature-box">
                <div class="signature-label">Empleado</div>
            </div>
        </div>
        
        <!-- PIE DE PÁGINA -->
        <div class="footer">
            <p>Este documento fue generado electrónicamente el ${new Date().toLocaleString('es-CO')}</p>
            <p>Comprobante de pago válido según normativa laboral colombiana</p>
        </div>
    </div>
</body>
</html>`;
  }
}
