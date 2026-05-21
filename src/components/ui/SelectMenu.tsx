"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
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
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState(288)
  const [dropdownStyle, setDropdownStyle] = useState({
    left: 0,
    top: 0,
    width: 0,
    translateY: "0%",
  })

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  )

  useEffect(() => {
    if (!open) return

    const updateDropdownLayout = () => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      const viewportPadding = 16
      const preferredHeight = 288
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding
      const spaceAbove = rect.top - viewportPadding
      const shouldOpenUp = spaceBelow < 220 && spaceAbove > spaceBelow
      const availableSpace = shouldOpenUp ? spaceAbove : spaceBelow

      setDropdownMaxHeight(Math.max(Math.min(availableSpace, preferredHeight), 160))
      setDropdownStyle({
        left: rect.left,
        top: shouldOpenUp ? rect.top - 8 : rect.bottom + 8,
        width: rect.width,
        translateY: shouldOpenUp ? "-100%" : "0%",
      })
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!containerRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    updateDropdownLayout()
    window.addEventListener("resize", updateDropdownLayout)
    window.addEventListener("scroll", updateDropdownLayout, true)

    window.addEventListener("pointerdown", handlePointerDown)
    window.addEventListener("keydown", handleEscape)

    return () => {
      window.removeEventListener("resize", updateDropdownLayout)
      window.removeEventListener("scroll", updateDropdownLayout, true)
      window.removeEventListener("pointerdown", handlePointerDown)
      window.removeEventListener("keydown", handleEscape)
    }
  }, [open])

  return (
    <>
      <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition-all",
          "hover:border-brandIndigo/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brandIndigo/25",
          "dark:border-[rgba(255,255,255,0.12)] dark:bg-[#171b2b] dark:hover:border-brandIndigo/60 dark:shadow-none",
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
            "z-[90] overflow-hidden rounded-2xl border border-gray-200 bg-white/92 shadow-2xl backdrop-blur-xl",
            "dark:border-[rgba(255,255,255,0.14)] dark:bg-[#1b2031]/92 dark:shadow-[0_24px_44px_rgba(0,0,0,0.5)]"
          )}
        >
          <div className="overflow-y-auto overscroll-contain p-2" style={{ maxHeight: dropdownMaxHeight }}>
            <button
              type="button"
              onClick={() => {
                onChange("")
                setOpen(false)
              }}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                value === ""
                  ? "bg-brandIndigo/12 text-brandIndigo dark:bg-brandIndigo/30 dark:text-white"
                  : "text-gray-600 hover:bg-gray-100 dark:text-textSecondary dark:hover:bg-[#272d45]"
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
                        : "text-gray-800 hover:bg-gray-100 dark:text-textPrimary dark:hover:bg-[#272d45]"
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
        </div>,
        document.body
      )
        : null}
    </>
  )
}
