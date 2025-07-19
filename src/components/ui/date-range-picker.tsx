
import React, { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { calculateDaysBetween, formatDateForDisplay } from '@/utils/dateUtils';

interface DateRangePickerProps {
  startDate?: string;
  endDate?: string;
  onDateRangeChange: (startDate: string, endDate: string, days: number) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onDateRangeChange,
  disabled = false,
  placeholder = "Seleccionar período",
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [from, setFrom] = useState<Date | undefined>(
    startDate ? new Date(startDate) : undefined
  );
  const [to, setTo] = useState<Date | undefined>(
    endDate ? new Date(endDate) : undefined
  );

  const handleSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (!range) return;

    setFrom(range.from);
    setTo(range.to);

    // Si tenemos ambas fechas, calculamos y notificamos
    if (range.from && range.to) {
      const startDateStr = range.from.toISOString().split('T')[0];
      const endDateStr = range.to.toISOString().split('T')[0];
      const days = calculateDaysBetween(startDateStr, endDateStr);
      
      onDateRangeChange(startDateStr, endDateStr, days);
      setIsOpen(false);
    }
  };

  const displayText = () => {
    if (from && to) {
      return `${formatDateForDisplay(from.toISOString().split('T')[0])} - ${formatDateForDisplay(to.toISOString().split('T')[0])}`;
    }
    if (from) {
      return `Desde ${formatDateForDisplay(from.toISOString().split('T')[0])}`;
    }
    return placeholder;
  };

  const calculatedDays = from && to ? calculateDaysBetween(
    from.toISOString().split('T')[0], 
    to.toISOString().split('T')[0]
  ) : 0;

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !from && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayText()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={from}
            selected={{ from, to }}
            onSelect={handleSelect}
            numberOfMonths={2}
            locale={es}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
      
      {calculatedDays > 0 && (
        <div className="text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded border border-blue-200">
          <span className="font-medium text-blue-700">
            Total: {calculatedDays} días
          </span>
        </div>
      )}
    </div>
  );
};
