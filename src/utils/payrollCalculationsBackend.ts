
import { BaseEmployeeData, PayrollEmployee, Novedad } from "@/types/payroll";

interface NovedadForIBC extends Novedad {
  constitutivo_salario: boolean;
}

class IBCCalculator {
  private salarioBase: number;
  private novedades: NovedadForIBC[];
  private auxilioTransporte: number;

  constructor(salarioBase: number, novedades: NovedadForIBC[], auxilioTransporte: number) {
    this.salarioBase = salarioBase;
    this.novedades = novedades;
    this.auxilioTransporte = auxilioTransporte;
  }

  calcularIBC(): number {
    let ibc = this.salarioBase;

    // Sumar solo novedades constitutivas de salario
    for (const novedad of this.novedades) {
      if (novedad.constitutivo_salario) {
        ibc += novedad.valor;
      }
      // Deducciones no afectan IBC directamente en este cálculo simplificado
    }

    // Asegurar piso (ejemplo 1 SMMLV - placeholder)
    const salarioMinimo = 1300000; // TODO: Reemplazar por valor real desde configuración
    ibc = Math.max(ibc, salarioMinimo);

    return ibc;
  }

  calcularAuxilioTransporte(ibc: number): number {
    const maximoIBCParaAuxilio = 2600000; // TODO: Reemplazar con valor real desde configuración
    if (this.salarioBase <= maximoIBCParaAuxilio) {
      return this.auxilioTransporte;
    }
    return 0;
  }
}

export const calculateIBC = (
  salarioBase: number,
  novedades: Novedad[],
  auxilioTransporte: number
): { ibc: number; auxilioTransporteCalculado: number } => {
  const novedadesForIBC = (novedades || []).map(novedad => ({
    ...novedad,
    constitutivo_salario: novedad.constitutivo_salario ?? false
  })) as NovedadForIBC[];

  const ibcCalculator = new IBCCalculator(
    salarioBase,
    novedadesForIBC,
    auxilioTransporte
  );

  const ibc = ibcCalculator.calcularIBC();
  const auxilioTransporteCalculado = ibcCalculator.calcularAuxilioTransporte(ibc);

  return { ibc, auxilioTransporteCalculado };
};

// ✅ Cálculo simplificado usado por usePayrollLiquidation
export const calculateEmployeeBackend = async (
  base: BaseEmployeeData,
  periodType: 'quincenal' | 'mensual' | string = 'quincenal',
  year?: string
): Promise<PayrollEmployee> => {
  console.log('🧮 calculateEmployeeBackend (simplified):', { periodType, year, base });

  const workedDays = base.workedDays ?? 0;
  const baseSalary = base.baseSalary ?? 0;
  const dailySalary = baseSalary / 30;
  const grossPay = Math.round(dailySalary * workedDays);

  const healthDeduction = Math.round(grossPay * 0.04);
  const pensionDeduction = Math.round(grossPay * 0.04);
  const deductions = healthDeduction + pensionDeduction;

  const auxTransporteBase = 162000; // placeholder de ejemplo
  const { ibc, auxilioTransporteCalculado } = calculateIBC(baseSalary, base.novedades || [], auxTransporteBase);

  const employerContributions = Math.round(ibc * 0.085); // simplificado
  const netPay = grossPay - deductions + auxilioTransporteCalculado;

  const result: PayrollEmployee = {
    // BaseEmployeeData
    id: base.id,
    name: base.name,
    position: base.position,
    baseSalary,
    workedDays,
    extraHours: base.extraHours ?? 0,
    disabilities: base.disabilities ?? 0,
    bonuses: base.bonuses ?? 0,
    absences: base.absences ?? 0,
    eps: base.eps ?? '',
    afp: base.afp ?? '',
    novedades: base.novedades || [],

    // PayrollEmployee fields
    grossPay,
    deductions,
    netPay,
    transportAllowance: auxilioTransporteCalculado,
    employerContributions,
    ibc,
    status: 'valid',
    errors: [],
    healthDeduction,
    pensionDeduction,
    effectiveWorkedDays: workedDays - (base.absences ?? 0),
    incapacityDays: 0,
    incapacityValue: 0,
    legalBasis: undefined,
    cedula: undefined
  };

  console.log('✅ calculateEmployeeBackend result:', result);
  return result;
};
