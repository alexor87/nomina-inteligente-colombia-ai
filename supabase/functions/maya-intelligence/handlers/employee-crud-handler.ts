// ============================================================================
// MAYA Employee CRUD Handler - Professional Architecture  
// ============================================================================

import { BaseHandler } from './base-handler.ts';
import { Intent, HandlerResponse, RichContext, ValidationResult, ExecutableAction } from '../core/types.ts';
import { ResponseBuilder } from '../core/response-builder.ts';
import { ContextManager } from '../core/context-manager.ts';

export class EmployeeCrudHandler extends BaseHandler {
  
  canHandle(intent: Intent): boolean {
    return ['EMPLOYEE_CREATE', 'EMPLOYEE_UPDATE', 'EMPLOYEE_DELETE'].includes(intent.type);
  }
  
  async handleIntent(intent: Intent, context?: RichContext): Promise<HandlerResponse> {
    switch (intent.type) {
      case 'EMPLOYEE_CREATE':
        return this.handleCreate(intent, context);
      case 'EMPLOYEE_UPDATE':
        return this.handleUpdate(intent, context);
      case 'EMPLOYEE_DELETE':
        return this.handleDelete(intent, context);
      default:
        return ResponseBuilder.buildErrorResponse('Tipo de operación CRUD no reconocida');
    }
  }
  
  private async handleCreate(intent: Intent, context?: RichContext): Promise<HandlerResponse> {
    // Extract employee information from entities
    const employeeNameEntity = intent.entities.find(e => e.type === 'employee');
    const employeeName = employeeNameEntity?.value;
    
    if (!employeeName) {
      return ResponseBuilder.buildClarificationResponse(
        'Para crear un empleado necesito al menos el nombre completo. ¿Cuál es el nombre del nuevo empleado?'
      );
    }
    
    // Extract basic information from the user message if available
    const basicInfo = this.extractBasicEmployeeInfo(intent, employeeName);
    
    // Create executable action for employee creation
    const action: ExecutableAction = {
      id: `create_employee_${Date.now()}`,
      type: 'create_employee',
      label: `Crear empleado: ${employeeName}`,
      description: `Crear nuevo empleado con la información proporcionada`,
      parameters: {
        employeeName: employeeName,
        basicInfo: basicInfo,
        companyId: context?.companyId
      },
      requiresConfirmation: true,
      icon: '👤'
    };
    
    return ResponseBuilder.buildExecutableResponse(
      `Perfecto! Voy a crear el empleado "${employeeName}" con la información que proporcionaste.\n\n**Datos a registrar:**\n${this.formatEmployeeInfo(basicInfo)}\n\n⚠️ **Importante:** Después de crear el empleado podrás completar información adicional como salario, datos bancarios, EPS, etc.`,
      [action],
      'encouraging'
    );
  }
  
  private async handleUpdate(intent: Intent, context?: RichContext): Promise<HandlerResponse> {
    const employeeNameEntity = intent.entities.find(e => e.type === 'employee');
    const employeeName = employeeNameEntity?.value;
    
    if (!employeeName) {
      return ResponseBuilder.buildClarificationResponse(
        '¿Cuál empleado necesitas actualizar? Especifica el nombre.'
      );
    }
    
    const employee = this.extractEmployeeFromContext(context, employeeName);
    
    if (!employee) {
      return ResponseBuilder.buildErrorResponse(
        `No encontré al empleado "${employeeName}"`,
        'Verifica el nombre y intenta de nuevo'
      );
    }
    
    // Extract what fields to update from the user message
    const updateInfo = this.extractUpdateInfo(intent);
    
    if (Object.keys(updateInfo).length === 0) {
      return ResponseBuilder.buildClarificationResponse(
        `¿Qué información específica de ${employee.name} necesitas actualizar? Por ejemplo: salario, cargo, teléfono, email, etc.`
      );
    }
    
    // Create executable action for employee update
    const action: ExecutableAction = {
      id: `update_employee_${employee.id}_${Date.now()}`,
      type: 'update_employee',
      label: `Actualizar empleado: ${employee.name}`,
      description: `Actualizar información del empleado`,
      parameters: {
        employeeId: employee.id,
        employeeName: employee.name,
        updateInfo: updateInfo
      },
      requiresConfirmation: true,
      icon: '✏️'
    };
    
    return ResponseBuilder.buildExecutableResponse(
      `Perfecto! Voy a actualizar la información de **${employee.name}**.\n\n**Cambios a realizar:**\n${this.formatUpdateInfo(updateInfo)}`,
      [action],
      'encouraging'
    );
  }
  
