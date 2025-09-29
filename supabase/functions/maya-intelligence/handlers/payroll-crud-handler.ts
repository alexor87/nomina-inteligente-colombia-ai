// ============================================================================
// MAYA Payroll CRUD Handler - Professional Architecture  
// ============================================================================

import { BaseHandler } from './base-handler.ts';
import { Intent, HandlerResponse, RichContext, ValidationResult, ExecutableAction } from '../core/types.ts';
import { ResponseBuilder } from '../core/response-builder.ts';

export class PayrollCrudHandler extends BaseHandler {
  
  canHandle(intent: Intent): boolean {
    return ['PAYROLL_LIQUIDATE', 'VACATION_REGISTER', 'ABSENCE_REGISTER'].includes(intent.type);
  }
  
  async handleIntent(intent: Intent, context?: RichContext): Promise<HandlerResponse> {
    switch (intent.type) {
      case 'PAYROLL_LIQUIDATE':
        return this.handlePayrollLiquidation(intent, context);
      case 'VACATION_REGISTER':
        return this.handleVacationRegistration(intent, context);
      case 'ABSENCE_REGISTER':
        return this.handleAbsenceRegistration(intent, context);
      default:
        return ResponseBuilder.buildErrorResponse('Tipo de operación de nómina no reconocida');
    }
  }
  
  private async handlePayrollLiquidation(intent: Intent, context?: RichContext): Promise<HandlerResponse> {
    // Extract period information
    const periodEntity = intent.entities.find(e => e.type === 'period');
    const periodName = periodEntity?.value;
    
    if (!periodName) {
      return ResponseBuilder.buildClarificationResponse(
        '¿Para qué período quieres liquidar la nómina? Por ejemplo: "enero 2024", "primera quincena marzo", etc.'
      );
    }
    
    // Create executable action for payroll liquidation
    const action: ExecutableAction = {
      id: `liquidate_payroll_${Date.now()}`,
      type: 'liquidate_payroll',
      label: `Liquidar nómina: ${periodName}`,
      description: `Procesar y liquidar la nómina del período especificado`,
      parameters: {
        periodName: periodName,
        companyId: context?.companyId,
        includeCalculations: true,
        generateVouchers: true
      },
      requiresConfirmation: true,
      icon: '💰'
    };
    
    return ResponseBuilder.buildExecutableResponse(
      `Perfecto! Voy a procesar la liquidación de nómina para **${periodName}**.\n\n**El proceso incluirá:**\n• Cálculo de salarios base\n• Aplicación de deducciones legales\n• Procesamiento de novedades\n• Generación de desprendibles\n\n⚠️ **Importante:** Esta operación procesará todos los empleados activos.`,
      [action],
      'analyzing'
    );
  }
  
  private async handleVacationRegistration(intent: Intent, context?: RichContext): Promise<HandlerResponse> {
    // Extract employee information
    const employeeEntity = intent.entities.find(e => e.type === 'employee');
    const employeeName = employeeEntity?.value;
    
    if (!employeeName) {
      return ResponseBuilder.buildClarificationResponse(
        '¿Para qué empleado quieres registrar las vacaciones? Especifica el nombre.'
      );
    }
    
    const employee = this.extractEmployeeFromContext(context, employeeName);
    
    if (!employee) {
      return ResponseBuilder.buildErrorResponse(
        `No encontré al empleado "${employeeName}"`,
        'Verifica el nombre y intenta de nuevo'
      );
    }
    
    // Extract vacation dates if provided
    const vacationInfo = this.extractVacationInfo(intent);
    
    // Create executable action for vacation registration
    const action: ExecutableAction = {
      id: `register_vacation_${employee.id}_${Date.now()}`,
      type: 'register_vacation',
      label: `Registrar vacaciones: ${employee.name}`,
      description: `Registrar período de vacaciones para el empleado`,
      parameters: {
        employeeId: employee.id,
        employeeName: employee.name,
        vacationInfo: vacationInfo
      },
      requiresConfirmation: true,
      icon: '🏖️'
    };
    
    let message = `Perfecto! Voy a registrar las vacaciones de **${employee.name}**.`;
    
    if (vacationInfo.startDate && vacationInfo.endDate) {
      message += `\n\n**Período de vacaciones:**\n• **Inicio:** ${vacationInfo.startDate}\n• **Fin:** ${vacationInfo.endDate}\n• **Días:** ${vacationInfo.days || 'A calcular'}`;
    } else {
      message += `\n\n**Nota:** Después de confirmar podrás especificar las fechas exactas del período de vacaciones.`;
    }
    
    return ResponseBuilder.buildExecutableResponse(
      message,
      [action],
      'encouraging'
    );
  }
  
