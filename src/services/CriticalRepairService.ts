
import { supabase } from '@/integrations/supabase/client';

/**
 * 🚨 SERVICIO DE REPARACIÓN CRÍTICA - CTO LEVEL
 * Diagnóstica y repara problemas fundamentales en flujos de nómina
 */
export class CriticalRepairService {
  
  /**
   * Diagnóstico completo del sistema
   */
  static async diagnoseSystem(): Promise<{
    authentication: boolean;
    companyId: string | null;
    employeeCount: number;
    activeEmployeeCount: number;
    periodCount: number;
    activePeriodCount: number;
    issues: string[];
    recommendations: string[];
  }> {
    console.log('🔍 DIAGNÓSTICO CRÍTICO - Iniciando análisis completo...');
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // 1. Verificar autenticación
    const { data: { user } } = await supabase.auth.getUser();
    const authentication = !!user;
    
    if (!authentication) {
      issues.push('Usuario no autenticado');
      recommendations.push('Iniciar sesión en el sistema');
      return {
        authentication: false,
        companyId: null,
        employeeCount: 0,
        activeEmployeeCount: 0,
        periodCount: 0,
        activePeriodCount: 0,
        issues,
        recommendations
      };
    }
    
    // 2. Verificar empresa del usuario
    let companyId: string | null = null;
    try {
      const { data: companyData, error } = await supabase.rpc('get_current_user_company_id');
      if (error) throw error;
      companyId = companyData;
    } catch (error) {
      console.error('❌ Error obteniendo company_id:', error);
      issues.push('No se pudo obtener la empresa del usuario');
      recommendations.push('Verificar configuración del perfil de usuario');
    }
    
    if (!companyId) {
      issues.push('Usuario sin empresa asignada');
      recommendations.push('Asignar empresa al usuario');
    }
    
    // 3. Contar empleados
    let employeeCount = 0;
    let activeEmployeeCount = 0;
    
    if (companyId) {
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', companyId);
      
      if (!empError && employees) {
        employeeCount = employees.length;
        activeEmployeeCount = employees.filter(emp => emp.estado === 'activo').length;
      }
      
      if (employeeCount === 0) {
        issues.push('Sin empleados registrados');
        recommendations.push('Crear empleados de prueba');
      }
      
      if (activeEmployeeCount === 0) {
        issues.push('Sin empleados activos');
        recommendations.push('Activar empleados existentes o crear nuevos');
      }
    }
    
    // 4. Contar períodos
    let periodCount = 0;
    let activePeriodCount = 0;
    
    if (companyId) {
      const { data: periods, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId);
      
      if (!periodError && periods) {
        periodCount = periods.length;
        activePeriodCount = periods.filter(p => p.estado === 'borrador' || p.estado === 'active').length;
      }
      
      if (periodCount === 0) {
        issues.push('Sin períodos de nómina');
        recommendations.push('Crear período de nómina actual');
      }
      
      if (activePeriodCount === 0) {
        issues.push('Sin períodos activos');
        recommendations.push('Crear período activo para liquidación');
      }
    }
    
    console.log('📊 DIAGNÓSTICO COMPLETADO:', {
      authentication,
      companyId,
      employeeCount,
      activeEmployeeCount,
      periodCount,
      activePeriodCount,
      issues: issues.length,
      recommendations: recommendations.length
    });
    
    return {
      authentication,
      companyId,
      employeeCount,
      activeEmployeeCount,
      periodCount,
      activePeriodCount,
      issues,
      recommendations
    };
  }
  
