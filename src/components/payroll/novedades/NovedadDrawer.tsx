
import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { NovedadForm } from './forms/NovedadForm';
import { useNovedadCRUD } from '@/hooks/useNovedadCRUD';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

interface CreateNovedadData {
  company_id: string;
  empleado_id: string;
  periodo_id: string;
  tipo_novedad: Database["public"]["Enums"]["novedad_type"];
  fecha_inicio?: string;
  fecha_fin?: string;
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
      // Convert Date objects to strings if they exist
      const novedadData: CreateNovedadData = {
        company_id: companyId,
        empleado_id: employeeId,
        periodo_id: periodId,
        tipo_novedad: formData.tipo_novedad,
        fecha_inicio: formData.fecha_inicio instanceof Date 
          ? formData.fecha_inicio.toISOString().split('T')[0] 
          : formData.fecha_inicio,
        fecha_fin: formData.fecha_fin instanceof Date 
          ? formData.fecha_fin.toISOString().split('T')[0] 
          : formData.fecha_fin,
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
