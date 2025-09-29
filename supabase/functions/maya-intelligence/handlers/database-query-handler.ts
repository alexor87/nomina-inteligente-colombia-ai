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

  async handleIntent(intent: Intent, context?: RichContext): Promise<HandlerResponse> {
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
    
    this.logger.info('[DatabaseQueryHandler] Generating SQL for query', {
      message: message,
      entities: entities,
      context: context.intent
    });

    // 🔍 PHASE 1: ENTITY DETECTION
    const detectedEntities = this.detectEntities(message, entities);
    const { employeeNames, years, months, dateRanges, tables, metrics } = detectedEntities;

    this.logger.info('[DatabaseQueryHandler] Detected entities', detectedEntities);

    // 🚀 PHASE 2: DOMAIN-SPECIFIC QUERY GENERATION

    // ==================== EMPLOYEE QUERIES ====================
    if (this.isEmployeeQuery(message)) {
      return this.generateEmployeeSQL(message, companyId, employeeNames, years);
    }

    // ==================== PAYROLL QUERIES ====================
    if (this.isPayrollQuery(message)) {
      return this.generatePayrollSQL(message, companyId, employeeNames, years, months);
    }

    // ==================== VOUCHER QUERIES ====================
    if (this.isVoucherQuery(message)) {
      return this.generateVoucherSQL(message, companyId, employeeNames, years, months);
    }

    // ==================== VACATION QUERIES ====================
    if (this.isVacationQuery(message)) {
      return this.generateVacationSQL(message, companyId, employeeNames, years);
    }

    // ==================== NOVELTY QUERIES ====================
    if (this.isNoveltyQuery(message)) {
      return this.generateNoveltySQL(message, companyId, employeeNames, years);
    }

    // ==================== DASHBOARD & ALERTS ====================
    if (this.isDashboardQuery(message)) {
      return this.generateDashboardSQL(message, companyId);
    }

    // ==================== PERIOD QUERIES ====================
    if (this.isPeriodQuery(message)) {
      return this.generatePeriodSQL(message, companyId, years, months);
    }

    // ==================== ANALYTICS & METRICS ====================
    if (this.isAnalyticsQuery(message)) {
      return this.generateAnalyticsSQL(message, companyId, metrics, years);
    }

    // ==================== COMPANY INFO ====================
    if (this.isCompanyQuery(message)) {
      return this.generateCompanySQL(message, companyId);
    }

    // 🎯 DEFAULT: INTELLIGENT FALLBACK
    return this.generateIntelligentFallback(message, companyId, detectedEntities);
  }

  // 🔍 ENTITY DETECTION SYSTEM
  private detectEntities(message: string, entities: any[]) {
    const employeeNames = this.detectEmployeeNames(message);
    const years = this.detectYears(message);
    const months = this.detectMonths(message);
    const dateRanges = this.detectDateRanges(message);
    const tables = this.detectTableReferences(message);
    const metrics = this.detectMetrics(message);

    return { employeeNames, years, months, dateRanges, tables, metrics };
  }

  private detectEmployeeNames(message: string): string[] {
    // Common Colombian names patterns
    const namePatterns = [
      'eliana', 'alicia', 'joahana', 'carlos', 'maria', 'juan', 'ana', 'luis', 
      'sofia', 'diego', 'andrea', 'miguel', 'carolina', 'fernando', 'patricia'
    ];
    
    const detected = namePatterns.filter(name => 
      message.toLowerCase().includes(name.toLowerCase())
    );
    
    this.logger.info('[DatabaseQueryHandler] Employee names detected', detected);
    return detected;
  }

  private detectYears(message: string): number[] {
    const yearMatches = message.match(/\b(20\d{2})\b/g) || [];
    return yearMatches.map(y => parseInt(y));
  }

  private detectMonths(message: string): string[] {
    const monthMap: Record<string, string> = {
      'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
      'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
      'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
    };
    
    return Object.keys(monthMap).filter(month => message.includes(month));
  }

  private detectDateRanges(message: string): any[] {
    const ranges = [];
    if (message.includes('trimestre')) ranges.push({ type: 'quarter' });
    if (message.includes('semestre')) ranges.push({ type: 'semester' });
    if (message.includes('año') || message.includes('anual')) ranges.push({ type: 'year' });
    return ranges;
  }

  private detectTableReferences(message: string): string[] {
    const tableKeywords = {
      'vouchers': ['voucher', 'comprobante', 'desprendible'],
      'vacations': ['vacacion', 'descanso', 'licencia'],
      'novedades': ['novedad', 'ajuste', 'descuento', 'bono'],
      'alerts': ['alerta', 'notificacion', 'aviso']
    };
    
    const detected = [];
    for (const [table, keywords] of Object.entries(tableKeywords)) {
      if (keywords.some(keyword => message.includes(keyword))) {
        detected.push(table);
      }
    }
    return detected;
  }

  private detectMetrics(message: string): string[] {
    const metrics = [];
    if (message.includes('total') || message.includes('suma')) metrics.push('sum');
    if (message.includes('promedio') || message.includes('media')) metrics.push('avg');
    if (message.includes('mayor') || message.includes('máximo')) metrics.push('max');
    if (message.includes('menor') || message.includes('mínimo')) metrics.push('min');
    if (message.includes('cuántos') || message.includes('cantidad')) metrics.push('count');
    return metrics;
  }

  // 🎯 DOMAIN QUERY CLASSIFIERS
  private isEmployeeQuery(message: string): boolean {
    const keywords = ['empleado', 'trabajador', 'personal', 'staff', 'quien', 'quienes'];
    return keywords.some(k => message.includes(k));
  }

  private isPayrollQuery(message: string): boolean {
    const keywords = ['nómina', 'nomina', 'salario', 'sueldo', 'pago', 'devengado', 'liquidación'];
    return keywords.some(k => message.includes(k));
  }

  private isVoucherQuery(message: string): boolean {
    const keywords = ['voucher', 'comprobante', 'desprendible', 'recibo'];
    return keywords.some(k => message.includes(k));
  }

  private isVacationQuery(message: string): boolean {
    const keywords = ['vacacion', 'descanso', 'licencia', 'ausencia', 'permisos'];
    return keywords.some(k => message.includes(k));
  }

  private isNoveltyQuery(message: string): boolean {
    const keywords = ['novedad', 'ajuste', 'descuento', 'bono', 'deduccion', 'extra'];
    return keywords.some(k => message.includes(k));
  }

  private isDashboardQuery(message: string): boolean {
    const keywords = ['dashboard', 'alerta', 'notificacion', 'panel', 'resumen'];
    return keywords.some(k => message.includes(k));
  }

  private isPeriodQuery(message: string): boolean {
    const keywords = ['periodo', 'período', 'mes', 'trimestre', 'semestre', 'quincenal'];
    return keywords.some(k => message.includes(k));
  }

  private isAnalyticsQuery(message: string): boolean {
    const keywords = ['análisis', 'tendencia', 'comparar', 'estadística', 'reporte', 'kpi'];
    return keywords.some(k => message.includes(k));
  }

  private isCompanyQuery(message: string): boolean {
    const keywords = ['empresa', 'compañía', 'organización', 'información'];
    return keywords.some(k => message.includes(k));
  }

  // 📊 SPECIALIZED SQL GENERATORS
  private generateEmployeeSQL(message: string, companyId: string, names: string[], years: number[]): string {
    let sql = `SELECT e.nombre, e.apellido, e.cargo, e.salario_base, e.estado, e.fecha_ingreso`;
    
    // Add payroll data if requested
    if (message.includes('nómina') || message.includes('pago') || message.includes('salario')) {
      sql = `SELECT e.nombre, e.apellido, e.cargo, e.salario_base, 
             COALESCE(SUM(p.total_devengado), 0) as total_pagado,
             COUNT(p.id) as nominas_procesadas`;
    }
    
    sql += ` FROM employees e`;
    
    if (message.includes('nómina') || message.includes('pago')) {
      sql += ` LEFT JOIN payrolls p ON e.id = p.employee_id AND p.company_id = e.company_id`;
    }
    
    sql += ` WHERE e.company_id = '${companyId}'`;
    
    // Filter by employee names
    if (names.length > 0) {
      const nameConditions = names.map(name => 
        `(LOWER(e.nombre) LIKE '%${name.toLowerCase()}%' OR LOWER(e.apellido) LIKE '%${name.toLowerCase()}%')`
      ).join(' OR ');
      sql += ` AND (${nameConditions})`;
    }
    
    // Filter by years
    if (years.length > 0 && message.includes('nómina')) {
      const yearConditions = years.map(year => `EXTRACT(YEAR FROM p.created_at) = ${year}`).join(' OR ');
      sql += ` AND (${yearConditions})`;
    }
    
    // Add grouping if aggregating
    if (message.includes('nómina') || message.includes('pago')) {
      sql += ` GROUP BY e.id, e.nombre, e.apellido, e.cargo, e.salario_base`;
    }
    
    sql += ` ORDER BY e.salario_base DESC LIMIT 25`;
    
    return sql;
  }

  private generatePayrollSQL(message: string, companyId: string, names: string[], years: number[], months: string[]): string {
    let sql = `SELECT `;
    
    if (message.includes('total') || message.includes('cuánto') || message.includes('suma')) {
      sql += `COALESCE(SUM(p.total_devengado), 0) as total_nomina,
              COUNT(*) as empleados_pagados,
              COALESCE(AVG(p.total_devengado), 0) as promedio_empleado`;
    } else {
      sql += `e.nombre, e.apellido, p.periodo, p.total_devengado, p.total_deducciones, p.neto_pagado`;
    }
    
    sql += ` FROM payrolls p 
             JOIN employees e ON p.employee_id = e.id`;
    
    sql += ` WHERE p.company_id = '${companyId}' AND p.estado = 'procesada'`;
    
    // Filter by employee names
    if (names.length > 0) {
      const nameConditions = names.map(name => 
        `(LOWER(e.nombre) LIKE '%${name.toLowerCase()}%' OR LOWER(e.apellido) LIKE '%${name.toLowerCase()}%')`
      ).join(' OR ');
      sql += ` AND (${nameConditions})`;
    }
    
    // Filter by years
    if (years.length > 0) {
      const yearConditions = years.map(year => `EXTRACT(YEAR FROM p.created_at) = ${year}`).join(' OR ');
      sql += ` AND (${yearConditions})`;
    }
    
    // Filter by months
    if (months.length > 0) {
      const monthConditions = months.map(month => `LOWER(p.periodo) LIKE '%${month}%'`).join(' OR ');
      sql += ` AND (${monthConditions})`;
    }
    
    if (!message.includes('total')) {
      sql += ` ORDER BY p.created_at DESC`;
    }
    
    sql += ` LIMIT 50`;
    
    return sql;
  }

  private generateVoucherSQL(message: string, companyId: string, names: string[], years: number[], months: string[]): string {
    let sql = `SELECT v.periodo, e.nombre, e.apellido, v.net_pay, v.voucher_status, v.sent_date
               FROM payroll_vouchers v 
               JOIN employees e ON v.employee_id = e.id
               WHERE v.company_id = '${companyId}'`;
    
    if (names.length > 0) {
      const nameConditions = names.map(name => 
        `(LOWER(e.nombre) LIKE '%${name.toLowerCase()}%' OR LOWER(e.apellido) LIKE '%${name.toLowerCase()}%')`
      ).join(' OR ');
      sql += ` AND (${nameConditions})`;
    }
    
    if (years.length > 0) {
      const yearConditions = years.map(year => `EXTRACT(YEAR FROM v.created_at) = ${year}`).join(' OR ');
      sql += ` AND (${yearConditions})`;
    }
    
    sql += ` ORDER BY v.created_at DESC LIMIT 30`;
    return sql;
  }

  private generateVacationSQL(message: string, companyId: string, names: string[], years: number[]): string {
    let sql = `SELECT e.nombre, e.apellido, evp.type, evp.start_date, evp.end_date, 
               evp.days_count, evp.status
               FROM employee_vacation_periods evp
               JOIN employees e ON evp.employee_id = e.id
               WHERE evp.company_id = '${companyId}'`;
    
    if (names.length > 0) {
      const nameConditions = names.map(name => 
        `(LOWER(e.nombre) LIKE '%${name.toLowerCase()}%' OR LOWER(e.apellido) LIKE '%${name.toLowerCase()}%')`
      ).join(' OR ');
      sql += ` AND (${nameConditions})`;
    }
    
    if (years.length > 0) {
      const yearConditions = years.map(year => `EXTRACT(YEAR FROM evp.start_date) = ${year}`).join(' OR ');
      sql += ` AND (${yearConditions})`;
    }
    
    sql += ` ORDER BY evp.start_date DESC LIMIT 25`;
    return sql;
  }

  private generateNoveltySQL(message: string, companyId: string, names: string[], years: number[]): string {
    let sql = `SELECT e.nombre, e.apellido, pn.tipo_novedad, pn.valor, pn.dias, 
               pn.fecha_inicio, pn.fecha_fin, pn.observacion
               FROM payroll_novedades pn
               JOIN employees e ON pn.empleado_id = e.id
               WHERE pn.company_id = '${companyId}'`;
    
    if (names.length > 0) {
      const nameConditions = names.map(name => 
        `(LOWER(e.nombre) LIKE '%${name.toLowerCase()}%' OR LOWER(e.apellido) LIKE '%${name.toLowerCase()}%')`
      ).join(' OR ');
      sql += ` AND (${nameConditions})`;
    }
    
    if (years.length > 0) {
      const yearConditions = years.map(year => `EXTRACT(YEAR FROM pn.created_at) = ${year}`).join(' OR ');
      sql += ` AND (${yearConditions})`;
    }
    
    sql += ` ORDER BY pn.created_at DESC LIMIT 30`;
    return sql;
  }

  private generateDashboardSQL(message: string, companyId: string): string {
    return `SELECT type, title, description, priority, action_required, due_date, dismissed
            FROM dashboard_alerts 
            WHERE company_id = '${companyId}' AND dismissed = false
            ORDER BY 
              CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
              created_at DESC 
            LIMIT 15`;
  }

  private generatePeriodSQL(message: string, companyId: string, years: number[], months: string[]): string {
    let sql = `SELECT periodo, tipo_periodo, fecha_inicio, fecha_fin, estado, 
               empleados_count, total_devengado, total_neto
               FROM payroll_periods_real 
               WHERE company_id = '${companyId}'`;
    
    if (years.length > 0) {
      const yearConditions = years.map(year => `EXTRACT(YEAR FROM fecha_inicio) = ${year}`).join(' OR ');
      sql += ` AND (${yearConditions})`;
    }
    
    if (months.length > 0) {
      const monthConditions = months.map(month => `LOWER(periodo) LIKE '%${month}%'`).join(' OR ');
      sql += ` AND (${monthConditions})`;
    }
    
    sql += ` ORDER BY fecha_inicio DESC LIMIT 20`;
    return sql;
  }

  private generateAnalyticsSQL(message: string, companyId: string, metrics: string[], years: number[]): string {
    let sql = `SELECT 
               COUNT(DISTINCT e.id) as total_empleados,
               COALESCE(SUM(p.total_devengado), 0) as total_nomina,
               COALESCE(AVG(p.total_devengado), 0) as promedio_nomina,
               COUNT(DISTINCT p.periodo) as periodos_procesados
               FROM employees e 
               LEFT JOIN payrolls p ON e.id = p.employee_id AND e.company_id = p.company_id
               WHERE e.company_id = '${companyId}'`;
    
    if (years.length > 0) {
      const yearConditions = years.map(year => `EXTRACT(YEAR FROM p.created_at) = ${year}`).join(' OR ');
      sql += ` AND (${yearConditions})`;
    }
    
    return sql;
  }

  private generateCompanySQL(message: string, companyId: string): string {
    return `SELECT razon_social, nit, email, ciudad, departamento, plan, estado
            FROM companies 
            WHERE id = '${companyId}'`;
  }

  private generateIntelligentFallback(message: string, companyId: string, entities: any): string {
    // If no specific domain detected, provide a comprehensive overview
    if (entities.employeeNames.length > 0) {
      return this.generateEmployeeSQL(message, companyId, entities.employeeNames, entities.years);
    }
    
    if (entities.years.length > 0) {
      return this.generatePayrollSQL(message, companyId, [], entities.years, []);
    }
    
    // Default comprehensive query
    return `SELECT 
              'Empleados Activos' as categoria,
              COUNT(*) as cantidad
            FROM employees 
            WHERE company_id = '${companyId}' AND estado = 'activo'
            UNION ALL
            SELECT 
              'Períodos de Nómina' as categoria,
              COUNT(*) as cantidad
            FROM payroll_periods_real 
            WHERE company_id = '${companyId}'
            UNION ALL
            SELECT 
              'Vouchers Generados' as categoria,
              COUNT(*) as cantidad
            FROM payroll_vouchers 
            WHERE company_id = '${companyId}'
            ORDER BY categoria`;
  }

  private async executeSafeQuery(sql: string, companyId: string): Promise<DatabaseQueryResult> {
    if (!this.supabaseClient) {
      this.logger.error('[DatabaseQueryHandler] No Supabase client available for query execution', {
        sqlPreview: sql.substring(0, 120),
        companyId
      });
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
      // Additional client-side sanitization for redundancy
      const sanitizedSql = sql.trim().replace(/;+\s*$/, '');
      
      this.logger.info('[DatabaseQueryHandler] Executing SQL', { 
        sql: sanitizedSql.substring(0, 200),
        sql_sanitized_preview: sanitizedSql.substring(0, 100)
      });
      
      const { data, error } = await this.supabaseClient.rpc('execute_safe_query', {
        query_sql: sanitizedSql,
        company_id_param: companyId
      });

      if (error) {
        this.logger.error('[DatabaseQueryHandler] Query execution error', error);
        
        // Enhanced error categorization and messaging
        let errorMessage = error.message;
        let errorType = 'unknown';
        
        if (error.message.includes('Acceso no autorizado a datos de empresa')) {
          errorType = 'unauthorized_company_access';
          errorMessage = `🔒 Error de autorización: El usuario no tiene acceso a los datos de esta empresa. Verifique que esté autenticado correctamente y asignado a la empresa apropiada.`;
        } else if (error.message.includes('Perfil de usuario no encontrado')) {
          errorType = 'missing_user_profile';
          errorMessage = `👤 Perfil faltante: No se encontró el perfil de usuario. Contacte al administrador para que configure su acceso.`;
        } else if (error.message.includes('Usuario no autenticado')) {
          errorType = 'authentication_required';
          errorMessage = `🔑 Autenticación requerida: Su sesión ha expirado. Por favor, inicie sesión nuevamente.`;
        } else if (error.message.includes('Solo se permiten consultas SELECT')) {
          errorType = 'forbidden_operation';
          errorMessage = `❌ Operación no permitida: MAYA solo puede ejecutar consultas de lectura (SELECT) por seguridad.`;
        } else if (error.message.includes('Query no puede estar vacía')) {
          errorType = 'empty_query';
          errorMessage = `⚠️ Consulta vacía: No se puede ejecutar una consulta SQL vacía.`;
        } else if (error.code === 'P0001') {
          errorType = 'custom_exception';
          errorMessage = `💾 Error de base de datos: ${error.message}`;
        } else if (error.message.includes('permission denied')) {
          errorType = 'permission_denied';
          errorMessage = `🚫 Permisos insuficientes: El usuario no tiene permisos para acceder a estos datos.`;
        }
        
        this.logger.error('[DatabaseQueryHandler] Categorized error', {
          errorType,
          originalMessage: error.message,
          enhancedMessage: errorMessage,
          companyId,
          sqlPreview: sanitizedSql.substring(0, 100)
        });

        return {
          success: false,
          error: errorMessage,
          metadata: {
            errorType,
            originalError: error.message,
            executionTimeMs: Date.now() - startTime,
            queryType: 'FAILED'
          }
        };
      }

      const executionTime = Date.now() - startTime;
      const results = data || [];
      
      this.logger.info('[DatabaseQueryHandler] Query executed successfully', {
        rowCount: results.length,
        executionTimeMs: executionTime,
        companyId,
        queryPreview: sanitizedSql.substring(0, 50)
      });

      const queryType = this.getQueryType(sql);
      
      return {
        success: true,
        data: results,
        metadata: {
          rowCount: results.length,
          columns: results.length > 0 ? Object.keys(results[0]) : [],
          executionTimeMs: executionTime,
          queryType: queryType
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('[DatabaseQueryHandler] Query execution exception', {
        error: errorMessage,
        executionTimeMs: executionTime,
        companyId,
        sqlPreview: sql.substring(0, 100)
      });

      return {
        success: false,
        error: `💥 Error inesperado en la consulta: ${errorMessage}`,
        metadata: {
          errorType: 'exception',
          originalError: errorMessage,
          executionTimeMs: executionTime,
          queryType: 'FAILED'
        }
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

    // Remove trailing semicolons to prevent syntax errors
    sql = sql.replace(/;+\s*$/, '');

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