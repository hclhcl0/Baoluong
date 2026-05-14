import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "error" | "warning" | "outline" | "secondary";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const v = {
    default: "bg-indigo-100 text-indigo-700",
    success: "bg-emerald-100 text-emerald-700",
    error: "bg-red-100 text-red-700",
    warning: "bg-amber-100 text-amber-700",
    outline: "border border-slate-300 text-slate-600 bg-white",
    secondary: "bg-slate-100 text-slate-600",
  };
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        v[variant], className
      )}
      {...props}
    />
  );
}
export { Badge };
