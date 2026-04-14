"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "brand" | "ghost" | "subtle";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "ghost", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-[14px] font-[510] transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-[rgba(255,255,255,0.02)] text-[#e2e4e7] border border-[#24282c] hover:bg-[rgba(255,255,255,0.04)] px-4 py-2": variant === "ghost",
            "bg-[#5e6ad2] text-white hover:bg-[#828fff] px-4 py-2": variant === "brand",
            "bg-[rgba(255,255,255,0.04)] text-textSecondary px-[6px] py-[2px]": variant === "subtle"
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
