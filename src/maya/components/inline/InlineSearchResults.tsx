import React from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Briefcase, DollarSign, Eye, Edit, Send, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmployeeWithStatus } from '@/types/employee-extended';

interface InlineSearchResultsProps {
  employees: EmployeeWithStatus[];
  query: string;
  onViewDetails?: (employee: EmployeeWithStatus) => void;
  onEdit?: (employee: EmployeeWithStatus) => void;
  onSendVoucher?: (employee: EmployeeWithStatus) => void;
}

export const InlineSearchResults: React.FC<InlineSearchResultsProps> = ({
  employees,
  query,
  onViewDetails,
  onEdit,
  onSendVoucher
}) => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, x: -20, scale: 0.95 },
    show: { 
      opacity: 1, 
      x: 0, 
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 24
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const getStatusColor = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'activo': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'inactivo': return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      case 'vacaciones': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  if (employees.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="my-4"
      >
        <Card className="p-6 bg-gradient-to-br from-background to-muted/20 border-border/50">
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
              <User className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-lg font-medium text-foreground/80">
                No se encontraron empleados
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                No hay resultados para "{query}"
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="my-4 space-y-3"
    >
      {/* Header con contador */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <TrendingUp className="w-4 h-4" />
        <span className="font-medium">
          {employees.length} {employees.length === 1 ? 'resultado' : 'resultados'} para "{query}"
        </span>
      </motion.div>

      {/* Resultados */}
      {employees.map((employee) => (
        <motion.div key={employee.id} variants={item}>
          <Card className="group overflow-hidden border-border/50 bg-gradient-to-br from-card to-card/50 hover:shadow-lg transition-all duration-300">
            <div className="p-4">
              {/* Header del empleado */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Avatar */}
                  <motion.div 
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 border-2 border-primary/10"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <User className="w-6 h-6 text-primary" />
                  </motion.div>
                  
                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-base truncate">
                      {employee.nombre} {employee.apellido}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge 
                        variant="outline" 
                        className={`text-xs px-2 py-0 ${getStatusColor(employee.estado)}`}
                      >
                        {employee.estado}
                      </Badge>
                      {employee.cargo && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <Briefcase className="w-3 h-3" />
                          {employee.cargo}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Salario destacado */}
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-muted-foreground">Salario</div>
                  <div className="text-lg font-bold text-primary">
                    {formatCurrency(employee.salarioBase)}
                  </div>
                </div>
              </div>

              {/* Información adicional */}
              <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                {employee.cedula && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <User className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{employee.cedula}</span>
                  </div>
                )}
                {employee.email && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{employee.email}</span>
                  </div>
                )}
              </div>

              {/* Acciones rápidas */}
              <div className="flex gap-2 pt-3 border-t border-border/30">
                {onViewDetails && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5 text-xs h-8 bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all duration-200"
                    onClick={() => onViewDetails(employee)}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Ver detalles
                  </Button>
                )}
                {onEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5 text-xs h-8 bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all duration-200"
                    onClick={() => onEdit(employee)}
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Editar
                  </Button>
                )}
                {onSendVoucher && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5 text-xs h-8 bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all duration-200"
                    onClick={() => onSendVoucher(employee)}
                  >
                    <Send className="w-3.5 h-3.5" />
                    Comprobante
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
};
