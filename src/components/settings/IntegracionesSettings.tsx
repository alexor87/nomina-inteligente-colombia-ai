import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PUCMappingEditor } from './PUCMappingEditor';
import { Plug, Calculator } from 'lucide-react';

export const IntegracionesSettings = () => {
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">🔌 Integraciones</h2>
        <p className="text-muted-foreground">APIs, software contable y configuración de cuentas</p>
      </div>

      <Tabs defaultValue="puc" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="puc" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Cuentas Contables
          </TabsTrigger>
          <TabsTrigger value="software" className="flex items-center gap-2">
            <Plug className="h-4 w-4" />
            Software Contable
          </TabsTrigger>
        </TabsList>

        <TabsContent value="puc" className="mt-6">
          <PUCMappingEditor />
        </TabsContent>

        <TabsContent value="software" className="mt-6">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Integraciones con Software Contable</h3>
            <p className="text-muted-foreground mb-4">
              Conecta tu sistema de nómina directamente con Siigo, Alegra u otro software contable para sincronizar automáticamente los asientos de nómina.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">
                🚧 Esta funcionalidad estará disponible próximamente
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
