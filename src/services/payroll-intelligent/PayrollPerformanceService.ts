
import { supabase } from '@/integrations/supabase/client';
import { PayrollAuditEnhancedService } from './PayrollAuditEnhancedService';

export class PayrollPerformanceService {
  private static readonly BATCH_SIZE = 100;
  private static readonly MAX_CONCURRENT_BATCHES = 5;

  // Procesamiento por lotes optimizado para miles de empleados
  static async processEmployeesInBatches<T, R>(
    employees: T[],
    processingFunction: (batch: T[]) => Promise<R[]>,
    onProgressUpdate?: (processed: number, total: number, batchResults: R[]) => void
  ): Promise<R[]> {
    const startTime = performance.now();
    const totalEmployees = employees.length;
    
    console.log(`🚀 Iniciando procesamiento por lotes: ${totalEmployees} empleados`);
    
    if (totalEmployees === 0) return [];

    // Dividir empleados en lotes
    const batches = this.chunkArray(employees, this.BATCH_SIZE);
    const results: R[] = [];
    let processedCount = 0;

    try {
      // Procesar lotes de forma concurrente pero controlada
      for (let i = 0; i < batches.length; i += this.MAX_CONCURRENT_BATCHES) {
        const currentBatches = batches.slice(i, i + this.MAX_CONCURRENT_BATCHES);
        
        const batchPromises = currentBatches.map(async (batch, batchIndex) => {
          const batchStartTime = performance.now();
          
          try {
            const batchResults = await processingFunction(batch);
            const batchDuration = performance.now() - batchStartTime;
            
            console.log(`✅ Lote ${i + batchIndex + 1}/${batches.length} completado: ${batch.length} empleados en ${Math.round(batchDuration)}ms`);
            
            return batchResults;
          } catch (error) {
            console.error(`❌ Error en lote ${i + batchIndex + 1}:`, error);
            throw error;
          }
        });

        // Esperar a que se completen los lotes actuales
        const batchResults = await Promise.all(batchPromises);
        
        // Consolidar resultados
        for (const batchResult of batchResults) {
          results.push(...batchResult);
          processedCount += batchResult.length;
          
          // Notificar progreso
          if (onProgressUpdate) {
            onProgressUpdate(processedCount, totalEmployees, batchResult);
          }
        }

        // Pequeña pausa entre grupos de lotes para no sobrecargar
        if (i + this.MAX_CONCURRENT_BATCHES < batches.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      const totalDuration = performance.now() - startTime;
      
      // Log de rendimiento
      await PayrollAuditEnhancedService.logEmployeeBatchProcessing(
        totalEmployees,
        totalDuration,
        [] // TODO: capturar errores específicos
      );

      console.log(`🎉 Procesamiento completo: ${totalEmployees} empleados en ${Math.round(totalDuration)}ms`);
      
      return results;

    } catch (error) {
      const totalDuration = performance.now() - startTime;
      
      await PayrollAuditEnhancedService.logEmployeeBatchProcessing(
        totalEmployees,
        totalDuration,
        [{ error: error instanceof Error ? error.message : 'Unknown error' }]
      );

      throw error;
    }
  }

  // Cargar empleados con paginación optimizada
  static async loadEmployeesOptimized(companyId: string): Promise<any[]> {
    return PayrollAuditEnhancedService.trackPerformance(
      'load_employees_optimized',
      'employee',
      async () => {
        // Cargar empleados activos con campos específicos para optimizar transferencia
        const { data: employees, error } = await supabase
          .from('employees')
          .select(`
            id,
            nombre,
            apellido,
            salario_base,
            eps,
            afp,
            cargo,
            tipo_contrato,
            fecha_ingreso
          `)
          .eq('company_id', companyId)
          .eq('estado', 'activo')
          .order('nombre', { ascending: true });

        if (error) throw error;
        return employees || [];
      },
      companyId
    );
  }

  // Cargar novedades de forma optimizada con join
  static async loadNovedadesOptimized(companyId: string, periodId: string): Promise<Record<string, any[]>> {
    return PayrollAuditEnhancedService.trackPerformance(
      'load_novedades_optimized',
      'system',
      async () => {
        const { data: novedades, error } = await supabase
          .from('payroll_novedades')
          .select('empleado_id, tipo_novedad, valor, dias, horas')
          .eq('company_id', companyId)
          .eq('periodo_id', periodId);

        if (error) throw error;

        // Agrupar por empleado para acceso rápido
        const novedadesByEmployee = (novedades || []).reduce((acc, novedad) => {
          if (!acc[novedad.empleado_id]) {
            acc[novedad.empleado_id] = [];
          }
          acc[novedad.empleado_id].push(novedad);
          return acc;
        }, {} as Record<string, any[]>);

        return novedadesByEmployee;
      },
      periodId
    );
  }

  // Utilidad para dividir arrays en chunks
  private static chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // Calcular métricas de rendimiento del sistema
  static async calculateSystemMetrics(companyId: string): Promise<Record<string, any>> {
    const metrics = {
      timestamp: new Date().toISOString(),
      company_id: companyId
    };

    try {
      // Métricas de empleados
      const { count: employeeCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('estado', 'activo');

      // Métricas de períodos recientes
      const { count: recentPeriods } = await supabase
        .from('payroll_periods')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // Métricas de novedades
      const { count: recentNovedades } = await supabase
        .from('payroll_novedades')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      Object.assign(metrics, {
        active_employees: employeeCount || 0,
        recent_periods: recentPeriods || 0,
        recent_novedades: recentNovedades || 0,
        estimated_processing_time_ms: (employeeCount || 0) * 50, // 50ms por empleado estimado
        recommended_batch_size: Math.min(this.BATCH_SIZE, Math.max(10, Math.floor((employeeCount || 100) / 10)))
      });

      await PayrollAuditEnhancedService.logSystemOptimization('metrics_calculation', metrics);

    } catch (error) {
      console.error('❌ Error calculando métricas del sistema:', error);
      Object.assign(metrics, { error: 'Failed to calculate metrics' });
    }

    return metrics;
  }
}
