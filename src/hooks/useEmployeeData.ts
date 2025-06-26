
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
      
      // Transform raw employee data to EmployeeWithStatus format
      const transformedData = rawData.map((emp: any): EmployeeWithStatus => ({
        id: emp.id,
        cedula: emp.cedula,
        tipoDocumento: emp.tipo_documento || 'CC',
        nombre: emp.nombre,
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
        titularCuenta: emp.titular_cuenta
      }));
      
      setEmployees(transformedData);
      console.log('Empleados cargados:', transformedData.length);
      
      if (supportCompanyId) {
        toast({
          title: "Modo Soporte Activo",
          description: `Viendo empleados de empresa en contexto de soporte`,
        });
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      toast({
        title: "Error al cargar empleados",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  return {
    employees,
    isLoading,
    refreshEmployees: loadEmployees
  };
};