  /**
   * Crear datos de prueba mínimos para hacer funcionar el sistema
   */
  static async createMinimumTestData(): Promise<{
    success: boolean;
    message: string;
    employeesCreated: number;
    periodsCreated: number;
    details: string[];
  }> {
    console.log('🔧 REPARACIÓN CRÍTICA - Creando datos de prueba...');
    
    const details: string[] = [];
    let employeesCreated = 0;
    let periodsCreated = 0;
    
    try {
      // Obtener company_id
      const { data: companyId, error: companyError } = await supabase.rpc('get_current_user_company_id');
      if (companyError || !companyId) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }
      
      details.push(`✅ Empresa identificada: ${companyId}`);
      
      // Verificar empleados existentes
      const { data: existingEmployees } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', companyId)
        .eq('estado', 'activo');
      
      const activeEmployees = existingEmployees?.length || 0;
      details.push(`📋 Empleados activos existentes: ${activeEmployees}`);
      
      // Crear empleados de prueba si no hay suficientes
      if (activeEmployees < 3) {
        const testEmployees = [
          {
            cedula: `TEST${Date.now()}1`,
            nombre: 'Juan Carlos',
            apellido: 'Pérez López',
            email: `juan.perez.${Date.now()}@test.com`,
            telefono: '3001234567',
            salario_base: 1500000,
            tipo_contrato: 'indefinido',
            fecha_ingreso: new Date().toISOString().split('T')[0],
            estado: 'activo',
            cargo: 'Desarrollador Senior',
            eps: 'SURA EPS',
            afp: 'Protección',
            arl: 'SURA ARL',
            caja_compensacion: 'Compensar',
            company_id: companyId
          },
          {
            cedula: `TEST${Date.now()}2`,
            nombre: 'María Elena',
            apellido: 'González Ruiz',
            email: `maria.gonzalez.${Date.now()}@test.com`,
            telefono: '3007654321',
            salario_base: 2000000,
            tipo_contrato: 'indefinido',
            fecha_ingreso: new Date().toISOString().split('T')[0],
            estado: 'activo',
            cargo: 'Gerente de Proyectos',
            eps: 'Nueva EPS',
            afp: 'Colfondos',
            arl: 'Positiva',
            caja_compensacion: 'Colsubsidio',
            company_id: companyId
          },
          {
            cedula: `TEST${Date.now()}3`,
            nombre: 'Carlos Alberto',
            apellido: 'Ramírez Silva',
            email: `carlos.ramirez.${Date.now()}@test.com`,
            telefono: '3009876543',
            salario_base: 1800000,
            tipo_contrato: 'indefinido',
            fecha_ingreso: new Date().toISOString().split('T')[0],
            estado: 'activo',
            cargo: 'Analista de Sistemas',
            eps: 'Sanitas',
            afp: 'Porvenir',
            arl: 'SURA ARL',
            caja_compensacion: 'Cafam',
            company_id: companyId
          }
        ];
        
        for (const employee of testEmployees) {
          const { error: empError } = await supabase
            .from('employees')
            .insert(employee);
          
          if (!empError) {
            employeesCreated++;
            details.push(`👤 Empleado creado: ${employee.nombre} ${employee.apellido}`);
          }
        }
      }
      
      // Verificar períodos existentes
      const { data: existingPeriods } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId);
      
      const totalPeriods = existingPeriods?.length || 0;
      details.push(`📅 Períodos existentes: ${totalPeriods}`);
      
      // Crear período actual si no existe
      const currentDate = new Date();
      const periodName = `${this.getMonthName(currentDate.getMonth())} ${currentDate.getFullYear()}`;
      
      const { data: currentPeriod } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('periodo', periodName)
        .single();
      
      if (!currentPeriod) {
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        
        const { error: periodError } = await supabase
          .from('payroll_periods_real')
          .insert({
            company_id: companyId,
            periodo: periodName,
            fecha_inicio: startDate.toISOString().split('T')[0],
            fecha_fin: endDate.toISOString().split('T')[0],
            tipo_periodo: 'mensual',
            estado: 'borrador'
          });
        
        if (!periodError) {
          periodsCreated++;
          details.push(`📅 Período creado: ${periodName}`);
        }
      }
      
