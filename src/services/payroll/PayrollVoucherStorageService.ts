import { supabase } from '@/integrations/supabase/client';
import { PayrollPDFService } from '../payroll-intelligent/PayrollPDFService';

export interface VoucherStorageResult {
  success: boolean;
  pdfUrl?: string;
  filePath?: string;
  fileSize?: number;
  error?: string;
}

export interface VoucherGenerationOptions {
  companyId: string;
  employeeId: string;
  voucherId: string;
  startDate: string;
  endDate: string;
  storeInStorage?: boolean;
}

export class PayrollVoucherStorageService {
  
  /**
   * Genera y almacena un comprobante de nómina en PDF
   */
  static async generateAndStorePDF(options: VoucherGenerationOptions): Promise<VoucherStorageResult> {
    try {
      console.log(`📄 Generando PDF para comprobante ${options.voucherId}`);
      
      // Verificar configuración de la empresa
      const companyConfig = await this.getCompanyStorageConfig(options.companyId);
      if (!companyConfig.auto_store_vouchers || !companyConfig.voucher_storage_enabled) {
        console.log('⚠️ Almacenamiento automático deshabilitado para esta empresa');
        return { success: false, error: 'Auto storage disabled' };
      }

      // Llamar al edge function para generar el PDF
      const pdfResult = await supabase.functions.invoke('generate-voucher-pdf', {
        body: {
          voucherId: options.voucherId,
          employeeId: options.employeeId,
          companyId: options.companyId,
          startDate: options.startDate,
          endDate: options.endDate,
          storeInStorage: options.storeInStorage ?? true
        }
      });

      if (pdfResult.error) {
        console.error('❌ Error generando PDF:', pdfResult.error);
        await this.incrementGenerationAttempts(options.voucherId);
        return { success: false, error: pdfResult.error.message };
      }

      const { pdfUrl, filePath, fileSize } = pdfResult.data;
      
      // Actualizar registro del comprobante
      await this.updateVoucherWithPDF(options.voucherId, pdfUrl, filePath, fileSize);
      
      console.log(`✅ PDF generado y almacenado: ${pdfUrl}`);
      return { 
        success: true, 
        pdfUrl, 
        filePath, 
        fileSize 
      };

    } catch (error) {
      console.error('❌ Error en generateAndStorePDF:', error);
      await this.incrementGenerationAttempts(options.voucherId);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtiene el PDF de un comprobante, generándolo si no existe
   */
  static async getVoucherPDF(voucherId: string): Promise<VoucherStorageResult> {
    try {
      // Buscar comprobante existente
      const { data: voucher, error } = await supabase
        .from('payroll_vouchers')
        .select(`
          *,
          employees!inner(company_id, nombre, apellido, cedula, salario_base)
        `)
        .eq('id', voucherId)
        .single();

      if (error || !voucher) {
        return { success: false, error: 'Voucher not found' };
      }

      // Si ya tiene PDF, retornarlo
      if (voucher.pdf_url && voucher.file_path) {
        // Verificar que el archivo existe en storage
        const fileExists = await this.verifyFileExists(voucher.file_path);
        if (fileExists) {
          return { 
            success: true, 
            pdfUrl: voucher.pdf_url,
            filePath: voucher.file_path,
            fileSize: voucher.file_size
          };
        }
      }

      // Generar PDF on-demand
      console.log(`🔄 Generando PDF on-demand para comprobante ${voucherId}`);
      return await this.generateAndStorePDF({
        companyId: voucher.employees.company_id,
        employeeId: voucher.employee_id,
        voucherId: voucher.id,
        startDate: voucher.start_date,
        endDate: voucher.end_date,
        storeInStorage: true
      });

    } catch (error) {
      console.error('❌ Error obteniendo PDF:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Actualiza el registro del comprobante con la información del PDF
   */
  private static async updateVoucherWithPDF(
    voucherId: string, 
    pdfUrl: string, 
    filePath: string, 
    fileSize: number
  ): Promise<void> {
    const { error } = await supabase
      .from('payroll_vouchers')
      .update({
        pdf_url: pdfUrl,
        file_path: filePath,
        file_size: fileSize,
        voucher_status: 'completado',
        auto_generated: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', voucherId);

    if (error) {
      console.error('❌ Error actualizando comprobante:', error);
      throw error;
    }
  }

  /**
   * Incrementa el contador de intentos de generación
   */
  private static async incrementGenerationAttempts(voucherId: string): Promise<void> {
    // Get current attempts count and increment
    const { data: voucher } = await supabase
      .from('payroll_vouchers')
      .select('generation_attempts')
      .eq('id', voucherId)
      .single();

    const currentAttempts = voucher?.generation_attempts || 0;
    
    await supabase
      .from('payroll_vouchers')
      .update({
        generation_attempts: currentAttempts + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', voucherId);
  }

  /**
   * Obtiene la configuración de almacenamiento de la empresa
   */
  private static async getCompanyStorageConfig(companyId: string) {
    const { data: company, error } = await supabase
      .from('companies')
      .select('auto_store_vouchers, voucher_storage_enabled, voucher_retention_years')
      .eq('id', companyId)
      .single();

    if (error || !company) {
      // Valores por defecto si no se encuentra la empresa
      return {
        auto_store_vouchers: true,
        voucher_storage_enabled: true,
        voucher_retention_years: 7
      };
    }

    return company;
  }

  /**
   * Verifica si un archivo existe en Supabase Storage
   */
  private static async verifyFileExists(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from('payroll-vouchers')
        .download(filePath);
      
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Elimina archivos antiguos según la política de retención
   */
  static async cleanupOldVouchers(companyId: string): Promise<{ deleted: number; errors: string[] }> {
    try {
      console.log(`🧹 Iniciando limpieza de comprobantes antiguos para empresa ${companyId}`);
      
      const config = await this.getCompanyStorageConfig(companyId);
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - config.voucher_retention_years);

      // Buscar comprobantes antiguos
      const { data: oldVouchers, error } = await supabase
        .from('payroll_vouchers')
        .select('id, file_path, pdf_url')
        .eq('company_id', companyId)
        .lt('created_at', cutoffDate.toISOString())
        .not('file_path', 'is', null);

      if (error) {
        throw error;
      }

      let deleted = 0;
      const errors: string[] = [];

      // Eliminar archivos de storage y actualizar registros
      for (const voucher of oldVouchers || []) {
        try {
          // Eliminar de storage
          if (voucher.file_path) {
            await supabase.storage
              .from('payroll-vouchers')
              .remove([voucher.file_path]);
          }

          // Actualizar registro
          await supabase
            .from('payroll_vouchers')
            .update({
              file_path: null,
              pdf_url: null,
              file_size: null
            })
            .eq('id', voucher.id);

          deleted++;
        } catch (error) {
          errors.push(`Failed to cleanup voucher ${voucher.id}: ${error.message}`);
        }
      }

      console.log(`✅ Limpieza completada: ${deleted} archivos eliminados`);
      return { deleted, errors };

    } catch (error) {
      console.error('❌ Error en limpieza:', error);
      return { deleted: 0, errors: [error.message] };
    }
  }

  /**
   * Obtiene estadísticas de almacenamiento para una empresa
   */
  static async getStorageStats(companyId: string) {
    try {
      // Manual calculation since RPC function may not be available yet
      const { data: vouchers, error } = await supabase
        .from('payroll_vouchers')
        .select('pdf_url, file_size, auto_generated')
        .eq('company_id', companyId);

      if (error) {
        throw error;
      }

      const stats = {
        total_vouchers: vouchers?.length || 0,
        vouchers_with_pdf: vouchers?.filter(v => v.pdf_url).length || 0,
        vouchers_without_pdf: vouchers?.filter(v => !v.pdf_url).length || 0,
        total_size_mb: (vouchers?.reduce((sum, v) => sum + (v.file_size || 0), 0) || 0) / 1024 / 1024,
        auto_generated: vouchers?.filter(v => v.auto_generated).length || 0,
        manual_generated: vouchers?.filter(v => !v.auto_generated).length || 0
      };

      return stats;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return null;
    }
  }

  /**
   * Genera la ruta de archivo para un comprobante
   */
  static generateFilePath(companyId: string, voucherId: string, employeeId: string, startDate: string): string {
    const year = new Date(startDate).getFullYear();
    const month = String(new Date(startDate).getMonth() + 1).padStart(2, '0');
    
    return `${companyId}/${year}/${month}/voucher_${voucherId}_${employeeId}.pdf`;
  }
}