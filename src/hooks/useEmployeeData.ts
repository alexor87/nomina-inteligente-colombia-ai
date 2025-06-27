
import { useState, useEffect, useCallback, useMemo } from 'react';
import { EmployeeWithStatus } from '@/types/employee-extended';
import { useToast } from '@/hooks/use-toast';
import { EmployeeDataService } from '@/services/EmployeeDataService';

export const useEmployeeData = () => {
  const [employees, setEmployees] = useState<EmployeeWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  const loadEmployees = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🔄 useEmployeeData: Starting to load employees...');
      
      const urlParams = new URLSearchParams(window.location.search);
      const supportCompanyId = urlParams.get('support_company');
      
      let companyId: string;
      
      if (supportCompanyId) {
        companyId = supportCompanyId;
        console.log('🔧 Using support company context:', companyId);
      } else {
        try {
          companyId = await EmployeeDataService.getCurrentUserCompanyId();
          if (!companyId) {
            throw new Error('No se pudo obtener la empresa del usuario');
          }
        } catch (error) {
          console.error('❌ Error getting company ID:', error);
          toast({
            title: "Error de configuración",
            description: "No se pudo obtener la información de la empresa. Por favor, contacta al soporte.",
            variant: "destructive"
          });
          setIsInitialized(true);
          setIsLoading(false);
          return;
        }
      }
      
      const rawData = await EmployeeDataService.getEmployees(companyId);
      console.log('📋 Raw employee data from database:', rawData);
      
      // Transform raw employee data to EmployeeWithStatus format
      const transformedData = rawData.map((emp: any): EmployeeWithStatus => {
        console.log('🔄 Transforming employee:', emp.nombre, emp.apellido);
        
        const transformed = {
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
          centrosocial: emp.centro_costos,
          ultimaLiquidacion: emp.ultima_liquidacion,
          contratoVencimiento: emp.contrato_vencimiento
        };

        return transformed;
      });
      
      console.log('✅ All employees transformed, total:', transformedData.length);
      setEmployees(transformedData);
      setIsInitialized(true);
      
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
        description: "No se pudieron cargar los empleados. Verifica tu conexión e intenta nuevamente.",
        variant: "destructive"
      });
      setIsInitialized(true);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Memoized function to update a specific employee in the list
  const updateEmployeeInList = useCallback((updatedEmployee: EmployeeWithStatus) => {
    console.log('🔄 Updating employee in list:', updatedEmployee.id);
    
    setEmployees(prevEmployees => 
      prevEmployees.map(emp => 
        emp.id === updatedEmployee.id ? updatedEmployee : emp
      )
    );
  }, []);

  // Memoized function to find employee by ID
  const findEmployeeById = useCallback((employeeId: string): EmployeeWithStatus | undefined => {
    console.log('🔍 Finding employee by ID:', employeeId);
    console.log('📋 Available employees count:', employees.length);
    
    if (!isInitialized || isLoading) {
      console.log('⚠️ Data not ready yet, returning undefined');
      return undefined;
    }

    const foundEmployee = employees.find(emp => emp.id === employeeId);
    
    if (foundEmployee) {
      console.log('✅ Found employee:', foundEmployee.nombre, foundEmployee.apellido);
    } else {
      console.log('❌ Employee not found with ID:', employeeId);
    }
    
    return foundEmployee;
  }, [employees, isInitialized, isLoading]);

  // Memoized retry function
  const retryFindEmployeeById = useCallback(async (employeeId: string): Promise<EmployeeWithStatus | undefined> => {
    console.log('🔄 RETRY: Attempting to reload data and find employee:', employeeId);
    
    // First try to find in current data
    let employee = findEmployeeById(employeeId);
    if (employee) {
      console.log('✅ RETRY: Found employee in current data');
      return employee;
    }
    
    // If not found, reload all data
    console.log('🔄 RETRY: Employee not found, reloading all data...');
    await loadEmployees();
    
    // Try again after reload
    employee = findEmployeeById(employeeId);
    if (employee) {
      console.log('✅ RETRY: Found employee after reload');
    } else {
      console.log('❌ RETRY: Employee still not found after reload');
    }
    
    return employee;
  }, [findEmployeeById, loadEmployees]);

  useEffect(() => {
    loadEmployees();
  }, []); // Remove loadEmployees from dependencies to prevent loops

  // Memoize the return object to prevent unnecessary re-renders
  const returnValue = useMemo(() => ({
    employees,
    isLoading,
    isInitialized,
    refreshEmployees: loadEmployees,
    findEmployeeById,
    updateEmployeeInList,
    retryFindEmployeeById
  }), [employees, isLoading, isInitialized, loadEmployees, findEmployeeById, updateEmployeeInList, retryFindEmployeeById]);

  return returnValue;
};
