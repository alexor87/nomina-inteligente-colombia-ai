// ============================================================================
// MAYA Database Query Handler - Advanced SQL Intelligence
// ============================================================================

import { BaseHandler } from './base-handler.ts';
import { Intent, HandlerResponse, RichContext, MayaLogger, DatabaseQueryResult, QueryContext, VisualDataResponse } from '../core/types.ts';
import { ResponseBuilder } from '../core/response-builder.ts';

export class DatabaseQueryHandler extends BaseHandler {
  private supabaseClient: any;
  
  constructor(logger: MayaLogger, openaiKey?: string, supabaseClient?: any) {
    super(logger, openaiKey);
    this.supabaseClient = supabaseClient;
  }

  canHandle(intent: Intent): boolean {
    const queryIntents = ['DATA_QUERY', 'ANALYTICS_REQUEST', 'REPORT_INSIGHTS', 'COMPARISON_ANALYSIS'];
    return queryIntents.includes(intent.type);
  }

  protected async handleIntent(intent: Intent, context?: RichContext): Promise<HandlerResponse> {
    this.logger.info('[DatabaseQueryHandler] Processing database query', {
      intentType: intent.type,
      confidence: intent.confidence,
      entitiesCount: intent.entities.length
    });

    const queryContext: QueryContext = {
      userMessage: intent.parameters.originalMessage || '',
      companyId: context?.companyId || '',
      intent: intent.type,
      entities: intent.entities,
      richContext: context
    };

    try {
      // Generate intelligent SQL based on natural language
      const sqlQuery = await this.generateIntelligentSQL(queryContext);
      
      if (!sqlQuery) {
        return ResponseBuilder.buildErrorResponse(
          'No pude generar una consulta SQL válida para tu pregunta',
          'Intenta reformular tu pregunta de forma más específica'
        );
      }

      // Execute the query safely
      const result = await this.executeSafeQuery(sqlQuery, queryContext.companyId);
      
      if (!result.success) {
        return ResponseBuilder.buildErrorResponse(
          'Error ejecutando la consulta',
          result.error
        );
      }

      // Generate visual response
      const visualResponse = this.generateVisualResponse(result, queryContext);
      
      return this.buildDataVisualizationResponse(visualResponse, result);

    } catch (error) {
      this.logger.error('[DatabaseQueryHandler] Query execution failed', error);
      return ResponseBuilder.buildErrorResponse(
        'Ocurrió un error procesando tu consulta',
        'Por favor intenta de nuevo con una pregunta más específica'
      );
    }
  }

  private async generateIntelligentSQL(context: QueryContext): Promise<string | null> {
    if (!this.openaiKey) {
      return this.generateBasicSQL(context);
    }

    const prompt = this.buildSQLGenerationPrompt(context);
    
    try {
      const response = await this.callWithAI(prompt);
      if (response) {
        // Extract SQL from AI response
        const sqlMatch = response.match(/```sql\n(.*?)\n```/s) || response.match(/```\n(.*?)\n```/s);
        if (sqlMatch) {
          return sqlMatch[1].trim();
        }
        // If no code blocks, try to extract clean SQL
        return this.cleanAndValidateSQL(response);
      }
    } catch (error) {
      this.logger.error('[DatabaseQueryHandler] AI SQL generation failed', error);
    }

    return this.generateBasicSQL(context);
  }

