
import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { NovedadForm } from './forms/NovedadForm';
import { useNovedadCRUD } from '@/hooks/useNovedadCRUD';
import { useToast } from '@/hooks/use-toast';

interface CreateNovedadData {
  company_id: string;
  empleado_id: string;
  periodo_id: string;
  tipo_novedad: string;
  fecha_inicio?: Date;
  fecha_fin?: Date;
  dias?: number;
  horas?: number;
  valor: number;
  observacion?: string;
  constitutivo_salario?: boolean;
  base_calculo?: string;
  subtipo?: string;
}

interface NovedadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  periodId: string;
  companyId: string;
  onSuccess?: () => void;
}

export const NovedadDrawer: React.FC<NovedadDrawerProps> = ({
  isOpen,
  onClose,
  employeeId,
  periodId,
  companyId,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { createNovedad } = useNovedadCRUD();
  const { toast } = useToast();

  const handleSubmit = async (formData: any) => {
    setIsLoading(true);
    try {
      // ✅ FIXED: Map form data to CreateNovedadData format
      const novedadData: CreateNovedadData = {
        company_id: companyId,
        empleado_id: employeeId,
        periodo_id: periodId,
        tipo_novedad: formData.tipo_novedad,
        fecha_inicio: formData.fecha_inicio,
        fecha_fin: formData.fecha_fin,
        dias: formData.dias,
        horas: formData.horas,
        valor: formData.valor,
        observacion: formData.observacion,
        constitutivo_salario: formData.constitutivo_salario,
        base_calculo: formData.base_calculo,
        subtipo: formData.subtipo
      };

      const result = await createNovedad(novedadData);
      
      if (result.success) {
        toast({
          title: "Novedad creada",
          description: "La novedad se ha creado exitosamente",
        });
        onSuccess?.();
        onClose();
      } else {
        throw new Error(result.error || 'Error creando novedad');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error creando la novedad",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle>Nueva Novedad</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6">
          <NovedadForm
            onSubmit={handleSubmit}
            onCancel={onClose}
            isLoading={isLoading}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};
