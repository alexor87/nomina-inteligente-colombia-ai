
/**
 * 👁️ MODAL DE DETALLE DE PERÍODO - ALELUYA
 * Vista profesional completa de un período específico
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  Users,
  DollarSign,
  Calculator,
  Building,
  Loader2
} from 'lucide-react';
import { PeriodDetail } from '@/services/HistoryServiceAleluya';
import { formatCurrency } from '@/lib/utils';

interface PeriodDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodDetail: PeriodDetail | null;
  isLoading: boolean;
}

export const PeriodDetailModal: React.FC<PeriodDetailModalProps> = ({
  isOpen,
  onClose,
  periodDetail,
  isLoading
}) => {
  if (!periodDetail && !isLoading) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Detalle del Período de Nómina
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-gray-600">Cargando detalle del período...</p>
            </div>
          </div>
        ) : periodDetail ? (
          <div className="space-y-6">
            {/* Información del período */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Información del Período</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      {periodDetail.period.period}
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Fecha inicio:</strong> {periodDetail.period.startDate}</p>
                      <p><strong>Fecha fin:</strong> {periodDetail.period.endDate}</p>
                      <p><strong>Tipo:</strong> {periodDetail.period.type}</p>
                      <p><strong>Empleados:</strong> {periodDetail.period.employeesCount}</p>
                    </div>
                  </div>
                  <div className="flex items-start justify-end">
                    <Badge 
                      variant={periodDetail.period.status === 'cerrado' ? 'default' : 'secondary'}
                      className={
                        periodDetail.period.status === 'cerrado' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {periodDetail.period.status === 'cerrado' ? 'Cerrado' : 'Borrador'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resumen financiero */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5" />
                  <span>Resumen Financiero</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center space-x-2">
                      <Calculator className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Devengado</p>
                        <p className="text-xl font-bold text-blue-600">
                          {formatCurrency(periodDetail.summary.totalDevengado)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <div className="flex items-center space-x-2">
                      <Building className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Deducciones</p>
                        <p className="text-xl font-bold text-red-600">
                          {formatCurrency(periodDetail.summary.totalDeducciones)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Neto</p>
                        <p className="text-xl font-bold text-green-600">
                          {formatCurrency(periodDetail.summary.totalNeto)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Costo Total para la Empresa:</span>
                    <span className="text-xl font-bold text-purple-600">
                      {formatCurrency(periodDetail.summary.costoTotal)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Incluye aportes patronales: {formatCurrency(periodDetail.summary.aportesEmpleador)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Lista de empleados */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Empleados del Período ({periodDetail.employees.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-60 overflow-y-auto">
                  <div className="space-y-2">
                    {periodDetail.employees.map((employee) => (
                      <div
                        key={employee.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-sm text-gray-600">{employee.position}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {formatCurrency(employee.netPay)}
                          </p>
                          <p className="text-sm text-gray-600">
                            Bruto: {formatCurrency(employee.grossPay)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">No se pudo cargar el detalle del período</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