  private buildSQLGenerationPrompt(context: QueryContext): string {
    return `Eres un experto en SQL y análisis de datos de nómina colombiana. Genera una consulta SQL SEGURA y OPTIMIZADA.

PREGUNTA DEL USUARIO: "${context.userMessage}"

ESQUEMA DE BASE DE DATOS DISPONIBLE:
- employees (id, company_id, nombre, apellido, salario_base, cargo, estado, fecha_ingreso, custom_fields)
- payrolls (id, company_id, employee_id, periodo, period_id, salario_base, total_devengado, total_deducciones, neto_pagado, estado, created_at)
- payroll_periods_real (id, company_id, periodo, fecha_inicio, fecha_fin, tipo_periodo, estado, empleados_count, total_devengado, total_deducciones, total_neto)
- payroll_novedades (id, company_id, empleado_id, periodo_id, tipo_novedad, valor, dias, fecha_inicio, fecha_fin, observacion)
- companies (id, nit, razon_social, email, ciudad, departamento, plan)
- cost_centers (id, company_id, code, name, active)

CONTEXTO EMPRESARIAL:
- Company ID: ${context.companyId}
- Tipo de consulta: ${context.intent}
- Entidades detectadas: ${JSON.stringify(context.entities)}

REGLAS ESTRICTAS:
1. SIEMPRE incluir WHERE company_id = '${context.companyId}' para seguridad
2. SOLO consultas SELECT (nunca INSERT/UPDATE/DELETE)
3. Usar LIMIT para consultas grandes (máximo 100 filas)
4. Incluir ORDER BY para resultados consistentes
5. Usar agregaciones (SUM, AVG, COUNT) cuando sea apropiado
6. Manejar datos nulos con COALESCE

TIPOS DE CONSULTAS POR INTENT:
- DATA_QUERY: Consultas directas de información
- ANALYTICS_REQUEST: Agregaciones y métricas
- REPORT_INSIGHTS: Análisis de tendencias
- COMPARISON_ANALYSIS: Comparaciones entre períodos/grupos

EJEMPLOS:
"¿Cuánto gastamos en nómina?" → SELECT SUM(total_devengado) as total_nomina FROM payrolls WHERE company_id = '${context.companyId}' AND estado = 'procesada'
"¿Quiénes son mis empleados mejor pagados?" → SELECT nombre, apellido, salario_base FROM employees WHERE company_id = '${context.companyId}' AND estado = 'activo' ORDER BY salario_base DESC LIMIT 10

Responde SOLO con el SQL optimizado, sin explicaciones:`;
  }

  private generateBasicSQL(context: QueryContext): string {
    const { userMessage, companyId, entities } = context;
    const message = userMessage.toLowerCase();

    // Patterns for common queries
    if (message.includes('nómina') && (message.includes('total') || message.includes('gasto') || message.includes('cuánto'))) {
      return `SELECT 
        COALESCE(SUM(total_devengado), 0) as total_nomina,
        COUNT(*) as empleados_pagados,
        COALESCE(AVG(total_devengado), 0) as promedio_por_empleado
      FROM payrolls 
      WHERE company_id = '${companyId}' AND estado = 'procesada'
      ORDER BY created_at DESC LIMIT 50`;
    }

    if (message.includes('empleados') && (message.includes('mejor') || message.includes('mayor') || message.includes('más'))) {
      return `SELECT 
        nombre, apellido, salario_base, cargo
      FROM employees 
      WHERE company_id = '${companyId}' AND estado = 'activo' 
      ORDER BY salario_base DESC LIMIT 10`;
    }

    if (message.includes('empleados') && message.includes('cuántos')) {
      return `SELECT 
        COUNT(*) as total_empleados,
        SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as empleados_activos,
        SUM(CASE WHEN estado = 'inactivo' THEN 1 ELSE 0 END) as empleados_inactivos
      FROM employees 
      WHERE company_id = '${companyId}'`;
    }

    // Default: recent employee activity
    return `SELECT 
      nombre, apellido, cargo, fecha_ingreso, estado
    FROM employees 
    WHERE company_id = '${companyId}' 
    ORDER BY created_at DESC LIMIT 20`;
  }

  private async executeSafeQuery(sql: string, companyId: string): Promise<DatabaseQueryResult> {
    if (!this.supabaseClient) {
      return {
        success: false,
        error: 'Conexión a base de datos no disponible'
      };
    }

    // Validate query safety
    if (!this.isQuerySafe(sql)) {
      return {
        success: false,
        error: 'Consulta no permitida por seguridad'
      };
    }

    const startTime = Date.now();

    try {
      this.logger.info('[DatabaseQueryHandler] Executing SQL', { sql: sql.substring(0, 200) });
      
      const { data, error } = await this.supabaseClient.rpc('execute_safe_query', {
        query_sql: sql,
        company_id_param: companyId
      });

      const executionTime = Date.now() - startTime;

      if (error) {
        this.logger.error('[DatabaseQueryHandler] Query execution error', error);
        return {
          success: false,
          error: `Error de base de datos: ${error.message}`
        };
      }

      return {
        success: true,
        data: Array.isArray(data) ? data : [data],
        metadata: {
          rowCount: Array.isArray(data) ? data.length : (data ? 1 : 0),
          columns: data && data.length > 0 ? Object.keys(data[0]) : [],
          executionTimeMs: executionTime,
          queryType: this.getQueryType(sql)
        }
      };

    } catch (error) {
      this.logger.error('[DatabaseQueryHandler] Query execution failed', error);
      return {
        success: false,
        error: 'Error ejecutando la consulta en la base de datos'
      };
    }
  }

