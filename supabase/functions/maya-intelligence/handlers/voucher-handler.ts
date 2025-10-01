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
    // Extract period if specified
    const periodEntity = intent.entities.find(e => e.type === 'period');
    const explicitPeriod = periodEntity?.value;
    
    // 🎯 PRIORITY 1: Check for user-provided email in message
    const emailEntity = intent.entities.find(e => e.type === 'email');
    const userProvidedEmail = emailEntity?.value;
    
    // 🎯 PRIORITY 2: Check for registered email
    const registeredEmail = employee.email;
    
    // 🎯 Determine target email
    const targetEmail = userProvidedEmail || registeredEmail;
    
    // 🎯 CASE 1: We have an email (either provided or registered)
    if (targetEmail) {
      const isUserProvided = !!userProvidedEmail;
      const emailSource = isUserProvided 
        ? '\n\n_(Email especificado por ti en el mensaje)_' 
        : '';
      
      const message = `¿Enviar comprobante de **${employee.name}** al email **${targetEmail}**?${emailSource}`;
      
      const confirmAction = ResponseBuilder.createConfirmVoucherAction(
        employee.id,
        employee.name,
        targetEmail,
        explicitPeriod ? 'latest' : undefined,
        explicitPeriod || 'Período más reciente'
      );
      
      return ResponseBuilder.buildExecutableResponse(
        message,
        [confirmAction],
        'encouraging'
      );
    }
    
    // 🎯 CASE 2: NO email available - Ask in chat (no modal)
    return ResponseBuilder.buildClarificationResponse(
      `¿A qué email deseas enviar el comprobante de **${employee.name}**?`,
      [] // No options, just a question
    );
  }

  private requestPeriodConfirmation(employee: any, context?: RichContext): HandlerResponse {
    return this.createConversationalPeriodSelection(employee, context);
  }

  private createConversationalPeriodSelection(employee: any, context?: RichContext): HandlerResponse {
    // Generate conversational message
    const message = `Para el desprendible de **${employee.name}**, te sugiero:`;
    
    // Create suggested period action (most recent closed period)
    const suggestedPeriodAction = ResponseBuilder.createInlinePeriodAction(
      employee.id,
      employee.name,
      'latest', // Will be resolved to actual latest period ID
      'Período más reciente',
      true // isPrimary
    );
    
    // Create expansion action
    const expandAction = ResponseBuilder.createExpandPeriodsAction(
      employee.id,
      employee.name
    );
    
    return ResponseBuilder.buildExecutableResponse(
      message,
      [suggestedPeriodAction, expandAction],
      'encouraging'
    );
  }

  private findLatestPeriod(context?: RichContext): { id: string, name: string } | null {
    // For now, return null to trigger period selection request
    // This could be enhanced later when period data is available in context
    return null;
  }
}