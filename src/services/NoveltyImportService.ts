import { supabase } from '@/integrations/supabase/client';
import { CreateNovedadData, NovedadType } from '@/types/novedades-enhanced';

export interface NoveltyImportData extends CreateNovedadData {
  _originalRowIndex?: number;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: Array<{
    row: number;
    error: string;
    data: any;
  }>;
}

export class NoveltyImportService {
  static async importNovelties(
    novelties: NoveltyImportData[],
    onProgress?: (progress: number, step: string) => void
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      imported: 0,
      failed: 0,
      errors: []
    };

    try {
      console.log('📊 Iniciando importación de novedades:', {
        totalNovelties: novelties.length,
        companyId: novelties[0]?.company_id,
        periodId: novelties[0]?.periodo_id
      });

      onProgress?.(0, 'Iniciando importación...');

      // Import in batches of 50 to avoid overwhelming the database
      const batchSize = 50;
      const totalBatches = Math.ceil(novelties.length / batchSize);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIndex = batchIndex * batchSize;
        const endIndex = Math.min(startIndex + batchSize, novelties.length);
        const batch = novelties.slice(startIndex, endIndex);

        onProgress?.(
          Math.round((batchIndex / totalBatches) * 90),
          `Procesando lote ${batchIndex + 1} de ${totalBatches}...`
        );

        console.log(`📦 Procesando lote ${batchIndex + 1}/${totalBatches}:`, {
          batchSize: batch.length,
          startIndex,
          endIndex
        });

        // Process each novelty in the batch
        for (const novelty of batch) {
          try {
            await this.importSingleNovelty(novelty);
            result.imported++;
          } catch (error) {
            console.error('❌ Error importando novedad:', error, novelty);
            result.failed++;
            result.errors.push({
              row: novelty._originalRowIndex || 0,
              error: error instanceof Error ? error.message : 'Error desconocido',
              data: novelty
            });
          }
        }

        // Small delay between batches to prevent rate limiting
        if (batchIndex < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      onProgress?.(100, 'Importación completada');

      // Determine overall success
      result.success = result.imported > 0 && result.failed < novelties.length * 0.5; // Success if at least 50% imported

      console.log('✅ Importación completada:', result);

      return result;

    } catch (error) {
      console.error('❌ Error fatal durante la importación:', error);
      
      return {
        success: false,
        imported: result.imported,
        failed: novelties.length - result.imported,
        errors: [
          ...result.errors,
          {
            row: 0,
            error: `Error fatal: ${error instanceof Error ? error.message : 'Error desconocido'}`,
            data: {}
          }
        ]
      };
    }
  }

  private static async importSingleNovelty(novelty: NoveltyImportData): Promise<void> {
    // Remove internal fields before insertion
    const { _originalRowIndex, ...noveltyData } = novelty;

    console.log('💾 Importando novedad individual:', {
      empleado_id: noveltyData.empleado_id,
      tipo_novedad: noveltyData.tipo_novedad,
      valor: noveltyData.valor
    });

    // Insert the novelty using the existing service pattern
    const { data, error } = await supabase
      .from('payroll_novedades')
      .insert({
        company_id: noveltyData.company_id,
        empleado_id: noveltyData.empleado_id,
        periodo_id: noveltyData.periodo_id,
        tipo_novedad: noveltyData.tipo_novedad,
        subtipo: noveltyData.subtipo,
        fecha_inicio: noveltyData.fecha_inicio,
        fecha_fin: noveltyData.fecha_fin,
        dias: noveltyData.dias,
        horas: noveltyData.horas,
        valor: noveltyData.valor,
        observacion: noveltyData.observacion,
        constitutivo_salario: noveltyData.constitutivo_salario,
        creado_por: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error en base de datos:', error);
      throw new Error(`Error en BD: ${error.message}`);
    }

    console.log('✅ Novedad importada exitosamente:', data?.id);
  }

  // Utility method to resolve employee ID from different identifiers
  static async resolveEmployeeId(
    identifier: string, 
    companyId: string
  ): Promise<string | null> {
    try {
      console.log('🔍 Resolviendo empleado:', { identifier, companyId });

      // Try to find by exact ID first
      let { data: employee, error } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', companyId)
        .eq('id', identifier)
        .single();

      if (!error && employee) {
        return employee.id;
      }

      // Try to find by cedula
      ({ data: employee, error } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', companyId)
        .eq('cedula', identifier)
        .single());

      if (!error && employee) {
        return employee.id;
      }

      // Try to find by email
      ({ data: employee, error } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', companyId)
        .ilike('email', identifier.toLowerCase())
        .single());

      if (!error && employee) {
        return employee.id;
      }

      console.warn('⚠️ No se encontró empleado con identificador:', identifier);
      return null;

    } catch (error) {
      console.error('❌ Error resolviendo empleado:', error);
      return null;
    }
  }

  // Validate novelty data before import
  static validateNoveltyData(novelty: Partial<NoveltyImportData>): string[] {
    const errors: string[] = [];

    if (!novelty.empleado_id) {
      errors.push('ID de empleado es requerido');
    }

    if (!novelty.company_id) {
      errors.push('ID de empresa es requerido');
    }

    if (!novelty.periodo_id) {
      errors.push('ID de período es requerido');
    }

    if (!novelty.tipo_novedad) {
      errors.push('Tipo de novedad es requerido');
    }

    if (novelty.valor === null || novelty.valor === undefined) {
      errors.push('Valor es requerido');
    } else if (typeof novelty.valor !== 'number' || isNaN(novelty.valor)) {
      errors.push('Valor debe ser un número válido');
    }

    return errors;
  }
}