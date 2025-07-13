
import { PayrollEmployee } from '@/types/payroll';
import { PayrollVoucherService, VoucherData, CompanyInfo } from '@/services/PayrollVoucherService';

export class PayrollPDFService {
  /**
   * GENERADOR DE PDF PROFESIONAL REFACTORIZADO
   * Ahora usa el nuevo PayrollVoucherService con diseño tipo Aleluya
   */
  
  static generateProfessionalVoucherHTML(
    employee: PayrollEmployee,
    period: { startDate: string; endDate: string; type: string },
    companyInfo?: CompanyInfo
  ): string {
    
    // Preparar datos para el nuevo servicio
    const voucherData: VoucherData = {
      employee: {
        id: employee.id,
        nombre: employee.name, // Usar 'name' en lugar de 'nombre'
        apellido: '', // PayrollEmployee no tiene apellido separado
        cedula: employee.id // Usar ID como cedula temporal
      },
      period,
      company: companyInfo || {
        razon_social: 'Mi Empresa',
        nit: 'N/A'
      }
    };

    // Usar el nuevo servicio profesional
    return PayrollVoucherService.generateProfessionalVoucherHTML(voucherData);
  }

  /**
   * Método legacy mantenido para compatibilidad
   * @deprecated Usar PayrollVoucherService.generateProfessionalVoucherHTML
   */
  static generateLegacyVoucherHTML(
    employee: PayrollEmployee,
    period: { startDate: string; endDate: string; type: string },
    companyInfo?: any
  ): string {
    console.warn('⚠️ Usando método legacy. Considera migrar a PayrollVoucherService');
    return this.generateProfessionalVoucherHTML(employee, period, companyInfo);
  }

  /**
   * Calcular deducciones detalladas (usar datos precalculados)
   */
  static calculateDetailedDeductions(baseSalary: number, totalDeductions: number) {
    return PayrollVoucherService.calculateDetailedDeductions(baseSalary, totalDeductions);
  }

  /**
   * Calcular horas extra (usar datos precalculados)
   */
  static calculateExtraHours(baseSalary: number, extraHours: number) {
    return PayrollVoucherService.calculateExtraHours(baseSalary, extraHours);
  }
}
