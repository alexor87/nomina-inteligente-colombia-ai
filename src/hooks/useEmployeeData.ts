
import { useState, useEffect } from 'react';
import { EmployeeWithStatus } from '@/types/employee-extended';
import { useToast } from '@/hooks/use-toast';
import { EmployeeDataService } from '@/services/EmployeeDataService';

export const useEmployeeData = () => {
  const [employees, setEmployees] = useState<EmployeeWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadEmployees = async () => {
    try {
      setIsLoading(true);
      
      // Verificar si hay un parámetro de empresa de soporte en la URL
      const urlParams = new URLSearchParams(window.location.search);
      const supportCompanyId = urlParams.get('support_company');
      
      let companyId: string;
      
      if (supportCompanyId) {
        // Si hay un parámetro de empresa de soporte, usar ese
        companyId = supportCompanyId;
        console.log('🔧 Using support company context:', companyId);
      } else {
        // Caso normal: obtener empresa del usuario actual
        companyId = await EmployeeDataService.getCurrentUserCompanyId();
        if (!companyId) {
          throw new Error('No se pudo obtener la empresa del usuario');
        }
      }
      
      const rawData = await EmployeeDataService.getEmployees(companyId);
      console.log('📋 Raw employee data from database:', rawData);
      
      // Transform raw employee data to EmployeeWithStatus format with ALL fields mapped
      const transformedData = rawData.map((emp: any): EmployeeWithStatus => {
        console.log('🔄 Transforming employee:', emp.nombre, emp.apellido);
        console.log('📊 Employee raw data:', emp);
        
        return {
          id: emp.id,
          cedula: emp.cedula,
          tipoDocumento: emp.tipo_documento || 'CC',
          nombre: emp.nombre,
          segundoNombre: emp.segundo_nombre || undefined,
          apellido: emp.apellido,
          email: emp.email || '',
          telefono: emp.telefono,
          salarioBase: Number(emp.salario_base) || 0,
          tipoContrato: emp.tipo_contrato || 'indefinido',
          fechaIngreso: emp.fecha_ingreso,
          estado: emp.estado || 'activo',
          eps: emp.eps,
          afp: emp.afp,
          arl: emp.arl,
          cajaCompensacion: emp.caja_compensacion,
          cargo: emp.cargo,
          empresaId: emp.company_id,
          estadoAfiliacion: emp.estado_afiliacion || 'pendiente',
          nivelRiesgoARL: emp.nivel_riesgo_arl,
          createdAt: emp.created_at,
          updatedAt: emp.updated_at,
          // Banking information
          banco: emp.banco,
          tipoCuenta: emp.tipo_cuenta || 'ahorros',
          numeroCuenta: emp.numero_cuenta,
          titularCuenta: emp.titular_cuenta,
          // Extended personal information
          sexo: emp.sexo,
          fechaNacimiento: emp.fecha_nacimiento,
          direccion: emp.direccion,
          ciudad: emp.ciudad,
          departamento: emp.departamento,
          // Labor information extended
          periodicidadPago: emp.periodicidad_pago,
          codigoCIIU: emp.codigo_ciiu,
          centroCostos: emp.centro_costos,
          // Contract details
          fechaFirmaContrato: emp.fecha_firma_contrato,
          fechaFinalizacionContrato: emp.fecha_finalizacion_contrato,
          tipoJornada: emp.tipo_jornada,
          diasTrabajo: emp.dias_trabajo,
          horasTrabajo: emp.horas_trabajo,
          beneficiosExtralegales: emp.beneficios_extralegales,
          clausulasEspeciales: emp.clausulas_especiales,
          formaPago: emp.forma_pago,
          regimenSalud: emp.regimen_salud,
          // Types de cotizante
          tipoCotizanteId: emp.tipo_cotizante_id,
          subtipoCotizanteId: emp.subtipo_cotizante_id,
          // Legacy fields for compatibility
          avatar: emp.avatar,
          centrosocial: emp.centro_costos, // Map centro_costos to centrosocial for backward compatibility
          ultimaLiquidacion: emp.ultima_liquidacion,
          contratoVencimiento: emp.contrato_vencimiento
        };
      });
      
      console.log('✅ Transformed employee data with all fields:', transformedData);
      setEmployees(transformedData);
      
      if (supportCompanyId) {
        toast({
          title: "Modo Soporte Activo",
          description: `Viendo empleados de empresa en contexto de soporte`,
        });
      }
    } catch (error) {
      console.error('❌ Error loading employees:', error);
      toast({
        title: "Error al cargar empleados",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Function to find employee by ID directly from all loaded employees
  const findEmployeeById = (employeeId: string): EmployeeWithStatus | undefined => {
    console.log('🔍 Finding employee by ID:', employeeId);
    console.log('📋 Available employees:', employees.length);
    console.log('📊 Employee IDs available:', employees.map(emp => ({ id: emp.id, name: `${emp.nombre} ${emp.apellido}` })));
    
    const foundEmployee = employees.find(emp => emp.id === employeeId);
    console.log('🎯 Found employee:', foundEmployee ? `${foundEmployee.nombre} ${foundEmployee.apellido}` : 'NOT FOUND');
    
    return foundEmployee;
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  return {
    employees,
    isLoading,
    refreshEmployees: loadEmployees,
    findEmployeeById // NEW: Export the direct search function
  };
};