  private async handleAbsenceRegistration(intent: Intent, context?: RichContext): Promise<HandlerResponse> {
    // Extract employee information
    const employeeEntity = intent.entities.find(e => e.type === 'employee');
    const employeeName = employeeEntity?.value;
    
    if (!employeeName) {
      return ResponseBuilder.buildClarificationResponse(
        '¿Para qué empleado quieres registrar la ausencia? Especifica el nombre.'
      );
    }
    
    const employee = this.extractEmployeeFromContext(context, employeeName);
    
    if (!employee) {
      return ResponseBuilder.buildErrorResponse(
        `No encontré al empleado "${employeeName}"`,
        'Verifica el nombre y intenta de nuevo'
      );
    }
    
    // Extract absence information
    const absenceInfo = this.extractAbsenceInfo(intent);
    
    // Create executable action for absence registration
    const action: ExecutableAction = {
      id: `register_absence_${employee.id}_${Date.now()}`,
      type: 'register_absence',
      label: `Registrar ausencia: ${employee.name}`,
      description: `Registrar ausencia o incapacidad del empleado`,
      parameters: {
        employeeId: employee.id,
        employeeName: employee.name,
        absenceInfo: absenceInfo
      },
      requiresConfirmation: true,
      icon: '🏥'
    };
    
    let message = `Voy a registrar la ausencia de **${employee.name}**.`;
    
    if (absenceInfo.type) {
      message += `\n\n**Tipo de ausencia:** ${absenceInfo.type}`;
    }
    
    if (absenceInfo.startDate) {
      message += `\n**Fecha:** ${absenceInfo.startDate}`;
      if (absenceInfo.endDate) {
        message += ` hasta ${absenceInfo.endDate}`;
      }
    }
    
    message += `\n\n**Nota:** La ausencia se registrará y afectará el cálculo de la siguiente nómina.`;
    
    return ResponseBuilder.buildExecutableResponse(
      message,
      [action],
      'neutral'
    );
  }
  
  private extractVacationInfo(intent: Intent): any {
    const vacationInfo: any = {
      type: 'vacaciones'
    };
    
    // Extract dates from entities
    const dateEntities = intent.entities.filter(e => e.type === 'date');
    if (dateEntities.length >= 1) {
      vacationInfo.startDate = dateEntities[0].value;
      if (dateEntities.length >= 2) {
        vacationInfo.endDate = dateEntities[1].value;
      }
    }
    
    // Extract number of days if mentioned
    const message = intent.parameters.originalMessage || '';
    const daysMatch = message.match(/(\d+)\s*días?/i);
    if (daysMatch) {
      vacationInfo.days = parseInt(daysMatch[1]);
    }
    
    return vacationInfo;
  }
  
  private extractAbsenceInfo(intent: Intent): any {
    const absenceInfo: any = {};
    const message = (intent.parameters.originalMessage || '').toLowerCase();
    
    // Determine type of absence
    if (message.includes('incapacidad') || message.includes('enfermo') || message.includes('médica')) {
      absenceInfo.type = 'incapacidad';
    } else if (message.includes('ausencia') || message.includes('falta') || message.includes('no vino')) {
      absenceInfo.type = 'ausencia';
    } else if (message.includes('permiso')) {
      absenceInfo.type = 'licencia_no_remunerada';
    } else {
      absenceInfo.type = 'ausencia'; // Default
    }
    
    // Extract dates from entities
    const dateEntities = intent.entities.filter(e => e.type === 'date');
    if (dateEntities.length >= 1) {
      absenceInfo.startDate = dateEntities[0].value;
      if (dateEntities.length >= 2) {
        absenceInfo.endDate = dateEntities[1].value;
      }
    }
    
    // Extract days if mentioned
    const daysMatch = message.match(/(\d+)\s*días?/i);
    if (daysMatch) {
      absenceInfo.days = parseInt(daysMatch[1]);
    }
    
    return absenceInfo;
  }
}