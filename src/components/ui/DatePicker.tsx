"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

type DatePickerProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"]

function parseYmd(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])

  const date = new Date(year, month, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

function formatYmd(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatDisplay(value: string) {
  const date = parseYmd(value)
  if (!date) return ""
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}/${month}/${day}`
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function DatePicker({
  value,
  onChange,
  placeholder = "请选择日期",
  disabled = false,
  className,
}: DatePickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [manualInput, setManualInput] = useState(value)
  const [manualError, setManualError] = useState("")
  const [viewMonth, setViewMonth] = useState(() => parseYmd(value) || new Date())
  const [dropdownStyle, setDropdownStyle] = useState({
    left: 0,
    top: 0,
    width: 0,
    translateY: "0%",
  })

  const selectedDate = useMemo(() => parseYmd(value), [value])
  const today = useMemo(() => new Date(), [])

  useEffect(() => {
    setManualInput(value)
    if (selectedDate) {
      setViewMonth(selectedDate)
    }
  }, [value, selectedDate])

  useEffect(() => {
    if (!open) return

    const updateDirection = () => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const viewportPadding = 16
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding
      const spaceAbove = rect.top - viewportPadding
      const shouldOpenUp = spaceBelow < 360 && spaceAbove > spaceBelow
      setDropdownStyle({
        left: rect.left,
        top: shouldOpenUp ? rect.top - 8 : rect.bottom + 8,
        width: rect.width,
        translateY: shouldOpenUp ? "-100%" : "0%",
      })
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!containerRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false)
        setManualError("")
      }
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        setManualError("")
      }
    }

    updateDirection()
    window.addEventListener("resize", updateDirection)
    window.addEventListener("scroll", updateDirection, true)
    window.addEventListener("pointerdown", onPointerDown)
    window.addEventListener("keydown", onEscape)

    return () => {
      window.removeEventListener("resize", updateDirection)
      window.removeEventListener("scroll", updateDirection, true)
      window.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("keydown", onEscape)
    }
  }, [open])

  const monthDays = useMemo(() => {
    const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
    const firstWeekday = (firstOfMonth.getDay() + 6) % 7
    const gridStart = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1 - firstWeekday)
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart)
      date.setDate(gridStart.getDate() + index)
      return date
    })
  }, [viewMonth])

  const applyManualInput = () => {
    const parsed = parseYmd(manualInput)
    if (!parsed) {
      setManualError("日期格式需为 YYYY-MM-DD")
      return
    }

    const next = formatYmd(parsed)
    onChange(next)
    setViewMonth(parsed)
    setManualError("")
    setOpen(false)
  }

  return (
    <>
      <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition-all",
          "hover:border-brandIndigo/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brandIndigo/25",
          "dark:border-[rgba(255,255,255,0.12)] dark:bg-[#171b2b] dark:hover:border-brandIndigo/60",
          disabled && "cursor-not-allowed opacity-60"
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-gray-400 dark:text-textTertiary" />
            <div
              className={cn(
                "truncate text-sm font-medium",
                selectedDate ? "text-gray-900 dark:text-textPrimary" : "text-gray-400 dark:text-textTertiary"
              )}
            >
              {selectedDate ? formatDisplay(value) : placeholder}
            </div>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-gray-400 transition-transform dark:text-textTertiary",
              open && "rotate-180"
            )}
          />
        </div>
      </button>
      </div>

      {open && typeof document !== "undefined"
        ? createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            left: dropdownStyle.left,
            top: dropdownStyle.top,
            width: dropdownStyle.width,
            transform: `translateY(${dropdownStyle.translateY})`,
          }}
          className={cn(
            "z-[95] overflow-hidden rounded-2xl border border-gray-200 bg-white/90 shadow-2xl backdrop-blur-xl",
            "dark:border-[rgba(255,255,255,0.14)] dark:bg-[#1b2031]/90 dark:shadow-[0_24px_44px_rgba(0,0,0,0.5)]"
          )}
        >
          <div className="p-3">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-brandIndigo/50 hover:text-brandIndigo dark:border-[rgba(255,255,255,0.15)] dark:bg-[#232940] dark:text-textSecondary"
                aria-label="上个月"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-sm font-semibold text-gray-900 dark:text-textPrimary">
                {viewMonth.getFullYear()} 年 {viewMonth.getMonth() + 1} 月
              </div>
              <button
                type="button"
                onClick={() => {
                  setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-brandIndigo/50 hover:text-brandIndigo dark:border-[rgba(255,255,255,0.15)] dark:bg-[#232940] dark:text-textSecondary"
                aria-label="下个月"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="py-1 text-center text-[11px] text-gray-500 dark:text-textTertiary">
                  {label}
                </div>
              ))}
              {monthDays.map((day) => {
                const inCurrentMonth = day.getMonth() === viewMonth.getMonth()
                const active = selectedDate ? isSameDay(day, selectedDate) : false
                const isToday = isSameDay(day, today)

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => {
                      onChange(formatYmd(day))
                      setManualInput(formatYmd(day))
                      setOpen(false)
                      setManualError("")
                    }}
                    className={cn(
                      "h-9 rounded-lg text-sm transition-colors",
                      active
                        ? "bg-brandIndigo text-white shadow-sm"
                        : inCurrentMonth
                          ? "text-gray-800 hover:bg-gray-100 dark:text-textPrimary dark:hover:bg-[#272d45]"
                          : "text-gray-400 hover:bg-gray-100/80 dark:text-textTertiary dark:hover:bg-[#21263b]",
                      isToday && !active && "border border-brandIndigo/40"
                    )}
                  >
                    {day.getDate()}
                  </button>
                )
              })}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const now = new Date()
                  const next = formatYmd(now)
                  onChange(next)
                  setViewMonth(now)
                  setManualInput(next)
                  setOpen(false)
                  setManualError("")
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 transition hover:border-brandIndigo/50 hover:text-brandIndigo dark:border-[rgba(255,255,255,0.15)] dark:bg-[#232940] dark:text-textSecondary"
              >
                今天
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange("")
                  setManualInput("")
                  setManualError("")
                  setOpen(false)
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 transition hover:border-brandIndigo/50 hover:text-brandIndigo dark:border-[rgba(255,255,255,0.15)] dark:bg-[#232940] dark:text-textSecondary"
              >
                清空
              </button>
            </div>

            <div className="mt-3 border-t border-gray-200/80 pt-3 dark:border-white/10">
              <div className="mb-1 text-[11px] text-gray-500 dark:text-textTertiary">手动输入（YYYY-MM-DD）</div>
              <div className="flex items-center gap-2">
                <input
                  value={manualInput}
                  onChange={(event) => {
                    setManualInput(event.target.value)
                    if (manualError) setManualError("")
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      applyManualInput()
                    }
                  }}
                  placeholder="2026-12-31"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-brandIndigo/60 dark:border-white/10 dark:bg-[#232940] dark:text-textPrimary"
                />
                <button
                  type="button"
                  onClick={applyManualInput}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-brandIndigo px-3 text-white transition hover:brightness-110"
                  aria-label="应用日期"
                >
                  <Check className="h-4 w-4" />
                </button>
              </div>
              {manualError ? (
                <div className="mt-1 text-[11px] text-red-500">{manualError}</div>
              ) : null}
            </div>
          </div>
        </div>,
        document.body
      )
        : null}
    </>
  )
}
