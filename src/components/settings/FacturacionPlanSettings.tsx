import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export const FacturacionPlanSettings = () => {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Configuración guardada",
      description: "Los parámetros de facturación han sido actualizados.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">📦 Facturación y Plan</h2>
        <p className="text-gray-600">Información del plan actual y facturación</p>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Plan Actual</h3>
        <p className="text-gray-600">Esta sección estará disponible próximamente.</p>
      </Card>

      <div className="flex gap-4">
        <Button onClick={handleSave} variant="info">
          Guardar Configuración
        </Button>
      </div>
    </div>
  );
};
