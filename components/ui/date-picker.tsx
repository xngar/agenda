"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarDays } from "lucide-react"
import { es } from "react-day-picker/locale"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatDayKey, isValidDayKey } from "@/lib/dates"

/** Las claves `YYYY-MM-DD` son fechas de calendario, no instantes: se arman a
 * mediodía local para que ningún huso horario las corra un día. */
function dayKeyToDate(day: string): Date {
  const [year, month, date] = day.split("-").map(Number)
  return new Date(year, month - 1, date, 12)
}

export function DatePicker({
  value,
  onChange,
  id,
  "aria-label": ariaLabel,
  disabled = false,
  align = "start",
  className,
}: {
  value?: string
  onChange: (day: string) => void
  id?: string
  "aria-label"?: string
  disabled?: boolean
  align?: React.ComponentProps<typeof PopoverContent>["align"]
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const day = value && isValidDayKey(value) ? value : undefined
  const selected = day ? dayKeyToDate(day) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="ghost"
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            "group h-9 gap-1.5 rounded-lg px-2 text-sm font-normal text-neutral-800 hover:bg-transparent hover:text-action-primary focus-visible:ring-2 focus-visible:ring-brand-sky/40",
            className
          )}
        >
          <CalendarDays
            className="size-4 shrink-0 text-neutral-500 transition-transform duration-micro ease-out-soft group-hover:scale-110 group-hover:text-action-primary"
            aria-hidden="true"
          />
          <span className="tabular-nums">{day ? formatDayKey(day) : "Elegir fecha"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          locale={es}
          weekStartsOn={1}
          onSelect={(date) => {
            if (!date) return
            onChange(format(date, "yyyy-MM-dd"))
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
