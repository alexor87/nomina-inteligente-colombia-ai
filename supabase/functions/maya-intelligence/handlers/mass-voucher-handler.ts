// ============================================================================
// MAYA Mass Voucher Handler - Professional Architecture
// ============================================================================

import { BaseHandler } from './base-handler.ts';
import { Intent, HandlerResponse, RichContext, ValidationResult } from '../core/types.ts';
import { ResponseBuilder } from '../core/response-builder.ts';

export class MassVoucherHandler extends BaseHandler {
  
  canHandle(intent: Intent): boolean {
    return intent.type === 'VOUCHER_MASS_SEND';
  }
  
  async handleIntent(intent: Intent, context?: RichContext): Promise<HandlerResponse> {
    const employeeCount = context?.employeeData?.totalCount || 
                          context?.employeeData?.allEmployees?.length || 0;
    
    if (employeeCount === 0) {
      return ResponseBuilder.buildErrorResponse(
        'No hay empleados disponibles para el envío masivo',
        'Verifica que haya empleados registrados en el sistema'
      );
    }
    
    // Extract period if specified
    const periodEntity = intent.entities.find(e => e.type === 'period');
    const periodName = periodEntity?.value;
    
    const action = ResponseBuilder.createMassVoucherAction(
      employeeCount,
      undefined, // periodId will be resolved by executor
      periodName
    );
    
    const message = this.buildMassVoucherMessage(employeeCount, periodName, context);
    
    return ResponseBuilder.buildExecutableResponse(
      message,
      [action],
      'encouraging'
    );
  }
  
  protected override async validatePrerequisites(intent: Intent, context?: RichContext): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check if we have employees
    const employeeCount = context?.employeeData?.totalCount || 
                          context?.employeeData?.allEmployees?.length || 0;
    
    if (employeeCount === 0) {
      errors.push('No hay empleados disponibles para envío masivo');
    }
    
    // Check for company context
    if (!context?.companyId) {
      warnings.push('Información de empresa limitada - el envío podría fallar');
    }
    
    // Warn if too many employees (performance concern)
    if (employeeCount > 100) {
      warnings.push(`Envío masivo a ${employeeCount} empleados - esto puede tomar varios minutos`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  protected override requestConfirmation(intent: Intent, context?: RichContext): HandlerResponse {
    const employeeCount = context?.employeeData?.totalCount || 
                          context?.employeeData?.allEmployees?.length || 0;
    
    const periodEntity = intent.entities.find(e => e.type === 'period');
    const periodName = periodEntity?.value || 'período actual';
    
    let message = `⚠️ **Confirmación requerida**\n\n`;
    message += `Estás a punto de enviar desprendibles a **${employeeCount} empleados** del ${periodName}.\n\n`;
    message += `Esta acción:\n`;
    message += `• Generará ${employeeCount} archivos PDF\n`;
    message += `• Enviará ${employeeCount} correos electrónicos\n`;
    message += `• Puede tomar varios minutos completarse\n\n`;
    message += `¿Estás seguro de continuar?`;
    
    return ResponseBuilder.buildClarificationResponse(
      message,
      ['✅ Sí, enviar desprendibles', '❌ No, cancelar']
    );
  }
  
  private buildMassVoucherMessage(employeeCount: number, periodName?: string, context?: RichContext): string {
    let message = `¡Perfecto! Voy a enviar desprendibles a **${employeeCount} empleados**`;
    
    if (periodName) {
      message += ` del ${periodName}`;
    }
    
    message += '.\n\n';
    
    // Add breakdown by department if available
    if (context?.employeeData?.byDepartment) {
      message += '📊 **Distribución por departamento:**\n';
      Object.entries(context.employeeData.byDepartment).forEach(([dept, info]) => {
        message += `• ${dept}: ${(info as any).count} empleados\n`;
      });
      message += '\n';
    }
    
    // Add time estimate
    const timeEstimate = this.estimateProcessingTime(employeeCount);
    message += `⏱️ **Tiempo estimado:** ${timeEstimate}\n\n`;
    
    message += 'Te notificaré cuando el proceso esté completo. ¿Procedemos?';
    
    return message;
  }
  
  private estimateProcessingTime(employeeCount: number): string {
    if (employeeCount <= 10) return 'Menos de 1 minuto';
    if (employeeCount <= 50) return '2-3 minutos';
    if (employeeCount <= 100) return '5-7 minutos';
    return 'Más de 10 minutos';
  }
}