  private isQuerySafe(sql: string): boolean {
    const forbidden = [
      'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 
      'TRUNCATE', 'GRANT', 'REVOKE', '--', '/*', 'xp_', 'sp_'
    ];
    
    const upperSql = sql.toUpperCase();
    return !forbidden.some(keyword => upperSql.includes(keyword));
  }

  private getQueryType(sql: string): 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'AGGREGATE' {
    const upperSql = sql.toUpperCase().trim();
    
    if (upperSql.includes('SUM(') || upperSql.includes('COUNT(') || upperSql.includes('AVG(') || upperSql.includes('GROUP BY')) {
      return 'AGGREGATE';
    }
    
    return 'SELECT';
  }

  private cleanAndValidateSQL(response: string): string | null {
    // Remove common AI response formatting
    let sql = response
      .replace(/```sql/g, '')
      .replace(/```/g, '')
      .replace(/^SQL:\s*/i, '')
      .replace(/^Query:\s*/i, '')
      .trim();

    // Basic validation
    if (!sql.toUpperCase().startsWith('SELECT')) {
      return null;
    }

    return sql;
  }

  private generateVisualResponse(result: DatabaseQueryResult, context: QueryContext): VisualDataResponse {
    if (!result.data || result.data.length === 0) {
      return {
        type: 'metric',
        title: 'No se encontraron datos',
        data: { message: 'No hay información disponible para tu consulta' }
      };
    }

    const data = result.data;
    const firstRow = data[0];
    const columns = Object.keys(firstRow);

    // Determine visualization type based on data structure and query
    if (context.intent === 'ANALYTICS_REQUEST' && this.hasNumericAggregation(firstRow)) {
      return {
        type: 'metric',
        title: this.generateInsightTitle(context.userMessage, data),
        data: this.formatMetrics(data),
        format: { metrics: this.extractMetrics(data) }
      };
    }

    if (context.intent === 'COMPARISON_ANALYSIS' && data.length > 1) {
      return {
        type: 'chart',
        title: this.generateInsightTitle(context.userMessage, data),
        data: data,
        format: { chartType: 'bar' }
      };
    }

    if (data.length <= 5 && this.hasNumericData(firstRow)) {
      return {
        type: 'metric',
        title: this.generateInsightTitle(context.userMessage, data),
        data: this.formatMetrics(data),
        format: { metrics: this.extractMetrics(data) }
      };
    }

    // Default to table for detailed data
    return {
      type: 'table',
      title: this.generateInsightTitle(context.userMessage, data),
      data: data,
      format: {
        columns: columns.map(col => ({
          key: col,
          label: this.humanizeColumnName(col),
          type: this.getColumnType(data, col)
        }))
      }
    };
  }

  private hasNumericAggregation(row: any): boolean {
    const aggregateKeywords = ['total', 'sum', 'count', 'avg', 'promedio', 'cantidad'];
    return Object.keys(row).some(key => 
      aggregateKeywords.some(keyword => key.toLowerCase().includes(keyword))
    );
  }

  private hasNumericData(row: any): boolean {
    return Object.values(row).some(value => typeof value === 'number');
  }

  private formatMetrics(data: any[]): any {
    if (data.length === 1) {
      return data[0];
    }
    return { rows: data };
  }

