import { Novedad } from "@/types/nomina";

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

    for (const novedad of this.novedades) {
      if (novedad.tipo === "devengo" && novedad.constitutivo_salario) {
        ibc += novedad.valor;
      } else if (novedad.tipo === "deduccion") {
        // Las deducciones no se suman al IBC, pero podrías restarlas si es necesario
        // ibc -= novedad.valor;
      }
    }

    // Asegurarse de que el IBC no sea menor que 1 SMMLV
    const salarioMinimo = 1300000; // Reemplazar con el valor real del SMMLV
    ibc = Math.max(ibc, salarioMinimo);

    return ibc;
  }

  calcularAuxilioTransporte(ibc: number): number {
    const maximoIBCParaAuxilio = 2600000; // Reemplazar con el valor real
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
  // Add type assertion with proper mapping
  const novedadesForIBC = novedades.map(novedad => ({
    ...novedad,
    constitutivo_salario: novedad.constitutivo_salario ?? false // Provide default value
  })) as NovedadForIBC[];

  const ibcCalculator = new IBCCalculator(
    salarioBase,
    novedadesForIBC, // Use mapped array
    auxilioTransporte
  );

  const ibc = ibcCalculator.calcularIBC();
  const auxilioTransporteCalculado = ibcCalculator.calcularAuxilioTransporte(ibc);

  return { ibc, auxilioTransporteCalculado };
};
