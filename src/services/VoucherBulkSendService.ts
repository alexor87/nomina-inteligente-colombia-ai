import { supabase } from '@/integrations/supabase/client';

interface BulkSendResult {
  success: boolean;
  successCount: number;
  errorCount: number;
  totalCount: number;
  errors: Array<{
    employeeId: string;
    employeeName: string;
    error: string;
  }>;
}

export class VoucherBulkSendService {
  static async sendVouchersForPeriod(
    periodId: string,
    companyId: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<BulkSendResult> {
    const errors: Array<{ employeeId: string; employeeName: string; error: string }> = [];
    let successCount = 0;

    try {
      // 1. Obtener todos los empleados liquidados en ese período
      const { data: payrolls, error: payrollsError } = await supabase
        .from('payrolls')
        .select(`
          id,
          employee_id,
          period_id,
          neto_pagado,
          salario_base,
          auxilio_transporte,
          horas_extra,
          bonificaciones,
          incapacidades,
          total_deducciones,
          employees:employee_id (
            id,
            nombre,
            apellido,
            email,
            cedula
          )
        `)
        .eq('period_id', periodId)
        .eq('company_id', companyId);

      if (payrollsError) {
        throw new Error(`Error obteniendo nóminas: ${payrollsError.message}`);
      }

      if (!payrolls || payrolls.length === 0) {
        return {
          success: true,
          successCount: 0,
          errorCount: 0,
          totalCount: 0,
          errors: []
        };
      }

      const totalCount = payrolls.length;

      // 2. Obtener datos del período
      const { data: period, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('fecha_inicio, fecha_fin, tipo_periodo, periodo')
        .eq('id', periodId)
        .single();

      if (periodError) {
        throw new Error(`Error obteniendo período: ${periodError.message}`);
      }

      // 3. Obtener datos de la empresa
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('razon_social, nit, logo_url')
        .eq('id', companyId)
        .single();

      if (companyError) {
        throw new Error(`Error obteniendo empresa: ${companyError.message}`);
      }

      // 4. Procesar cada empleado
      for (let i = 0; i < payrolls.length; i++) {
        const payroll = payrolls[i];
        const employee = payroll.employees as any;

        // Reportar progreso
        if (onProgress) {
          onProgress(i + 1, totalCount);
        }

        // Validar email
        if (!employee?.email) {
          errors.push({
            employeeId: employee?.id || payroll.employee_id,
            employeeName: `${employee?.nombre || ''} ${employee?.apellido || ''}`.trim() || 'Sin nombre',
            error: 'Sin email registrado'
          });
          continue;
        }

        try {
          // Generar PDF
          const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-voucher-pdf', {
            body: {
              employee: {
                nombre: employee.nombre,
                apellido: employee.apellido,
                documento: employee.cedula,
                email: employee.email
              },
              period: {
                fecha_inicio: period.fecha_inicio,
                fecha_fin: period.fecha_fin,
                tipo: period.tipo_periodo
              },
              companyInfo: {
                nombre: company.razon_social,
                nit: company.nit,
                logo_url: company.logo_url
              },
              earnings: {
                salario_base: payroll.salario_base || 0,
                auxilio_transporte: payroll.auxilio_transporte || 0,
                horas_extra: payroll.horas_extra || 0,
                bonificaciones: payroll.bonificaciones || 0,
                incapacidades: payroll.incapacidades || 0
              },
              deductions: {
                total: payroll.total_deducciones || 0
              },
              netPay: payroll.neto_pagado || 0,
              isDemo: false
            }
          });

          if (pdfError) {
            throw new Error(`Error generando PDF: ${pdfError.message}`);
          }

          // Enviar email
          const { error: emailError } = await supabase.functions.invoke('send-voucher-email', {
            body: {
              emails: [employee.email],
              pdfBase64: pdfData.pdf,
              employee: {
                nombre: employee.nombre,
                apellido: employee.apellido,
                documento: employee.cedula
              },
              period: {
                fecha_inicio: period.fecha_inicio,
                fecha_fin: period.fecha_fin,
                tipo: period.tipo_periodo
              },
              companyInfo: {
                nombre: company.razon_social
              }
            }
          });

          if (emailError) {
            throw new Error(`Error enviando email: ${emailError.message}`);
          }

          // Actualizar estado del voucher
          await supabase
            .from('payroll_vouchers')
            .update({
              voucher_status: 'enviado',
              sent_to_employee: true,
              sent_date: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('payroll_id', payroll.id);

          successCount++;

        } catch (error) {
          errors.push({
            employeeId: employee.id,
            employeeName: `${employee.nombre} ${employee.apellido}`,
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
        }
      }

      return {
        success: true,
        successCount,
        errorCount: errors.length,
        totalCount,
        errors
      };

    } catch (error) {
      console.error('Error en envío masivo de comprobantes:', error);
      throw error;
    }
  }
}
