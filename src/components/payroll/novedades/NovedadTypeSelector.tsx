
import React from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Clock, DollarSign, TrendingUp, TrendingDown, Users, FileText, CreditCard, AlertTriangle, Percent } from 'lucide-react';

export type NovedadCategory = 
  | 'horas_extra' 
  | 'recargo_nocturno' 
  | 'vacaciones' 
  | 'incapacidades' 
  | 'licencias' 
  | 'bonificaciones'
  | 'ingresos_adicionales' 
  | 'deducciones_especiales'
  | 'deducciones' 
  | 'prestamos' 
  | 'retefuente';

interface NovedadTypeSelectorProps {
  onClose: () => void;
  onSelectCategory: (category: NovedadCategory) => void;
  employeeName: string;
}

const devengadosCategorias = [
  {
    id: 'horas_extra' as NovedadCategory,
    title: 'Horas Extra',
    description: 'Diurnas, nocturnas, dominicales y festivas',
    icon: Clock,
    color: 'bg-blue-500',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  {
    id: 'recargo_nocturno' as NovedadCategory,
    title: 'Recargos',
    description: 'Nocturno, dominical y festivo',
    icon: TrendingUp,
    color: 'bg-purple-500',
    textColor: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  {
    id: 'bonificaciones' as NovedadCategory,
    title: 'Bonificaciones y Auxilios',
    description: 'Salariales, no salariales, conectividad',
    icon: DollarSign,
    color: 'bg-green-500',
    textColor: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  {
    id: 'vacaciones' as NovedadCategory,
    title: 'Vacaciones',
    description: 'Período de descanso remunerado',
    icon: Users,
    color: 'bg-orange-500',
    textColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  {
    id: 'ingresos_adicionales' as NovedadCategory,
    title: 'Otros Ingresos',
    description: 'Comisiones, viáticos, retroactivos',
    icon: TrendingUp,
    color: 'bg-teal-500',
    textColor: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200'
  }
];

const deduccionesCategorias = [
  {
    id: 'incapacidades' as NovedadCategory,
    title: 'Incapacidades',
    description: 'Común y laboral', // ✅ ACTUALIZADO: Removida "maternidad"
    icon: AlertTriangle,
    color: 'bg-red-500',
    textColor: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  {
    id: 'licencias' as NovedadCategory,
    title: 'Licencias',
    description: 'Paternidad, maternidad, matrimonio, luto', // ✅ ACTUALIZADO: Agregada "maternidad"
    icon: FileText,
    color: 'bg-indigo-500',
    textColor: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200'
  },
  {
    id: 'deducciones_especiales' as NovedadCategory,
    title: 'Deducciones Especiales',
    description: 'Embargos, anticipos, aportes voluntarios',
    icon: TrendingDown,
    color: 'bg-pink-500',
    textColor: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200'
  },
  {
    id: 'prestamos' as NovedadCategory,
    title: 'Préstamos y Libranzas',
    description: 'Descuentos por préstamos',
    icon: CreditCard,
    color: 'bg-gray-500',
    textColor: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  },
  {
    id: 'retefuente' as NovedadCategory,
    title: 'Retención en la Fuente',
    description: 'Retención de impuestos',
    icon: Percent,
    color: 'bg-yellow-500',
    textColor: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  }
];

export const NovedadTypeSelector: React.FC<NovedadTypeSelectorProps> = ({
  onClose,
  onSelectCategory,
  employeeName
}) => {
  const renderCategoriesGrid = (categorias: typeof devengadosCategorias, onSelectCategoryFn: (category: NovedadCategory) => void) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {categorias.map((categoria) => {
        const IconComponent = categoria.icon;
        return (
          <button
            key={categoria.id}
            onClick={() => onSelectCategoryFn(categoria.id)}
            className={`p-4 rounded-lg border-2 transition-all hover:scale-105 hover:shadow-md ${categoria.bgColor} ${categoria.borderColor} hover:border-opacity-100 border-opacity-50`}
          >
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-lg ${categoria.color} text-white flex-shrink-0`}>
                <IconComponent className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <h4 className={`font-semibold ${categoria.textColor} mb-1`}>
                  {categoria.title}
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {categoria.description}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Seleccionar Tipo de Novedad</h3>
      </div>

      <div className="text-sm text-gray-600 mb-6">
        Selecciona el tipo de novedad que deseas agregar para <strong>{employeeName}</strong>
      </div>

      {/* Tabs System */}
      <Tabs defaultValue="devengos" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="devengos" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Devengos</span>
          </TabsTrigger>
          <TabsTrigger value="deducciones" className="flex items-center space-x-2">
            <TrendingDown className="h-4 w-4" />
            <span>Deducciones</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="devengos" className="mt-6">
          <div className="mb-4">
            <h4 className="font-medium text-green-700 mb-2">Conceptos que incrementan el salario</h4>
            <p className="text-sm text-gray-600">Selecciona los conceptos que aumentan el pago del empleado</p>
          </div>
          {renderCategoriesGrid(devengadosCategorias, onSelectCategory)}
        </TabsContent>

        <TabsContent value="deducciones" className="mt-6">
          <div className="mb-4">
            <h4 className="font-medium text-red-700 mb-2">Conceptos que reducen el salario</h4>
            <p className="text-sm text-gray-600">Selecciona los conceptos que reducen el pago del empleado</p>
          </div>
          {renderCategoriesGrid(deduccionesCategorias, onSelectCategory)}
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="flex justify-end pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </div>
  );
};