      // Sincronizar datos de nómina si hay empleados y períodos
      if ((activeEmployees > 0 || employeesCreated > 0) && (totalPeriods > 0 || periodsCreated > 0)) {
        const { data: activePeriod } = await supabase
          .from('payroll_periods_real')
          .select('*')
          .eq('company_id', companyId)
          .eq('estado', 'borrador')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (activePeriod) {
          try {
            await supabase.rpc('sync_historical_payroll_data', {
              p_period_id: activePeriod.id,
              p_company_id: companyId
            });
            details.push(`🔄 Datos de nómina sincronizados para ${activePeriod.periodo}`);
          } catch (syncError) {
            console.warn('⚠️ Error en sincronización:', syncError);
            details.push(`⚠️ Advertencia: Error en sincronización de datos`);
          }
        }
      }
      
      return {
        success: true,
        message: `Datos de prueba creados exitosamente: ${employeesCreated} empleados, ${periodsCreated} períodos`,
        employeesCreated,
        periodsCreated,
        details
      };
      
    } catch (error) {
      console.error('❌ Error creando datos de prueba:', error);
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        employeesCreated,
        periodsCreated,
        details
      };
    }
  }
  
  /**
   * Limpiar servicios obsoletos y hooks duplicados
   */
  static async cleanObsoleteServices(): Promise<string[]> {
    const cleaned: string[] = [];
    
    // Esta es una función conceptual - en la práctica requeriría eliminar archivos
    // Por ahora solo reportamos qué se debería limpiar
    const obsoleteFiles = [
      'src/hooks/usePayrollLiquidation.ts',
      'src/hooks/usePayrollHistorySimple.ts',
      'src/services/PayrollUnifiedService.ts',
      'src/services/PayrollLiquidationService.ts'
    ];
    
    cleaned.push('📋 Archivos obsoletos identificados para limpieza manual:');
    obsoleteFiles.forEach(file => {
      cleaned.push(`  - ${file}`);
    });
    
    return cleaned;
  }
  
  /**
   * Validar que los flujos principales funcionen
   */
  static async validateCriticalFlows(): Promise<{
    liquidationFlow: boolean;
    historyFlow: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    console.log('🧪 VALIDACIÓN CRÍTICA - Probando flujos principales...');
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Validar flujo de liquidación
    let liquidationFlow = false;
    try {
      const { data: companyId } = await supabase.rpc('get_current_user_company_id');
      if (companyId) {
        // Intentar detectar período actual
        const { data: currentPeriod } = await supabase
          .from('payroll_periods_real')
          .select('*')
          .eq('company_id', companyId)
          .eq('estado', 'borrador')
          .limit(1)
          .single();
        
        if (currentPeriod) {
          // Intentar cargar empleados
          const { data: employees } = await supabase
            .from('employees')
            .select('*')
            .eq('company_id', companyId)
            .eq('estado', 'activo');
          
          if (employees && employees.length > 0) {
            liquidationFlow = true;
          } else {
            issues.push('Flujo de liquidación: Sin empleados activos');
            recommendations.push('Crear o activar empleados');
          }
        } else {
          issues.push('Flujo de liquidación: Sin período activo');
          recommendations.push('Crear período de nómina activo');
        }
      }
    } catch (error) {
      issues.push(`Flujo de liquidación: Error técnico - ${error}`);
    }
    
    // Validar flujo de historial
    let historyFlow = false;
    try {
      const { data: companyId } = await supabase.rpc('get_current_user_company_id');
      if (companyId) {
        const { data: periods } = await supabase
          .from('payroll_periods_real')
          .select('*')
          .eq('company_id', companyId);
        
        if (periods && periods.length > 0) {
          historyFlow = true;
        } else {
          issues.push('Flujo de historial: Sin períodos históricos');
          recommendations.push('Crear períodos de nómina');
        }
      }
    } catch (error) {
      issues.push(`Flujo de historial: Error técnico - ${error}`);
    }
    
    return {
      liquidationFlow,
      historyFlow,
      issues,
      recommendations
    };
  }
  
  private static getMonthName(monthIndex: number): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[monthIndex];
  }
}
