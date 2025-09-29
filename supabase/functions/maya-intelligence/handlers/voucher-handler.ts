// ============================================================================
// MAYA Voucher Handler - Professional Architecture
// ============================================================================

import { BaseHandler } from './base-handler.ts';
import { Intent, HandlerResponse, RichContext, ValidationResult } from '../core/types.ts';
import { ResponseBuilder } from '../core/response-builder.ts';
import { ContextManager } from '../core/context-manager.ts';

export class VoucherHandler extends BaseHandler {
  
  canHandle(intent: Intent): boolean {
    return intent.type === 'VOUCHER_SEND';
  }
  
  async handleIntent(intent: Intent, context?: RichContext): Promise<HandlerResponse> {
    // Extract employee from entities or parameters
    const employeeEntity = intent.entities.find(e => e.type === 'employee');
    const employeeName = employeeEntity?.value || intent.parameters.employeeName;
    
    if (!employeeName) {
      return this.requestEmployeeName(context);
    }
    
    // Try to find employee in context
    const employee = this.extractEmployeeFromContext(context, employeeName);
    
    if (!employee) {
      // Use AI to enhance employee matching
      const enhancedEmployee = await this.findEmployeeWithAI(employeeName, context);
      
      if (!enhancedEmployee) {
        return this.handleEmployeeNotFound(employeeName, context);
      }
      
      return this.createVoucherAction(enhancedEmployee, intent, context);
    }
    
    return this.createVoucherAction(employee, intent, context);
  }
  
  protected override async validatePrerequisites(intent: Intent, context?: RichContext): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check if we have employee data available
    if (!context?.employeeData?.allEmployees?.length) {
      errors.push('No hay información de empleados disponible');
    }
    
    // Check if company context is available
    if (!context?.companyId) {
      warnings.push('Información de empresa limitada');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  private requestEmployeeName(context?: RichContext): HandlerResponse {
    const availableEmployees = ContextManager.getAvailableEmployeeNames(context);
    
    if (availableEmployees.length === 0) {
      return ResponseBuilder.buildErrorResponse(
        'No hay empleados disponibles para enviar desprendibles',
        'Verifica que haya empleados registrados en el sistema'
      );
    }
    
    let message = 'Por favor especifica el nombre del empleado para enviar el desprendible.';
    
    if (availableEmployees.length <= 5) {
      message += '\n\n**Empleados disponibles:**';
      availableEmployees.forEach((name, index) => {
        message += `\n${index + 1}. ${name}`;
      });
    } else {
      message += `\n\nTienes ${availableEmployees.length} empleados disponibles. Puedes mencionar el nombre específico.`;
    }
    
    return ResponseBuilder.buildClarificationResponse(message);
  }
  
  private async findEmployeeWithAI(employeeName: string, context?: RichContext): Promise<any> {
    if (!this.openaiKey || !context?.employeeData?.allEmployees) {
      return null;
    }
    
    const employeeList = context.employeeData.allEmployees
      .map(emp => `${emp.name} (${emp.position})`)
      .join('\n');
    
    const prompt = `Busca en esta lista de empleados el que mejor coincida con "${employeeName}":

${employeeList}

Responde SOLO con el nombre EXACTO del empleado que coincida, o "NINGUNO" si no encuentras coincidencia.`;
    
    const aiResult = await this.callWithAI(prompt);
    
    if (aiResult && aiResult !== 'NINGUNO') {
      return context.employeeData.allEmployees.find(emp => 
        emp.name === aiResult || emp.name.includes(aiResult)
      );
    }
    
    return null;
  }
  
  private handleEmployeeNotFound(employeeName: string, context?: RichContext): HandlerResponse {
    const availableEmployees = ContextManager.getAvailableEmployeeNames(context);
    
    if (availableEmployees.length === 0) {
      return ResponseBuilder.buildErrorResponse(
        `No pude encontrar al empleado "${employeeName}"`,
        'Verifica que el empleado esté registrado en el sistema'
      );
    }
    
    // Find similar names for suggestions
    const similarNames = availableEmployees
      .filter(name => 
        name.toLowerCase().includes(employeeName.toLowerCase()) ||
        employeeName.toLowerCase().includes(name.toLowerCase())
      )
      .slice(0, 3);
    
    if (similarNames.length > 0) {
      return ResponseBuilder.buildClarificationResponse(
        `No encontré exactamente "${employeeName}". ¿Te refieres a alguno de estos empleados?`,
        similarNames
      );
    }
    
    return ResponseBuilder.buildErrorResponse(
      `No pude encontrar al empleado "${employeeName}"`,
      'Verifica el nombre y intenta de nuevo'
    );
  }
  
  private createVoucherAction(employee: any, intent: Intent, context?: RichContext): HandlerResponse {
    // Extract period if specified in user message
    const periodEntity = intent.entities.find(e => e.type === 'period');
    const explicitPeriod = periodEntity?.value;
    
    if (explicitPeriod) {
      // User specified a period, create direct voucher action
      const action = ResponseBuilder.createVoucherAction(
        employee.id,
        employee.name,
        undefined, // periodId will be resolved by executor
        explicitPeriod
      );
      
      return ResponseBuilder.buildExecutableResponse(
        `Perfecto! Voy a generar el desprendible de ${employee.name} para ${explicitPeriod}.`,
        [action],
        'encouraging'
      );
    }
    
    // No period specified, request period confirmation
    return this.requestPeriodConfirmation(employee, context);
  }

  private requestPeriodConfirmation(employee: any, context?: RichContext): HandlerResponse {
    // Generate a default current period based on the current date
    const now = new Date();
    const currentMonth = now.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    const currentPeriod = currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1);
    
    const message = `Para generar el desprendible de **${employee.name}**, selecciona el período:`;
    
    // Create executable actions for period selection
    const currentPeriodAction = ResponseBuilder.createPeriodConfirmationAction(
      employee.id,
      employee.name,
      `current_${now.getFullYear()}_${now.getMonth() + 1}`, // Generate a period ID
      currentPeriod
    );
    
    const alternativesAction = ResponseBuilder.createPeriodAlternativesAction(
      employee.id,
      employee.name
    );
    
    return ResponseBuilder.buildExecutableResponse(
      message,
      [currentPeriodAction, alternativesAction],
      'encouraging'
    );
  }

  private findLatestPeriod(context?: RichContext): { id: string, name: string } | null {
    // For now, return null to trigger period selection request
    // This could be enhanced later when period data is available in context
    return null;
  }
}