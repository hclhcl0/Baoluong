import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive" | "success";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const v = {
      default: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
      outline: "border border-slate-300 bg-white hover:bg-slate-50 text-slate-700",
      ghost: "hover:bg-slate-100 text-slate-600",
      destructive: "bg-red-500 text-white hover:bg-red-600",
      success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
    };
    const s = {
      default: "h-10 px-4 py-2 text-sm",
      sm: "h-8 px-3 text-xs",
      lg: "h-11 px-6 text-base",
      icon: "h-9 w-9",
    };
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          v[variant], s[size], className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
export { Button };
