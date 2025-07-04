
/**
 * ✅ SERVICIO DE CÁLCULOS UNIFICADO - FASE 1
 * Corrige los cálculos ALEUYA con días proporcionales correctos
 */
export class PayrollCalculationUnifiedService {
  static async calculateEmployeePayroll(params: {
    employee: any;
    period: any;
    novedades: any[];
  }) {
    const { employee, period, novedades } = params;
    const baseSalary = Number(employee.salario_base) || 0;
    
    // ✅ CORRECCIÓN CRÍTICA: Calcular días correctos según tipo de período
    const workedDays = this.calculateCorrectWorkedDays(period);
    console.log(`💰 Calculando empleado ${employee.nombre} - Días: ${workedDays}, Tipo: ${period.tipo_periodo}`);
    
    // ✅ SALARIO PROPORCIONAL CORRECTO
    const proportionalSalary = (baseSalary / 30) * workedDays;
    
    // Calcular valores básicos
    let extraHours = 0;
    let bonuses = 0;
    let disabilities = 0;
    let absences = 0;
    let additionalDeductions = 0;
    
    // Procesar novedades
    for (const novedad of novedades) {
      const valor = Number(novedad.valor) || 0;
      
      switch (novedad.tipo_novedad) {
        case 'horas_extra':
        case 'recargo_nocturno':
        case 'recargo_dominical':
          extraHours += valor;
          break;
        case 'bonificacion':
        case 'bonificaciones':
        case 'comision':
        case 'prima':
          bonuses += valor;
          break;
        case 'incapacidades':
          disabilities += valor;
          break;
        case 'deducciones':
        case 'prestamos':
        case 'embargos':
          additionalDeductions += valor;
          break;
        case 'licencias':
        case 'ausencias':
          absences += Number(novedad.dias) || 0;
          break;
      }
    }
    
    // ✅ CÁLCULO DEVENGADO CORREGIDO
    const grossPay = proportionalSalary + extraHours + bonuses - disabilities;
    
    // ✅ DEDUCCIONES LEGALES CORRECTAS (sobre salario base)
    const healthDeduction = baseSalary * 0.04; // 4% salud empleado
    const pensionDeduction = baseSalary * 0.04; // 4% pensión empleado
    const basicDeductions = healthDeduction + pensionDeduction;
    const totalDeductions = basicDeductions + additionalDeductions;
    
    // ✅ AUXILIO DE TRANSPORTE CORREGIDO (2025)
    const transportAllowance = baseSalary <= 2320000 ? 140606 : 0;
    
    // ✅ NETO PAGADO FINAL
    const netPay = grossPay - totalDeductions + transportAllowance;
    
    console.log(`✅ Cálculo completado para ${employee.nombre}:`, {
      baseSalary,
      workedDays,
      proportionalSalary,
      grossPay,
      totalDeductions,
      transportAllowance,
      netPay
    });
    
    return {
      extraHours,
      bonuses,
      disabilities,
      absences,
      grossPay,
      deductions: totalDeductions,
      netPay,
      transportAllowance,
      workedDays
    };
  }

  // ✅ CÁLCULO CORRECTO DE DÍAS TRABAJADOS
  private static calculateCorrectWorkedDays(period: any): number {
    if (!period || !period.tipo_periodo) {
      console.warn('⚠️ Período sin tipo definido, usando 30 días por defecto');
      return 30;
    }

    switch (period.tipo_periodo) {
      case 'quincenal':
        return 15; // ✅ CORRECCIÓN: 15 días exactos para quincenales
      case 'semanal':
        return 7; // 7 días para semanales
      case 'mensual':
        // Para mensual, calcular días reales entre fechas
        if (period.fecha_inicio && period.fecha_fin) {
          const startDate = new Date(period.fecha_inicio);
          const endDate = new Date(period.fecha_fin);
          const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          return Math.min(days, 31); // Máximo 31 días
        }
        return 30; // Default mensual
      case 'personalizado':
        // Para personalizado, calcular días reales
        if (period.fecha_inicio && period.fecha_fin) {
          const startDate = new Date(period.fecha_inicio);
          const endDate = new Date(period.fecha_fin);
          return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        }
        return 30;
      default:
        console.warn(`⚠️ Tipo de período no reconocido: ${period.tipo_periodo}`);
        return 30;
    }
  }
}
