"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export type SelectOption = {
  value: string
  label: string
  description?: string | null
}

type SelectMenuProps = {
  value: string
  options: SelectOption[]
  placeholder: string
  onChange: (value: string) => void
  disabled?: boolean
  emptyMessage?: string
  className?: string
}

export function SelectMenu({
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
  emptyMessage = "暂无可选项",
  className,
}: SelectMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  )

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    window.addEventListener("pointerdown", handlePointerDown)
    window.addEventListener("keydown", handleEscape)

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown)
      window.removeEventListener("keydown", handleEscape)
    }
  }, [open])

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "w-full rounded-xl border border-gray-200 bg-white/95 px-4 py-3 text-left shadow-sm transition-all",
          "hover:border-brandIndigo/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brandIndigo/25",
          "dark:border-[rgba(255,255,255,0.08)] dark:bg-[#11131a]/95 dark:hover:border-brandIndigo/60 dark:shadow-none",
          disabled && "cursor-not-allowed opacity-60"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div
              className={cn(
                "truncate text-sm font-medium",
                selectedOption
                  ? "text-gray-900 dark:text-textPrimary"
                  : "text-gray-400 dark:text-textTertiary"
              )}
            >
              {selectedOption?.label || placeholder}
            </div>
            {selectedOption?.description ? (
              <div className="mt-1 truncate text-xs text-gray-500 dark:text-textSecondary">
                {selectedOption.description}
              </div>
            ) : (
              <div className="mt-1 text-xs text-gray-400 dark:text-textTertiary">
                点按展开选择
              </div>
            )}
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-gray-400 transition-transform dark:text-textTertiary",
              open && "rotate-180"
            )}
          />
        </div>
      </button>

      {open ? (
        <div
          className={cn(
            "absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white/98 shadow-2xl backdrop-blur",
            "dark:border-[rgba(255,255,255,0.1)] dark:bg-[#0d1017]/98 dark:shadow-[0_20px_40px_rgba(0,0,0,0.35)]"
          )}
        >
          <div className="max-h-72 overflow-y-auto p-2">
            <button
              type="button"
              onClick={() => {
                onChange("")
                setOpen(false)
              }}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                value === ""
                  ? "bg-brandIndigo/10 text-brandIndigo dark:bg-brandIndigo/20 dark:text-white"
                  : "text-gray-500 hover:bg-gray-100 dark:text-textSecondary dark:hover:bg-[rgba(255,255,255,0.05)]"
              )}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{placeholder}</div>
                <div className="mt-0.5 text-xs opacity-80">不选择</div>
              </div>
              {value === "" ? <Check className="h-4 w-4 shrink-0" /> : null}
            </button>

            {options.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 dark:text-textSecondary">
                {emptyMessage}
              </div>
            ) : (
              options.map((option) => {
                const active = option.value === value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value)
                      setOpen(false)
                    }}
                    className={cn(
                      "mt-1 flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                      active
                        ? "bg-brandIndigo text-white shadow-sm"
                        : "text-gray-800 hover:bg-gray-100 dark:text-textPrimary dark:hover:bg-[rgba(255,255,255,0.05)]"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {option.label}
                      </div>
                      {option.description ? (
                        <div
                          className={cn(
                            "mt-0.5 truncate text-xs",
                            active ? "text-white/80" : "text-gray-500 dark:text-textSecondary"
                          )}
                        >
                          {option.description}
                        </div>
                      ) : null}
                    </div>
                    {active ? <Check className="h-4 w-4 shrink-0" /> : null}
                  </button>
                )
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
