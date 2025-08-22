
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VacationsAbsencesList } from '@/components/vacations/VacationsAbsencesList';
import { VacationForm } from '@/components/vacations/VacationForm';
import { VacationStatusAuditTool } from '@/components/vacations/VacationStatusAuditTool';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Plus, Shield } from 'lucide-react';

const VacationsAbsences: React.FC = () => {
  const [activeTab, setActiveTab] = useState('list');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleFormSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    setActiveTab('list');
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vacaciones y Ausencias</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las vacaciones, licencias e incapacidades de los empleados
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Listado
          </TabsTrigger>
          <TabsTrigger value="new" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nueva Ausencia
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Auditoría de Estados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Vacaciones y Ausencias Registradas</CardTitle>
            </CardHeader>
            <CardContent>
              <VacationsAbsencesList key={refreshTrigger} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new">
          <Card>
            <CardHeader>
              <CardTitle>Registrar Nueva Ausencia</CardTitle>
            </CardHeader>
            <CardContent>
              <VacationForm onSuccess={handleFormSuccess} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <VacationStatusAuditTool />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VacationsAbsences;
