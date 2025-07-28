
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
        cedula: employee.id, // Usar ID como cedula temporal
        cargo: employee.position,
        eps: employee.eps,
        afp: employee.afp,
        salarioBase: employee.baseSalary,
        diasTrabajados: employee.workedDays,
        horasExtra: employee.extraHours,
        incapacidades: employee.disabilities,
        bonificaciones: employee.bonuses,
        ausencias: employee.absences,
        totalDevengado: employee.grossPay,
        totalDeducciones: employee.deductions,
        totalNeto: employee.netPay,
        deduccionSalud: employee.healthDeduction,
        deduccionPension: employee.pensionDeduction,
        aportePatronalSalud: employee.employerContributions * 0.4,
        aportePatronalPension: employee.employerContributions * 0.35,
        aportePatronalARL: employee.employerContributions * 0.1,
        aportePatronalCCF: employee.employerContributions * 0.08,
        aportePatronalICBF: employee.employerContributions * 0.05,
        aportePatronalSENA: employee.employerContributions * 0.02
      },
      period: {
        ...period,
        numeroComprobante: `${period.type.toUpperCase()}-${employee.id}-${new Date().getFullYear()}`
      },
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
