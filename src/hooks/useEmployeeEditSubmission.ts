
import { useState } from 'react';
import { Employee } from '@/types';
import { EmployeeFormData } from '@/components/employees/form/types';
import { EmployeeUnifiedService } from '@/services/EmployeeUnifiedService';
import { useToast } from '@/hooks/use-toast';

export const useEmployeeEditSubmission = (
  employee: Employee | null,
  onSuccess: () => void,
  onDataRefresh?: (updatedEmployee: Employee) => void
) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (formData: EmployeeFormData) => {
    if (!employee) {
      toast({
        title: "Error",
        description: "No se encontró el empleado para actualizar",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔄 Updating employee:', employee.id, formData);

      // Preparar los datos para la actualización
      const updateData = {
        cedula: formData.cedula,
        tipoDocumento: formData.tipoDocumento,
        nombre: formData.nombre,
        segundoNombre: formData.segundoNombre,
        apellido: formData.apellido,
        email: formData.email,
        telefono: formData.telefono,
        salarioBase: formData.salarioBase,
        tipoContrato: formData.tipoContrato,
        fechaIngreso: formData.fechaIngreso,
        periodicidadPago: formData.periodicidadPago,
        cargo: formData.cargo,
        codigoCIIU: formData.codigoCIIU,
        nivelRiesgoARL: formData.nivelRiesgoARL,
        estado: formData.estado,
        centroCostos: formData.centroCostos,
        fechaFirmaContrato: formData.fechaFirmaContrato,
        fechaFinalizacionContrato: formData.fechaFinalizacionContrato,
        tipoJornada: formData.tipoJornada,
        diasTrabajo: formData.diasTrabajo,
        horasTrabajo: formData.horasTrabajo,
        beneficiosExtralegales: formData.beneficiosExtralegales,
        clausulasEspeciales: formData.clausulasEspeciales,
        banco: formData.banco,
        tipoCuenta: formData.tipoCuenta,
        numeroCuenta: formData.numeroCuenta,
        titularCuenta: formData.titularCuenta,
        formaPago: formData.formaPago,
        eps: formData.eps,
        afp: formData.afp,
        arl: formData.arl,
        cajaCompensacion: formData.cajaCompensacion,
        tipoCotizanteId: formData.tipoCotizanteId,
        subtipoCotizanteId: formData.subtipoCotizanteId,
        regimenSalud: formData.regimenSalud,
        estadoAfiliacion: formData.estadoAfiliacion,
        sexo: formData.sexo,
        fechaNacimiento: formData.fechaNacimiento,
        direccion: formData.direccion,
        ciudad: formData.ciudad,
        departamento: formData.departamento
      };

      const updatedEmployee = await EmployeeUnifiedService.update(employee.id, updateData);

      console.log('✅ Employee updated successfully:', updatedEmployee);

      toast({
        title: "Empleado actualizado",
        description: `${updatedEmployee.nombre} ${updatedEmployee.apellido} ha sido actualizado exitosamente`,
      });

      // Llamar callbacks
      onDataRefresh?.(updatedEmployee);
      onSuccess();

    } catch (error) {
      console.error('❌ Error updating employee:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      toast({
        title: "Error al actualizar empleado",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleSubmit,
    isLoading
  };
};
