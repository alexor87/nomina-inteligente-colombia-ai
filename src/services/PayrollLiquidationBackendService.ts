import { supabase } from '@/integrations/supabase/client';

export interface PayrollCalculationInput {
  baseSalary: number;
  workedDays: number;
  extraHours: number;
  disabilities: number;
  bonuses: number;
  absences: number;
  periodType: 'quincenal' | 'mensual';
  // ✅ NUEVO: enviar novedades completas al backend (para reflejar incapacidades)
  novedades?: Array<{
    valor: number;
    constitutivo_salario: boolean;
    tipo_novedad: string;
    subtipo?: string;
    dias?: number;
  }>;
}

export interface PayrollCalculationResult {
  regularPay: number;
  extraPay: number;
  transportAllowance: number;
  grossPay: number;
  healthDeduction: number;
  pensionDeduction: number;
  totalDeductions: number;
  netPay: number;
  employerHealth: number;
  employerPension: number;
  employerArl: number;
  employerCaja: number;
  employerIcbf: number;
  employerSena: number;
  employerContributions: number;
  totalPayrollCost: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class PayrollCalculationBackendService {
  static async calculatePayroll(input: PayrollCalculationInput): Promise<PayrollCalculationResult> {
    try {
      const { data, error } = await supabase.functions.invoke('payroll-calculations', {
        body: {
          action: 'calculate',
          data: input
        }
      });

      if (error) {
        console.error('Error calling payroll calculation function:', error);
        throw new Error('Error en el cálculo de nómina');
      }

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido en el cálculo');
      }

      return data.data;
    } catch (error) {
      console.error('Error in calculatePayroll:', error);
      throw error;
    }
  }

  static async validateEmployee(
    input: PayrollCalculationInput,
    eps?: string,
    afp?: string
  ): Promise<ValidationResult> {
    try {
      const { data, error } = await supabase.functions.invoke('payroll-calculations', {
        body: {
          action: 'validate',
          data: { ...input, eps, afp }
        }
      });

      if (error) {
        console.error('Error calling validation function:', error);
        throw new Error('Error en la validación');
      }

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido en la validación');
      }

      return data.data;
    } catch (error) {
      console.error('Error in validateEmployee:', error);
      throw error;
    }
  }

  static async calculateBatch(inputs: PayrollCalculationInput[]): Promise<PayrollCalculationResult[]> {
    try {
      const { data, error } = await supabase.functions.invoke('payroll-calculations', {
        body: {
          action: 'batch-calculate',
          data: { inputs }
        }
      });

      if (error) {
        console.error('Error calling batch calculation function:', error);
        throw new Error('Error en el cálculo por lotes');
      }

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido en el cálculo por lotes');
      }

      return data.data;
    } catch (error) {
      console.error('Error in calculateBatch:', error);
      throw error;
    }
  }

  static getConfigurationInfo(): {
    salarioMinimo: number;
    auxilioTransporte: number;
    uvt: number;
    year: string;
  } {
    return {
      salarioMinimo: 1300000,
      auxilioTransporte: 200000,
      uvt: 47065,
      year: '2025'
    };
  }
}

