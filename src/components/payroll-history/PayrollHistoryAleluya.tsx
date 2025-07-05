
/**
 * 📊 COMPONENTE ALELUYA - HISTORIAL DE NÓMINA UNIFICADO
 * Reemplaza la arquitectura fragmentada con funcionalidades profesionales
 * Incluye edición, comprobantes y períodos pasados - SIN paneles técnicos
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  History, 
  Eye, 
  Edit, 
  FileText, 
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  Users,
  DollarSign,
  Loader2
} from 'lucide-react';
import { useHistoryAleluya } from '@/hooks/useHistoryAleluya';
import { formatCurrency } from '@/lib/utils';
import { PeriodDetailModal } from './modals/PeriodDetailModal';
import { EditPeriodModal } from './modals/EditPeriodModal';
import { CreatePastPeriodModal } from './modals/CreatePastPeriodModal';

/**
 * ✨ COMPONENTE PRINCIPAL - HISTORIAL ESTILO ALELUYA
 * Funciona desde el primer acceso sin diagnósticos
 * Funcionalidades: Ver, Editar, Generar Comprobantes, Crear Pasados
 */
export const PayrollHistoryAleluya = () => {
  const {
    // Estados principales
    isLoading,
    isProcessing,
    periods,
    filteredPeriods,
    selectedPeriod,
    filters,
    
    // Acciones principales
    viewPeriodDetail,
    editPeriod,
    generateVouchers,
    createPastPeriod,
    updateFilters,
    clearFilters,
    
    // Estados calculados
    totalPeriods,
    filteredCount,
    closedPeriods,
    draftPeriods,
    hasData
  } = useHistoryAleluya();

  // Estados locales para modales
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreatePastModal, setShowCreatePastModal] = useState(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');

  // Manejar vista de detalle
  const handleViewDetail = async (periodId: string) => {
    setSelectedPeriodId(periodId);
    await viewPeriodDetail(periodId);
    setShowDetailModal(true);
  };

  // Manejar edición
  const handleEdit = (periodId: string) => {
    setSelectedPeriodId(periodId);
    setShowEditModal(true);
  };

  // Manejar generación de comprobantes
  const handleGenerateVouchers = async (periodId: string) => {
    await generateVouchers(periodId);
  };

  // Estado de carga inicial
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto" />
          <h3 className="text-lg font-medium text-gray-900">Cargando historial...</h3>
          <p className="text-gray-600">Obteniendo períodos de nómina</p>
        </div>
      </div>
    );
  }

  // Estado sin datos
  if (!hasData) {
    return (
      <div className="space-y-6">
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-xl flex items-center space-x-2">
              <History className="h-6 w-6 text-purple-600" />
              <span>Historial de Nómina</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-4">
              <div className="bg-white rounded-lg p-8 border border-purple-200">
                <History className="h-12 w-12 text-purple-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Sin historial de nómina
                </h3>
                <p className="text-gray-600 mb-6">
                  Aún no tienes períodos de nómina procesados. 
                  Puedes crear períodos pasados para migrar datos históricos.
                </p>
                
                <Button
                  onClick={() => setShowCreatePastModal(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Período Pasado
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal para crear período pasado */}
        <CreatePastPeriodModal
          isOpen={showCreatePastModal}
          onClose={() => setShowCreatePastModal(false)}
          onSubmit={createPastPeriod}
          isLoading={isProcessing}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con métricas */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <History className="h-6 w-6 text-purple-600" />
              <div>
                <CardTitle className="text-xl text-gray-900">
                  Historial de Nómina
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {filteredCount} de {totalPeriods} períodos
                </p>
              </div>
            </div>
            
            <Button
              onClick={() => setShowCreatePastModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Período Pasado
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Total Períodos */}
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Períodos</p>
                  <p className="text-xl font-bold text-gray-900">{totalPeriods}</p>
                </div>
              </div>
            </div>

            {/* Períodos Cerrados */}
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Cerrados</p>
                  <p className="text-xl font-bold text-green-600">{closedPeriods}</p>
                </div>
              </div>
            </div>

            {/* Períodos Borrador */}
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="flex items-center space-x-2">
                <Edit className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Borradores</p>
                  <p className="text-xl font-bold text-yellow-600">{draftPeriods}</p>
                </div>
              </div>
            </div>

            {/* Total Nómina */}
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Nómina</p>
                  <p className="text-xl font-bold text-purple-600">
                    {formatCurrency(filteredPeriods.reduce((sum, p) => sum + p.totalNetPay, 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar período..."
                value={filters.search}
                onChange={(e) => updateFilters({ search: e.target.value })}
                className="pl-10"
              />
            </div>

            {/* Estado */}
            <Select 
              value={filters.status} 
              onValueChange={(value) => updateFilters({ status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los estados</SelectItem>
                <SelectItem value="borrador">Borrador</SelectItem>
                <SelectItem value="cerrado">Cerrado</SelectItem>
              </SelectContent>
            </Select>

            {/* Tipo */}
            <Select 
              value={filters.type} 
              onValueChange={(value) => updateFilters({ type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo de período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los tipos</SelectItem>
                <SelectItem value="quincenal">Quincenal</SelectItem>
                <SelectItem value="mensual">Mensual</SelectItem>
                <SelectItem value="semanal">Semanal</SelectItem>
              </SelectContent>
            </Select>

            {/* Limpiar filtros */}
            <Button
              onClick={clearFilters}
              variant="outline"
              className="w-full"
            >
              Limpiar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de períodos */}
      <Card>
        <CardHeader>
          <CardTitle>Períodos de Nómina</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPeriods.map((period) => (
              <div
                key={period.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h3 className="font-semibold text-lg">{period.period}</h3>
                      <p className="text-sm text-gray-600">
                        {period.startDate} - {period.endDate} • {period.employeesCount} empleados
                      </p>
                    </div>
                    
                    <Badge 
                      variant={period.status === 'cerrado' ? 'default' : 'secondary'}
                      className={
                        period.status === 'cerrado' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {period.status === 'cerrado' ? 'Cerrado' : 'Borrador'}
                    </Badge>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-semibold text-lg">
                        {formatCurrency(period.totalNetPay)}
                      </p>
                      <p className="text-sm text-gray-600">Total neto</p>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetail(period.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(period.id)}
                        disabled={!period.editable && period.status === 'cerrado'}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerateVouchers(period.id)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredPeriods.length === 0 && (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No se encontraron períodos
              </h3>
              <p className="text-gray-600">
                Ajusta los filtros para ver más resultados
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modales */}
      <PeriodDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        periodDetail={selectedPeriod}
        isLoading={isProcessing}
      />

      <EditPeriodModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        periodId={selectedPeriodId}
        onSubmit={editPeriod}
        isLoading={isProcessing}
      />

      <CreatePastPeriodModal
        isOpen={showCreatePastModal}
        onClose={() => setShowCreatePastModal(false)}
        onSubmit={createPastPeriod}
        isLoading={isProcessing}
      />
    </div>
  );
};
