// ============================================================================
// MAYA Employee Handler - Professional Architecture  
// ============================================================================

import { BaseHandler } from './base-handler.ts';
import { Intent, HandlerResponse, RichContext, ValidationResult } from '../core/types.ts';
import { ResponseBuilder } from '../core/response-builder.ts';
import { ContextManager } from '../core/context-manager.ts';

export class EmployeeHandler extends BaseHandler {
  
  canHandle(intent: Intent): boolean {
    return ['EMPLOYEE_SEARCH', 'EMPLOYEE_CREATE', 'EMPLOYEE_UPDATE', 'EMPLOYEE_DELETE'].includes(intent.type);
  }
  
  async handleIntent(intent: Intent, context?: RichContext): Promise<HandlerResponse> {
    switch (intent.type) {
      case 'EMPLOYEE_SEARCH':
        return this.handleSearch(intent, context);
      case 'EMPLOYEE_CREATE':
        return this.handleCreate(intent, context);
      case 'EMPLOYEE_UPDATE':
        return this.handleUpdate(intent, context);
      case 'EMPLOYEE_DELETE':
        return this.handleDelete(intent, context);
      default:
        return ResponseBuilder.buildErrorResponse('Tipo de operación no reconocida');
    }
  }
  
  private async handleSearch(intent: Intent, context?: RichContext): Promise<HandlerResponse> {
    const searchEntity = intent.entities.find(e => e.type === 'employee');
    const query = searchEntity?.value || intent.parameters.query;
    
    if (!query) {
      return ResponseBuilder.buildClarificationResponse(
        '¿Qué empleado estás buscando? Puedes buscar por nombre, cargo, o departamento.'
      );
    }
    
    if (!context?.employeeData?.allEmployees?.length) {
      return ResponseBuilder.buildErrorResponse(
        'No hay información de empleados disponible',
        'Verifica que haya empleados registrados en el sistema'
      );
    }
    
    const results = this.searchEmployees(query, context.employeeData.allEmployees);
    
    if (results.length === 0) {
      return this.handleNoSearchResults(query, context);
    }
    
    if (results.length === 1) {
      return this.displaySingleEmployee(results[0]);
    }
    
    return this.displayMultipleEmployees(results, query);
  }
  
  private async handleCreate(intent: Intent, context?: RichContext): Promise<HandlerResponse> {
    // Extract basic employee information from entities
    const employeeName = intent.entities.find(e => e.type === 'employee')?.value;
    
    if (!employeeName) {
      return ResponseBuilder.buildClarificationResponse(
        'Para crear un empleado necesito al menos el nombre completo. ¿Cuál es el nombre del nuevo empleado?'
      );
    }
    
    // For now, return guidance to use the UI - future versions could integrate with EmployeeCRUDService
    return ResponseBuilder.buildConversationalResponse(
      `Para crear el empleado "${employeeName}", te recomiendo usar el formulario de registro de empleados en la sección de Empleados. \n\nEsto asegura que todos los campos obligatorios se completen correctamente según la normativa laboral colombiana.\n\n¿Te gustaría que te explique qué información necesitas preparar?`,
      'encouraging'
    );
  }
  
  private async handleUpdate(intent: Intent, context?: RichContext): Promise<HandlerResponse> {
    const employeeName = intent.entities.find(e => e.type === 'employee')?.value;
    
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
    
    // For now, guide to UI - future versions could integrate with update services
    return ResponseBuilder.buildConversationalResponse(
      `Para actualizar la información de ${employee.name}, puedes acceder a su perfil en la sección de Empleados y hacer los cambios necesarios.\n\n¿Qué información específica necesitas actualizar?`,
      'encouraging'
    );
  }
  
  private async handleDelete(intent: Intent, context?: RichContext): Promise<HandlerResponse> {
    const employeeName = intent.entities.find(e => e.type === 'employee')?.value;
    
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
    
    // This is a critical operation that should require explicit UI interaction
    return ResponseBuilder.buildConversationalResponse(
      `⚠️ La baja de empleados es una operación crítica que debe realizarse cuidadosamente desde la sección de Empleados.\n\nEsto asegura el cumplimiento de todos los procedimientos legales y la generación de documentos requeridos.\n\n¿Necesitas orientación sobre el proceso de retiro de empleados?`,
      'concerned'
    );
  }
  
  private searchEmployees(query: string, employees: any[]): any[] {
    const queryLower = query.toLowerCase();
    
    return employees.filter(emp => 
      emp.name.toLowerCase().includes(queryLower) ||
      emp.position?.toLowerCase().includes(queryLower) ||
      emp.department?.toLowerCase().includes(queryLower) ||
      emp.id?.toLowerCase().includes(queryLower)
    );
  }
  
  private handleNoSearchResults(query: string, context?: RichContext): HandlerResponse {
    const suggestion = this.getSuggestionsForQuery(query, context);
    
    return ResponseBuilder.buildErrorResponse(
      `No encontré empleados que coincidan con "${query}"`,
      suggestion
    );
  }
  
  private getSuggestionsForQuery(query: string, context?: RichContext): string {
    const availableEmployees = ContextManager.getAvailableEmployeeNames(context);
    
    if (availableEmployees.length === 0) {
      return 'No hay empleados registrados en el sistema';
    }
    
    // Find similar names
    const similar = availableEmployees.filter(name => 
      name.toLowerCase().includes(query.toLowerCase()) ||
      query.toLowerCase().includes(name.toLowerCase())
    );
    
    if (similar.length > 0) {
      return `¿Te referías a: ${similar.slice(0, 3).join(', ')}?`;
    }
    
    return 'Intenta con el nombre completo o apellido del empleado';
  }
  
  private displaySingleEmployee(employee: any): HandlerResponse {
    const message = `👤 **${employee.name}**\n\n` +
      `• **Cargo:** ${employee.position || 'No especificado'}\n` +
      `• **Departamento:** ${employee.department || 'No especificado'}\n` +
      `• **Salario:** $${employee.salary?.toLocaleString() || 'No disponible'}\n` +
      `• **Fecha de ingreso:** ${employee.hireDate || 'No disponible'}\n` +
      `• **Años de servicio:** ${employee.yearsOfService || 'N/A'} años\n\n` +
      `¿Necesitas información adicional sobre ${employee.name}?`;
    
    return ResponseBuilder.buildConversationalResponse(message, 'neutral');
  }
  
  private displayMultipleEmployees(employees: any[], query: string): HandlerResponse {
    let message = `🔍 **Encontré ${employees.length} empleados con "${query}":**\n\n`;
    
    employees.slice(0, 10).forEach((emp, index) => {
      message += `${index + 1}. **${emp.name}** - ${emp.position} (${emp.department})\n`;
    });
    
    if (employees.length > 10) {
      message += `\n... y ${employees.length - 10} empleados más`;
    }
    
    message += `\n\n¿Sobre cuál empleado específico necesitas más información?`;
    
    return ResponseBuilder.buildConversationalResponse(message, 'neutral');
  }
}