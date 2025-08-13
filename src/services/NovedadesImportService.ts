
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { NovedadValidationService } from './NovedadValidationService';
import { NovedadesEnhancedService } from './NovedadesEnhancedService';
import { CreateNovedadData } from '@/types/novedades-enhanced';

interface ParsedFileData {
  columns: string[];
  rows: any[];
}

interface ValidationResult {
  validRows: CreateNovedadData[];
  invalidRows: Array<{
    rowIndex: number;
    error: string;
    originalData: any;
  }>;
  employeesFound: number;
}

interface ImportResult {
  success: boolean;
  imported: number;
  errors: number;
  employeesAffected: number;
  error?: string;
}

export class NovedadesImportService {
  
  static async parseFile(file: File): Promise<{ success: boolean; data?: ParsedFileData; error?: string }> {
    try {
      console.log('📄 Parseando archivo:', file.name, file.type);
      
      const buffer = await file.arrayBuffer();
      let workbook: XLSX.WorkBook;

      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        const text = new TextDecoder().decode(buffer);
        workbook = XLSX.read(text, { type: 'string' });
      } else {
        workbook = XLSX.read(buffer, { type: 'array' });
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (!jsonData || jsonData.length === 0) {
        throw new Error('El archivo está vacío o no tiene datos válidos');
      }

      // Primera fila como encabezados
      const columns = (jsonData[0] as string[]).map(col => String(col).trim());
      
      // Resto de filas como datos
      const rows = jsonData.slice(1).map((row: any) => {
        const rowData: any = {};
        columns.forEach((col, index) => {
          rowData[col] = row[index];
        });
        return rowData;
      }).filter(row => {
        // Filtrar filas completamente vacías
        return Object.values(row).some(value => value !== undefined && value !== null && value !== '');
      });

      console.log('✅ Archivo parseado:', {
        columns: columns.length,
        rows: rows.length
      });

      return {
        success: true,
        data: { columns, rows }
      };
    } catch (error: any) {
      console.error('❌ Error parseando archivo:', error);
      return {
        success: false,
        error: error.message || 'Error al procesar el archivo'
      };
    }
  }

  static async validateAndPrepareData(
    rows: any[],
    mapping: Record<string, string>,
    periodId: string
  ): Promise<ValidationResult> {
    console.log('🔍 Iniciando validación de datos...');
    
    const validRows: CreateNovedadData[] = [];
    const invalidRows: Array<{ rowIndex: number; error: string; originalData: any }> = [];
    const employeesFound = new Set<string>();

    // Obtener company_id del usuario actual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      throw new Error('No se encontró la empresa del usuario');
    }

    const companyId = profile.company_id;

    // Obtener empleados de la empresa para resolución
    const { data: employees } = await supabase
      .from('employees')
      .select('id, cedula, email, nombre, apellido, salario_base')
      .eq('company_id', companyId);

    const employeeMap = new Map();
    employees?.forEach(emp => {
      if (emp.cedula) employeeMap.set(emp.cedula, emp);
      if (emp.email) employeeMap.set(emp.email, emp);
      employeeMap.set(emp.id, emp);
    });

    // Obtener período para validación
    const { data: period } = await supabase
      .from('payroll_periods_real')
      .select('*')
      .eq('id', periodId)
      .eq('company_id', companyId)
      .single();

    if (!period) {
      throw new Error('Período no encontrado');
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const originalData = { ...row };

      try {
        // Construir objeto de novedad desde el mapeo
        const novedadData: any = {
          company_id: companyId,
          periodo_id: periodId,
        };

        // Mapear campos desde las columnas
        Object.entries(mapping).forEach(([sourceColumn, targetField]) => {
          const value = row[sourceColumn];
          if (value !== undefined && value !== null && value !== '') {
            novedadData[targetField] = value;
          }
        });

        // Resolver empleado
        let employee = null;
        if (novedadData.empleado_id) {
          employee = employeeMap.get(novedadData.empleado_id);
        } else if (novedadData.cedula) {
          employee = employeeMap.get(String(novedadData.cedula));
        }

        if (!employee) {
          invalidRows.push({
            rowIndex: i,
            error: 'Empleado no encontrado',
            originalData
          });
          continue;
        }

        novedadData.empleado_id = employee.id;
        employeesFound.add(employee.id);

        // Limpiar campos de búsqueda
        delete novedadData.cedula;

        // Normalizar tipos de novedad
        if (novedadData.tipo_novedad === 'deduccion_especial') {
          novedadData.tipo_novedad = 'descuento_voluntario';
        }

        // Convertir campos numéricos
        if (novedadData.valor) {
          novedadData.valor = Number(novedadData.valor);
        }
        if (novedadData.dias) {
          novedadData.dias = Number(novedadData.dias);
        }
        if (novedadData.horas) {
          novedadData.horas = Number(novedadData.horas);
        }

        // Convertir constitutivo_salario a boolean
        if (novedadData.constitutivo_salario !== undefined) {
          novedadData.constitutivo_salario = String(novedadData.constitutivo_salario).toLowerCase() === 'true';
        }

        // Validar con el servicio de validación
        const validation = NovedadValidationService.validateForSave(novedadData);
        
        if (!validation.canSave) {
          invalidRows.push({
            rowIndex: i,
            error: validation.errors.join('; '),
            originalData
          });
          continue;
        }

        // Agregar información adicional para preview
        (novedadData as any).employeeName = `${employee.nombre} ${employee.apellido}`;
        
        validRows.push(novedadData as CreateNovedadData);

      } catch (error: any) {
        console.error(`❌ Error procesando fila ${i + 1}:`, error);
        invalidRows.push({
          rowIndex: i,
          error: error.message || 'Error desconocido',
          originalData
        });
      }
    }

    console.log('✅ Validación completada:', {
      total: rows.length,
      valid: validRows.length,
      invalid: invalidRows.length,
      employees: employeesFound.size
    });

    return {
      validRows,
      invalidRows,
      employeesFound: employeesFound.size
    };
  }

  static async importNovedades(
    validRows: CreateNovedadData[],
    periodId: string
  ): Promise<ImportResult> {
    try {
      console.log(`🚀 Importando ${validRows.length} novedades...`);
      
      let imported = 0;
      let errors = 0;
      const employeesAffected = new Set<string>();

      // Importar en lotes para mejor rendimiento
      const batchSize = 10;
      for (let i = 0; i < validRows.length; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize);
        
        for (const novedad of batch) {
          try {
            await NovedadesEnhancedService.createNovedad(novedad);
            imported++;
            employeesAffected.add(novedad.empleado_id);
          } catch (error) {
            console.error('❌ Error importando novedad:', error);
            errors++;
          }
        }
      }

      console.log(`✅ Importación completada: ${imported} exitosas, ${errors} errores`);

      return {
        success: imported > 0,
        imported,
        errors,
        employeesAffected: employeesAffected.size
      };

    } catch (error: any) {
      console.error('❌ Error en importación masiva:', error);
      return {
        success: false,
        imported: 0,
        errors: validRows.length,
        employeesAffected: 0,
        error: error.message
      };
    }
  }
}
