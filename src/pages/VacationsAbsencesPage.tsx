
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VacationAbsenceFiltersComponent } from '@/components/vacations/VacationAbsenceFilters';
import { VacationAbsenceTable } from '@/components/vacations/VacationAbsenceTable';
import { VacationAbsenceForm } from '@/components/vacations/VacationAbsenceForm';
import { VacationAbsenceDetailModal } from '@/components/vacations/VacationAbsenceDetailModal';
import { useUnifiedVacationsAbsences } from '@/hooks/useUnifiedVacationsAbsences';
import { VacationAbsence, VacationAbsenceFilters } from '@/types/vacations';
import { Plus, Calendar, Users, Clock, CheckCircle } from 'lucide-react';

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
    isDeleting
  } = useUnifiedVacationsAbsences(filters);

  console.log('📊 Vacations data:', {
    count: vacationsAbsences.length,
    isLoading,
    filters
  });

  // Estadísticas básicas
  const stats = {
    total: vacationsAbsences.length,
    pendientes: vacationsAbsences.filter(v => v.status === 'pendiente').length,
    liquidadas: vacationsAbsences.filter(v => v.status === 'liquidada').length,
    totalDays: vacationsAbsences.reduce((sum, v) => sum + v.days_count, 0)
  };

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
    if (confirm('¿Está seguro de que desea eliminar esta ausencia?')) {
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
      {/* Debug info */}
      <div className="text-xs text-muted-foreground mb-2">
        Vacaciones y Ausencias - Total: {stats.total} registros
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vacaciones y Ausencias</h1>
          <p className="text-muted-foreground">
            Gestiona las vacaciones y ausencias de los empleados
          </p>
        </div>
        <Button onClick={handleNewVacation} className="w-fit">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Ausencia
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Registros</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Registros activos
            </p>
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
              Por liquidar
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
              Procesadas
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
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Cargando vacaciones...
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