  private extractMetrics(data: any[]): Array<{label: string, value: any, unit?: string}> {
    if (data.length === 1) {
      return Object.entries(data[0]).map(([key, value]) => ({
        label: this.humanizeColumnName(key),
        value: this.formatValue(value),
        unit: this.getUnit(key, value)
      }));
    }
    
    return [{
      label: 'Registros encontrados',
      value: data.length,
      unit: 'registros'
    }];
  }

  private generateInsightTitle(userMessage: string, data: any[]): string {
    const count = data.length;
    
    if (userMessage.toLowerCase().includes('nómina')) {
      return count === 1 ? 'Resumen de Nómina' : `Análisis de Nómina (${count} períodos)`;
    }
    
    if (userMessage.toLowerCase().includes('empleado')) {
      return count === 1 ? 'Información del Empleado' : `Empleados Encontrados (${count})`;
    }
    
    return `Resultados de la Consulta (${count})`;
  }

  private humanizeColumnName(column: string): string {
    const mappings: Record<string, string> = {
      'nombre': 'Nombre',
      'apellido': 'Apellido', 
      'salario_base': 'Salario Base',
      'cargo': 'Cargo',
      'total_devengado': 'Total Devengado',
      'total_nomina': 'Total Nómina',
      'empleados_pagados': 'Empleados Pagados',
      'promedio_por_empleado': 'Promedio por Empleado',
      'total_empleados': 'Total Empleados',
      'empleados_activos': 'Empleados Activos',
      'fecha_ingreso': 'Fecha de Ingreso',
      'estado': 'Estado'
    };
    
    return mappings[column] || column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private getColumnType(data: any[], column: string): string {
    const value = data[0]?.[column];
    
    if (typeof value === 'number') {
      return column.includes('fecha') ? 'date' : 'number';
    }
    
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return 'date';
    }
    
    return 'text';
  }

  private formatValue(value: any): string {
    if (typeof value === 'number') {
      if (value > 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
      }
      if (value > 1000) {
        return `$${(value / 1000).toFixed(0)}K`;
      }
      return value.toLocaleString();
    }
    
    return String(value);
  }

  private getUnit(key: string, value: any): string | undefined {
    if (typeof value === 'number') {
      if (key.includes('salario') || key.includes('total') || key.includes('neto') || key.includes('pago')) {
        return 'COP';
      }
      if (key.includes('empleados') || key.includes('count') || key.includes('cantidad')) {
        return 'empleados';
      }
    }
    return undefined;
  }

  private buildDataVisualizationResponse(visualData: VisualDataResponse, queryResult: DatabaseQueryResult): HandlerResponse {
    let message = `📊 **${visualData.title}**\n\n`;

    if (visualData.type === 'metric' && visualData.format?.metrics) {
      // Format metrics display
      visualData.format.metrics.forEach(metric => {
        const value = metric.unit ? `${metric.value} ${metric.unit}` : metric.value;
        message += `▶️ **${metric.label}:** ${value}\n`;
      });
    } else if (visualData.type === 'table' && Array.isArray(visualData.data)) {
      // Format table display (show first few rows)
      const rows = visualData.data.slice(0, 5);
      message += `Mostrando ${rows.length} de ${visualData.data.length} registros:\n\n`;
      
      rows.forEach((row, index) => {
        message += `**${index + 1}.** `;
        if (row.nombre && row.apellido) {
          message += `${row.nombre} ${row.apellido}`;
          if (row.cargo) message += ` - ${row.cargo}`;
          if (row.salario_base) message += ` ($${row.salario_base.toLocaleString()})`;
        } else {
          const displayValues = Object.entries(row)
            .slice(0, 3)
            .map(([key, value]) => `${this.humanizeColumnName(key)}: ${value}`)
            .join(' | ');
          message += displayValues;
        }
        message += '\n';
      });
      
      if (visualData.data.length > 5) {
        message += `\n... y ${visualData.data.length - 5} registros más`;
      }
    }

    // Add performance info
    if (queryResult.metadata) {
      message += `\n\n⚡ Consulta ejecutada en ${queryResult.metadata.executionTimeMs}ms (${queryResult.metadata.rowCount} registros)`;
    }

    return ResponseBuilder.buildConversationalResponse(message, 'helpful');
  }
}