import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Calculator, BarChart3, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const quickActions = [
  { icon: Users, label: 'Empleados', href: '/modules/employees' },
  { icon: Calculator, label: 'Nómina', href: '/modules/payroll' },
  { icon: BarChart3, label: 'Reportes', href: '/modules/reports' },
  { icon: Settings, label: 'Configuración', href: '/modules/settings' },
];

export const MayaQuickActions: React.FC = () => {
  return (
    <TooltipProvider>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-30"
      >
        <div className="bg-background/80 backdrop-blur-lg border border-border rounded-full shadow-xl p-2 flex gap-2">
          {quickActions.map((action) => (
            <Tooltip key={action.label}>
              <TooltipTrigger asChild>
                <Link to={action.href}>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-12 h-12 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
                  >
                    <action.icon className="h-5 w-5 text-primary" />
                  </motion.button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{action.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </motion.div>
    </TooltipProvider>
  );
};
