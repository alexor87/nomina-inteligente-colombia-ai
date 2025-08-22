
import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  mode?: "single" | "range"
  selected?: Date | DateRange
  onSelect?: (date: Date | DateRange | undefined) => void
  onClose?: () => void
  defaultMonth?: Date
  className?: string
}

export function DatePicker({
  mode = "single",
  selected,
  onSelect,
  onClose,
  defaultMonth,
  className
}: DatePickerProps) {
  return (
    <Calendar
      mode={mode}
      defaultMonth={defaultMonth}
      selected={selected}
      onSelect={onSelect}
      initialFocus
      className={cn("p-3 pointer-events-auto", className)}
    />
  )
}
