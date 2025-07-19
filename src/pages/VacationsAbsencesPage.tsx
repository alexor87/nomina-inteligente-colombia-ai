
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VacationAbsenceFiltersComponent } from '@/components/vacations/VacationAbsenceFilters';
import { VacationAbsenceTable } from '@/components/vacations/VacationAbsenceTable';
import { VacationAbsenceForm } from '@/components/vacations/VacationAbsenceForm';
import { VacationAbsenceDetailModal } from '@/components/vacations/VacationAbsenceDetailModal';
import { useUnifiedVacationsAbsences } from '@/hooks/useUnifiedVacationsAbsences';
import { VacationAbsence, VacationAbsenceFilters } from '@/types/vacations';
import { Plus, Calendar, Users, Clock, CheckCircle, RefreshCw, Database } from 'lucide-react';

const VacationsAbsencesPage = () => {
  const [filters, setFilters] = useState<VacationAbsenceFilters>({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingVacation, setEditingVacation] = useState<VacationAbsence | null>(null);
  const [selectedVacation, setSelectedVacation] = useState<VacationAbsence | null>(null);

  console.log('🏖️ VacationsAbsencesPage rendered');

  const {
    vacationsAbsences,
    isLoading,
    createVacationAbsence,
    updateVacationAbsence,
    deleteVacationAbsence,
    isCreating,
    isUpdating,
    isDeleting,
    getRecordOrigin,
    getUnifiedStats
  } = useUnifiedVacationsAbsences(filters);

  console.log('📊 Unified vacations data:', {
    count: vacationsAbsences.length,
    isLoading,
    filters
  });

  // Estadísticas unificadas
  const stats = getUnifiedStats();

  const handleNewVacation = () => {
    console.log('➕ Opening new vacation form');
    setEditingVacation(null);
    setIsFormOpen(true);
  };

  const handleEditVacation = (vacation: VacationAbsence) => {
    console.log('✏️ Editing vacation:', vacation.id);
    setEditingVacation(vacation);
    setIsFormOpen(true);
  };

  const handleViewVacation = (vacation: VacationAbsence) => {
    console.log('👁️ Viewing vacation:', vacation.id);
    setSelectedVacation(vacation);
    setIsDetailOpen(true);
  };

  const handleFormSubmit = async (formData: any) => {
    console.log('💾 Submitting form:', formData);
    try {
      if (editingVacation) {
        await updateVacationAbsence({
          id: editingVacation.id,
          formData
        });
      } else {
        await createVacationAbsence(formData);
      }
      setIsFormOpen(false);
      setEditingVacation(null);
    } catch (error) {
      console.error('❌ Form submission error:', error);
    }
  };

  const handleDeleteVacation = async (id: string) => {
    if (confirm('¿Está seguro de que desea eliminar esta ausencia? También se eliminará del módulo de novedades.')) {
      console.log('🗑️ Deleting vacation:', id);
      try {
        await deleteVacationAbsence(id);
      } catch (error) {
        console.error('❌ Delete error:', error);
      }
    }
  };

  const clearFilters = () => {
    console.log('🧹 Clearing filters');
    setFilters({});
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header con información de integración */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vacaciones y Ausencias</h1>
          <div className="flex items-center space-x-2 mt-1">
            <p className="text-muted-foreground">
              Gestiona las vacaciones y ausencias de los empleados
            </p>
            <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">
              <RefreshCw className="h-3 w-3 mr-1" />
              Sincronizado con Novedades
            </Badge>
          </div>
        </div>
        <Button onClick={handleNewVacation} className="w-fit">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Ausencia
        </Button>
      </div>

      {/* Estadísticas Unificadas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Registros</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
              <Badge variant="secondary" className="text-xs px-1 bg-blue-100">
                {stats.fromVacations} vacaciones
              </Badge>
              <Badge variant="secondary" className="text-xs px-1 bg-green-100">
                {stats.fromNovedades} novedades
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendientes}</div>
            <p className="text-xs text-muted-foreground">
              Por liquidar en nómina
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Liquidadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.liquidadas}</div>
            <p className="text-xs text-muted-foreground">
              Procesadas en nómina
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Días</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDays}</div>
            <p className="text-xs text-muted-foreground">
              Días acumulados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Información de Integración */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-medium text-blue-800">Integración Automática Activa</h3>
              <p className="text-blue-700 text-sm">
                Los registros creados aquí aparecen automáticamente en el módulo de novedades. 
                Solo pasan a estado "liquidada" cuando se cierre el período de nómina.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <VacationAbsenceFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
      />

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Registros de Vacaciones y Ausencias</CardTitle>
          <p className="text-sm text-muted-foreground">
            Vista unificada de registros del módulo de vacaciones y novedades
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              Cargando datos unificados...
            </div>
          ) : (
              <VacationAbsenceTable
                vacationsAbsences={vacationsAbsences}
                onView={handleViewVacation}
                onEdit={handleEditVacation}
                onDelete={handleDeleteVacation}
                isLoading={isLoading}
              />
          )}
        </CardContent>
      </Card>

      {/* Modales */}
      <VacationAbsenceForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingVacation(null);
        }}
        onSubmit={handleFormSubmit}
        editingVacation={editingVacation}
        isSubmitting={isCreating || isUpdating}
      />

      <VacationAbsenceDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedVacation(null);
        }}
        vacation={selectedVacation}
        onEdit={handleEditVacation}
        onDelete={handleDeleteVacation}
      />
    </div>
  );
};

export default VacationsAbsencesPage;
