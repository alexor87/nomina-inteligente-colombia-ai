import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PUCMappingEditor } from './PUCMappingEditor';
import { AccountingSoftwareWizard } from './AccountingSoftwareWizard';
import { Plug, Calculator } from 'lucide-react';

export const IntegracionesSettings = () => {
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
          <AccountingSoftwareWizard />
        </TabsContent>
      </Tabs>
    </div>
  );
};
