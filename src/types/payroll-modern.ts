
export interface PayrollEmployeeModern {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  salarioBase: number;
  totalDevengos: number;
  totalDeducciones: number;
  totalNeto: number;
  estado: string;
  cargo?: string;
}

export interface PayrollModernTotals {
  totalEmployees: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
}