  private async handleDelete(intent: Intent, context?: RichContext): Promise<HandlerResponse> {
    const employeeNameEntity = intent.entities.find(e => e.type === 'employee');
    const employeeName = employeeNameEntity?.value;
    
    if (!employeeName) {
      return ResponseBuilder.buildClarificationResponse(
        '¿Qué empleado necesitas dar de baja? Especifica el nombre.'
      );
    }
    
    const employee = this.extractEmployeeFromContext(context, employeeName);
    
    if (!employee) {
      return ResponseBuilder.buildErrorResponse(
        `No encontré al empleado "${employeeName}"`,
        'Verifica el nombre y intenta de nuevo'
      );
    }
    
    // Create executable action for employee deletion
    const action: ExecutableAction = {
      id: `delete_employee_${employee.id}_${Date.now()}`,
      type: 'delete_employee',
      label: `Dar de baja: ${employee.name}`,
      description: `Dar de baja al empleado del sistema`,
      parameters: {
        employeeId: employee.id,
        employeeName: employee.name,
        employeePosition: employee.position || 'N/A'
      },
      requiresConfirmation: true,
      icon: '⚠️'
    };
    
    return ResponseBuilder.buildExecutableResponse(
      `⚠️ **Operación crítica**\n\nEstás a punto de dar de baja a **${employee.name}** (${employee.position || 'Sin cargo'}).\n\n**Esta acción:**\n• Cambiará el estado del empleado a "inactivo"\n• Mantendrá todos los registros históricos\n• Requerirá procesos adicionales según la normativa laboral`,
      [action],
      'concerned'
    );
  }
  
  private extractBasicEmployeeInfo(intent: Intent, employeeName: string): any {
    // Extract basic information from user message patterns
    const basicInfo: any = {
      nombre: employeeName.split(' ')[0] || employeeName,
      apellido: employeeName.split(' ').slice(1).join(' ') || ''
    };
    
    // Look for additional information in entities or parameters
    const entities = intent.entities;
    
    // Extract salary if mentioned
    const salaryMatch = intent.parameters.originalMessage?.match(/\$?([\d,.]+)/);
    if (salaryMatch) {
      const salary = salaryMatch[1].replace(/[,.]/g, '');
      if (parseInt(salary) > 100000) { // Reasonable salary threshold
        basicInfo.salario_base = parseInt(salary);
      }
    }
    
    // Extract position if mentioned
    const positionKeywords = ['cargo', 'posición', 'como', 'de'];
    const message = intent.parameters.originalMessage?.toLowerCase() || '';
    for (const keyword of positionKeywords) {
      const keywordIndex = message.indexOf(keyword);
      if (keywordIndex !== -1) {
        const afterKeyword = message.substring(keywordIndex + keyword.length).trim();
        const words = afterKeyword.split(' ').slice(0, 3); // Take up to 3 words
        if (words.length > 0 && words[0].length > 2) {
          basicInfo.cargo = words.join(' ');
          break;
        }
      }
    }
    
    return basicInfo;
  }
  
  private extractUpdateInfo(intent: Intent): any {
    const updateInfo: any = {};
    const message = intent.parameters.originalMessage?.toLowerCase() || '';
    
    // Extract salary updates
    const salaryMatch = message.match(/salario|sueldo.*\$?([\d,.]+)/);
    if (salaryMatch) {
      const salary = salaryMatch[1].replace(/[,.]/g, '');
      updateInfo.salario_base = parseInt(salary);
    }
    
    // Extract email updates
    const emailMatch = message.match(/email|correo.*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      updateInfo.email = emailMatch[1];
    }
    
    // Extract phone updates
    const phoneMatch = message.match(/teléfono|telefono|celular.*(\d{10,})/);
    if (phoneMatch) {
      updateInfo.telefono = phoneMatch[1];
    }
    
    // Extract position updates
    if (message.includes('cargo') || message.includes('posición')) {
      const positionMatch = message.match(/cargo|posición.*?([a-zA-Z\s]{3,20})/);
      if (positionMatch) {
        updateInfo.cargo = positionMatch[1].trim();
      }
    }
    
    return updateInfo;
  }
  
  private formatEmployeeInfo(basicInfo: any): string {
    const lines = [];
    if (basicInfo.nombre) lines.push(`• **Nombre:** ${basicInfo.nombre}`);
    if (basicInfo.apellido) lines.push(`• **Apellido:** ${basicInfo.apellido}`);
    if (basicInfo.cargo) lines.push(`• **Cargo:** ${basicInfo.cargo}`);
    if (basicInfo.salario_base) lines.push(`• **Salario:** $${basicInfo.salario_base.toLocaleString()}`);
    
    return lines.length > 0 ? lines.join('\n') : '• **Información básica:** Solo nombre';
  }
  
  private formatUpdateInfo(updateInfo: any): string {
    const lines = [];
    if (updateInfo.salario_base) lines.push(`• **Nuevo salario:** $${updateInfo.salario_base.toLocaleString()}`);
    if (updateInfo.email) lines.push(`• **Nuevo email:** ${updateInfo.email}`);
    if (updateInfo.telefono) lines.push(`• **Nuevo teléfono:** ${updateInfo.telefono}`);
    if (updateInfo.cargo) lines.push(`• **Nuevo cargo:** ${updateInfo.cargo}`);
    
    return lines.length > 0 ? lines.join('\n') : '• **Sin cambios específicos detectados**';
  }
}