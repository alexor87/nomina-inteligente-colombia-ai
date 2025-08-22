
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

interface DatePickerSingleProps {
  mode: "single"
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  onClose?: () => void
  defaultMonth?: Date
  className?: string
}

interface DatePickerRangeProps {
  mode: "range"
  selected?: DateRange
  onSelect?: (range: DateRange | undefined) => void
  onClose?: () => void
  defaultMonth?: Date
  className?: string
}

type DatePickerProps = DatePickerSingleProps | DatePickerRangeProps

export function DatePicker(props: DatePickerProps) {
  if (props.mode === "single") {
    return (
      <Calendar
        mode="single"
        defaultMonth={props.defaultMonth}
        selected={props.selected}
        onSelect={props.onSelect}
        initialFocus
        className={cn("p-3 pointer-events-auto", props.className)}
      />
    )
  }

  return (
    <Calendar
      mode="range"
      defaultMonth={props.defaultMonth}
      selected={props.selected}
      onSelect={props.onSelect}
      initialFocus
      className={cn("p-3 pointer-events-auto", props.className)}
    />
  )
}
