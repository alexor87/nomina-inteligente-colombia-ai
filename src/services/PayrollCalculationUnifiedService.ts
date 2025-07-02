
export class PayrollCalculationUnifiedService {
  static async calculateEmployeePayroll(params: {
    employee: any;
    period: any;
    novedades: any[];
  }) {
    const { employee, novedades } = params;
    const baseSalary = employee.baseSalary || 0;
    
    // Calcular valores básicos
    let extraHours = 0;
    let bonuses = 0;
    let disabilities = 0;
    let absences = 0;
    let additionalDeductions = 0;
    
    // Procesar novedades
    for (const novedad of novedades) {
      switch (novedad.tipo_novedad) {
        case 'horas_extra':
          extraHours += Number(novedad.valor) || 0;
          break;
        case 'bonificaciones':
          bonuses += Number(novedad.valor) || 0;
          break;
        case 'incapacidades':
          disabilities += Number(novedad.valor) || 0;
          break;
        case 'deducciones':
          additionalDeductions += Number(novedad.valor) || 0;
          break;
        case 'licencias':
          absences += Number(novedad.dias) || 0;
          break;
      }
    }
    
    // Calcular devengado
    const grossPay = baseSalary + extraHours + bonuses - disabilities;
    
    // Calcular deducciones básicas (salud + pensión)
    const basicDeductions = baseSalary * 0.08; // 4% salud + 4% pensión
    const totalDeductions = basicDeductions + additionalDeductions;
    
    // Calcular auxilio de transporte
    const transportAllowance = baseSalary <= 2320000 ? 140606 : 0; // 2024 values
    
    // Neto pagado
    const netPay = grossPay - totalDeductions + transportAllowance;
    
    return {
      extraHours,
      bonuses,
      disabilities,
      absences,
      grossPay,
      deductions: totalDeductions,
      netPay,
      transportAllowance
    };
  }
}
