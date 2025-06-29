
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  Moon, 
  Plane, 
  Heart, 
  FileText, 
  DollarSign, 
  Minus, 
  CreditCard,
  Receipt
} from 'lucide-react';

export type NovedadCategory = 
  | 'horas_extra'
  | 'recargo_nocturno'
  | 'vacaciones'
  | 'incapacidades'
  | 'licencias'
  | 'ingresos_adicionales'
  | 'deducciones'
  | 'prestamos'
  | 'retefuente';

interface NovedadTypeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (category: NovedadCategory) => void;
  employeeName: string;
}

const novedadCategories = [
  {
    id: 'horas_extra' as NovedadCategory,
    title: 'Horas Extra',
    description: 'Diurnas, nocturnas, dominicales, festivas',
    icon: Clock,
    color: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  {
    id: 'recargo_nocturno' as NovedadCategory,
    title: 'Recargos',
    description: 'Nocturno, dominical, festivo y sus combinaciones',
    icon: Moon,
    color: 'bg-purple-50 text-purple-700 border-purple-200'
  },
  {
    id: 'vacaciones' as NovedadCategory,
    title: 'Vacaciones',
    description: 'Normales, pago anticipado, días compensados',
    icon: Plane,
    color: 'bg-green-50 text-green-700 border-green-200'
  },
  {
    id: 'incapacidades' as NovedadCategory,
    title: 'Incapacidades',
    description: 'Común, laboral, maternidad',
    icon: Heart,
    color: 'bg-red-50 text-red-700 border-red-200'
  },
  {
    id: 'licencias' as NovedadCategory,
    title: 'Licencias',
    description: 'Remuneradas y no remuneradas',
    icon: FileText,
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200'
  },
  {
    id: 'ingresos_adicionales' as NovedadCategory,
    title: 'Ingresos Adicionales',
    description: 'Constitutivos y no constitutivos',
    icon: DollarSign,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  {
    id: 'deducciones' as NovedadCategory,
    title: 'Deducciones',
    description: 'Varios tipos de descuentos',
    icon: Minus,
    color: 'bg-orange-50 text-orange-700 border-orange-200'
  },
  {
    id: 'prestamos' as NovedadCategory,
    title: 'Préstamos',
    description: 'Libranzas y préstamos',
    icon: CreditCard,
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  {
    id: 'retefuente' as NovedadCategory,
    title: 'Retención en la Fuente',
    description: 'Retenciones tributarias',
    icon: Receipt,
    color: 'bg-gray-50 text-gray-700 border-gray-200'
  }
];

export const NovedadTypeSelector: React.FC<NovedadTypeSelectorProps> = ({
  isOpen,
  onClose,
  onSelectCategory,
  employeeName
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Agregar Novedad - {employeeName}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-4">
          {novedadCategories.map((category) => {
            const IconComponent = category.icon;
            return (
              <Button
                key={category.id}
                variant="outline"
                className={`h-auto p-4 flex flex-col items-start gap-2 hover:shadow-md transition-all ${category.color}`}
                onClick={() => onSelectCategory(category.id)}
              >
                <div className="flex items-center gap-2 w-full">
                  <IconComponent className="h-5 w-5" />
                  <span className="font-medium text-sm">{category.title}</span>
                </div>
                <p className="text-xs opacity-75 text-left">
                  {category.description}
                </p>
              </Button>
            );
          })}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
