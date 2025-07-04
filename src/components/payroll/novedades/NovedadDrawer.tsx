
import React, { useState } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle 
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Clock, 
  Heart, 
  Plane, 
  FileText, 
  DollarSign, 
  Minus,
  Calendar,
  User
} from 'lucide-react';
import { PayrollEmployee } from '@/types/payroll';
import { NovedadUnifiedModal } from './NovedadUnifiedModal';

interface NovedadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  employee: PayrollEmployee | null;
  period: any;
  onNovedadCreated?: () => void;
}

const novedadTypes = [
  {
    id: 'horas_extra',
    label: 'Horas Extra',
    icon: Clock,
    color: 'blue',
    description: 'Horas extra diurnas, nocturnas, dominicales y festivas'
  },
  {
    id: 'incapacidad',
    label: 'Incapacidades',
    icon: Heart,
    color: 'red',
    description: 'Incapacidades médicas, laborales y de maternidad'
  },
  {
    id: 'vacaciones',
    label: 'Vacaciones',
    icon: Plane,
    color: 'green',
    description: 'Vacaciones disfrutadas, compensadas o anticipadas'
  },
  {
    id: 'licencias',
    label: 'Licencias',
    icon: FileText,
    color: 'purple',
    description: 'Licencias remuneradas y no remuneradas'
  },
  {
    id: 'bonificaciones',
    label: 'Bonificaciones',
    icon: DollarSign,
    color: 'yellow',
    description: 'Bonificaciones salariales y no salariales'
  },
  {
    id: 'deducciones',
    label: 'Deducciones',
    icon: Minus,
    color: 'orange',
    description: 'Descuentos, multas y otras deducciones'
  },
  {
    id: 'ingresos_adicionales',
    label: 'Ingresos Adicionales',
    icon: Plus,
    color: 'indigo',
    description: 'Comisiones, primas y otros ingresos'
  },
  {
    id: 'recargos',
    label: 'Recargos',
    icon: Calendar,
    color: 'pink',
    description: 'Recargos nocturnos, dominicales y festivos'
  }
];

const colorClasses = {
  blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  red: 'bg-red-100 text-red-700 hover:bg-red-200',
  green: 'bg-green-100 text-green-700 hover:bg-green-200',
  purple: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
  yellow: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
  orange: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
  indigo: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200',
  pink: 'bg-pink-100 text-pink-700 hover:bg-pink-200'
};

export const NovedadDrawer: React.FC<NovedadDrawerProps> = ({
  isOpen,
  onClose,
  employee,
  period,
  onNovedadCreated
}) => {
  const [selectedNovedadType, setSelectedNovedadType] = useState<string | null>(null);
  const [showNovedadModal, setShowNovedadModal] = useState(false);

  const handleNovedadTypeSelect = (type: string) => {
    setSelectedNovedadType(type);
    setShowNovedadModal(true);
  };

  const handleNovedadCreated = (novedadData: any) => {
    console.log('Novedad creada:', novedadData);
    setShowNovedadModal(false);
    setSelectedNovedadType(null);
    if (onNovedadCreated) {
      onNovedadCreated();
    }
  };

  const handleCloseNovedadModal = () => {
    setShowNovedadModal(false);
    setSelectedNovedadType(null);
  };

  if (!employee) {
    return null;
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Novedades - {employee.name}
            </SheetTitle>
            <SheetDescription>
              Gestiona las novedades de nómina para este empleado en el período {period?.periodo}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Información del Empleado */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Cargo:</span>
                  <span className="text-sm text-gray-900">{employee.position}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Salario Base:</span>
                  <span className="text-sm text-gray-900">
                    {new Intl.NumberFormat('es-CO', {
                      style: 'currency',
                      currency: 'COP',
                      minimumFractionDigits: 0
                    }).format(employee.baseSalary)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Estado:</span>
                  <Badge variant={employee.status === 'valid' ? 'default' : 'secondary'}>
                    {employee.status === 'valid' ? 'Válido' : 'Pendiente'}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Tipos de Novedades */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Agregar Novedad</h3>
              <div className="grid gap-3">
                {novedadTypes.map((tipo) => {
                  const IconComponent = tipo.icon;
                  return (
                    <Button
                      key={tipo.id}
                      variant="ghost"
                      className={`p-4 h-auto justify-start space-x-3 ${colorClasses[tipo.color]}`}
                      onClick={() => handleNovedadTypeSelect(tipo.id)}
                    >
                      <IconComponent className="h-5 w-5 flex-shrink-0" />
                      <div className="text-left">
                        <div className="font-medium">{tipo.label}</div>
                        <div className="text-xs opacity-80">{tipo.description}</div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Novedades Existentes */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Novedades Actuales</h3>
              <div className="space-y-2">
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-blue-900">Ejemplo: Horas Extra</span>
                      <div className="text-sm text-blue-700">10 horas × 125% = $50,000</div>
                    </div>
                    <Badge variant="outline" className="text-blue-700 border-blue-300">
                      Aplicada
                    </Badge>
                  </div>
                </div>
                
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay novedades registradas para este período</p>
                  <p className="text-xs mt-1">Selecciona un tipo de novedad arriba para comenzar</p>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Modal Unificado de Novedades */}
      <NovedadUnifiedModal
        isOpen={showNovedadModal}
        onClose={handleCloseNovedadModal}
        employeeName={employee.name}
        employeeId={employee.id}
        employeeSalary={employee.baseSalary}
        periodId={period?.id || ''}
        initialNovedadType={selectedNovedadType}
        onCreateNovedad={handleNovedadCreated}
      />
    </>
  );
};