export const PayrollLiquidationBackendService = {
  async loadEmployeesForLiquidation() {
    console.log('🔄 Loading employees with novedades (Backend Service)...');
    
    try {
      // 1. Get current user's company
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('Usuario sin empresa asignada');

      // 2. Get company settings to determine default worked days
      const { data: companySettings } = await supabase
        .from('company_settings')
        .select('periodicity')
        .eq('company_id', profile.company_id)
        .single();

      // Calculate default worked days based on company periodicity
      const getDefaultWorkedDays = (periodicity: string) => {
        switch (periodicity) {
          case 'quincenal':
            return 15;
          case 'semanal':
            return 7;
          case 'mensual':
          default:
            return 30;
        }
      };

      const defaultWorkedDays = getDefaultWorkedDays(companySettings?.periodicity || 'mensual');
      console.log(`Using default worked days: ${defaultWorkedDays} based on periodicity: ${companySettings?.periodicity || 'mensual'}`);

      // 3. Get active employees
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('estado', 'activo');

      if (employeesError) throw employeesError;
      if (!employees) return [];

      console.log(`Empleados cargados para la empresa del usuario: ${employees.length}`);

      // 4. Get current active period
      const { data: activePeriod } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('estado', 'borrador')
        .order('fecha_inicio', { ascending: false })
        .limit(1)
        .single();

      // 5. Get manual novedades for the active period
      let manualNovedadesByEmployee: Record<string, any[]> = {};
      if (activePeriod) {
        const { data: manualNovedades } = await supabase
          .from('payroll_novedades')
          .select('*')
          .eq('periodo_id', activePeriod.id)
          .eq('company_id', profile.company_id);

        if (manualNovedades) {
          manualNovedadesByEmployee = manualNovedades.reduce((acc, novedad) => {
            if (!acc[novedad.empleado_id]) {
              acc[novedad.empleado_id] = [];
            }
            acc[novedad.empleado_id].push(novedad);
            return acc;
          }, {} as Record<string, any[]>);
        }
      }

      // 🎯 NUEVA FUNCIONALIDAD: Generar novedades automáticas desde ausencias
      let autoNovedadesByEmployee: Record<string, any[]> = {};
      if (activePeriod) {
        console.log('🔄 Generando novedades automáticas desde ausencias...');
        
        // Importar servicio multi-período
        const { MultiPeriodAbsenceService } = await import('@/services/MultiPeriodAbsenceService');
        
        const autoNovedades = await MultiPeriodAbsenceService.generatePartialNovedadesForPeriod(
          activePeriod.id,
          profile.company_id
        );

        autoNovedadesByEmployee = autoNovedades.reduce((acc, novedad) => {
          if (!acc[novedad.empleado_id]) {
            acc[novedad.empleado_id] = [];
          }
          acc[novedad.empleado_id].push(novedad);
          return acc;
        }, {} as Record<string, any[]>);

        console.log(`✅ ${autoNovedades.length} novedades automáticas generadas`);
      }

      // 6. Calculate payroll for each employee with combined novedades
      const calculatedEmployees = await Promise.all(
        employees.map(async (employee) => {
          const manualNovedades = manualNovedadesByEmployee[employee.id] || [];
          const autoNovedades = autoNovedadesByEmployee[employee.id] || [];
          const allNovedades = [...manualNovedades, ...autoNovedades];
          
          // Calculate bonuses and extra values from all novedades
          let bonuses = 0;
          let extraHours = 0;
          let disabilities = 0;
          let absences = 0;
          let deductions = 0;

          allNovedades.forEach(novedad => {
            const isAuto = novedad.isAutoGenerated || false;
            console.log(`Processing ${isAuto ? 'AUTO' : 'MANUAL'} novedad:`, {
              type: novedad.tipo_novedad,
              value: novedad.valor,
              employee: employee.nombre
            });

            switch (novedad.tipo_novedad) {
              case 'bonificacion':
              case 'comision':
              case 'prima':
              case 'otros_ingresos':
                bonuses += novedad.valor;
                break;
              case 'horas_extra':
                extraHours += novedad.horas || 0;
                bonuses += novedad.valor;
                break;
              case 'incapacidad':
                disabilities += novedad.valor;
                break;
              case 'vacaciones':
              case 'licencia_remunerada':
                bonuses += novedad.valor; // Vacaciones suman al devengado
                break;
              case 'ausencia':
              case 'licencia_no_remunerada':
                absences += novedad.dias || 0;
                deductions += Math.abs(novedad.valor); // Ausencias restan
                break;
              case 'libranza':
              case 'multa':
              case 'descuento_voluntario':
                deductions += novedad.valor;
                break;
            }
          });

          // ✅ NUEVO: Mapear novedades para el backend (incluyendo días y subtipo)
          const mappedNovedades = allNovedades.map(nv => ({
            valor: Number(nv.valor || 0),
            constitutivo_salario: typeof nv.constitutivo_salario === 'boolean'
              ? nv.constitutivo_salario
              : (['horas_extra', 'recargo_nocturno', 'comision'].includes(nv.tipo_novedad)),
            tipo_novedad: nv.tipo_novedad,
            subtipo: nv.subtipo || undefined,
            dias: nv.dias || undefined
          }));

          // ✅ NUEVO: Restar días de incapacidad del cómputo de días trabajados
          const incapacityDays = allNovedades
            .filter(nv => nv.tipo_novedad === 'incapacidad')
            .reduce((sum, nv) => sum + (Number(nv.dias) || 0), 0);

          // Use default worked days from company configuration minus ausencias e incapacidades
          const workedDays = Math.max(0, defaultWorkedDays - absences - incapacityDays);

          const input: PayrollCalculationInput = {
            baseSalary: Number(employee.salario_base) || 1300000,
            workedDays,
            extraHours,
            disabilities,
            bonuses,
            absences,
            periodType: activePeriod?.tipo_periodo as 'quincenal' | 'mensual' || companySettings?.periodicity as 'quincenal' | 'mensual' || 'mensual',
            // ✅ Enviar novedades completas para que el backend sume devengados y descuente días
            novedades: mappedNovedades
          };

          try {
            const calculation = await PayrollCalculationBackendService.calculatePayroll(input);
            const validation = await PayrollCalculationBackendService.validateEmployee(input, employee.eps, employee.afp);

            return {
              id: employee.id,
              name: `${employee.nombre} ${employee.apellido}`,
              position: employee.cargo || 'No definido',
              baseSalary: input.baseSalary,
              workedDays: input.workedDays,
              extraHours: input.extraHours,
              bonuses: input.bonuses,
              absences: input.absences,
              disabilities: input.disabilities,
              grossPay: calculation.grossPay,
              deductions: calculation.totalDeductions + deductions,
              netPay: calculation.netPay - deductions,
              employerContributions: calculation.employerContributions,
              totalCost: calculation.totalPayrollCost + deductions,
              status: validation.isValid ? 'valid' as const : 'error' as const,
              validationErrors: validation.errors,
              validationWarnings: validation.warnings,
              eps: employee.eps,
              afp: employee.afp,
              // 🎯 NUEVOS CAMPOS: Información de novedades combinadas
              novedadesCount: allNovedades.length,
              manualNovedadesCount: manualNovedades.length,
              autoNovedadesCount: autoNovedades.length,
              hasAutoNovedades: autoNovedades.length > 0
            };
          } catch (error) {
            console.error(`Error calculating for employee ${employee.id}:`, error);
            return {
              id: employee.id,
              name: `${employee.nombre} ${employee.apellido}`,
              position: employee.cargo || 'No definido',
              baseSalary: Number(employee.salario_base) || 1300000,
              workedDays: defaultWorkedDays,
              extraHours: 0,
              bonuses: 0,
              absences: 0,
              disabilities: 0,
              grossPay: 0,
              deductions: 0,
              netPay: 0,
              employerContributions: 0,
              totalCost: 0,
              status: 'error' as const,
              validationErrors: ['Error en cálculo backend'],
              validationWarnings: [],
              eps: employee.eps,
              afp: employee.afp,
              novedadesCount: 0,
              manualNovedadesCount: 0,
              autoNovedadesCount: 0,
              hasAutoNovedades: false
            };
          }
        })
      );

      return calculatedEmployees;
    } catch (error) {
      console.error('Error loading employees with novedades:', error);
      throw error;
    }
  },

  async savePayrollLiquidation(liquidationData: {
    period: {
      id: string;
      startDate: string;
      endDate: string;
      status: 'approved';
      type: 'quincenal' | 'mensual';
    };
    employees: any[];
  }) {
    console.log('💾 Saving payroll liquidation (Backend)...', liquidationData);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('Usuario sin empresa asignada');

      // Use UPSERT to handle duplicate key constraints
      const payrollRecords = liquidationData.employees.map(emp => ({
        employee_id: emp.id,
        company_id: profile.company_id,
        periodo: `${liquidationData.period.startDate} - ${liquidationData.period.endDate}`,
        salario_base: emp.baseSalary,
        dias_trabajados: emp.workedDays,
        horas_extra: emp.extraHours,
        bonificaciones: emp.bonuses,
        auxilio_transporte: emp.baseSalary <= 2600000 ? 200000 : 0,
        total_devengado: emp.grossPay,
        salud_empleado: Math.round(emp.baseSalary * 0.04),
        pension_empleado: Math.round(emp.baseSalary * 0.04),
        total_deducciones: emp.deductions,
        neto_pagado: emp.netPay,
        estado: 'procesada'
      }));

      // Use upsert to handle conflicts
      const { error: payrollError } = await supabase
        .from('payrolls')
        .upsert(payrollRecords, {
          onConflict: 'employee_id,periodo',
          ignoreDuplicates: false
        });

      if (payrollError) {
        console.error('Error upserting payroll records:', payrollError);
        throw payrollError;
      }

      const voucherRecords = liquidationData.employees.map(emp => ({
        employee_id: emp.id,
        company_id: profile.company_id,
        periodo: `${liquidationData.period.startDate} - ${liquidationData.period.endDate}`,
        start_date: liquidationData.period.startDate,
        end_date: liquidationData.period.endDate,
        net_pay: emp.netPay,
        voucher_status: 'generado',
        dian_status: 'pendiente',
        generated_by: user.id
      }));

      const { error: voucherError } = await supabase
        .from('payroll_vouchers')
        .upsert(voucherRecords, {
          onConflict: 'company_id,employee_id,periodo',
          ignoreDuplicates: false
        });

      if (voucherError) {
        console.error('Error upserting voucher records:', voucherError);
        throw voucherError;
      }

      return `Liquidación guardada exitosamente para ${liquidationData.employees.length} empleados con cálculos backend y novedades automáticas aplicadas.`;
    } catch (error) {
      console.error('Error saving payroll liquidation:', error);
      throw error;
    }
  }
};
