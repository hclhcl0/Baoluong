import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number; // 0–100
  colorClass?: string;
}

function Progress({ className, value = 0, colorClass = "bg-indigo-600", ...props }: ProgressProps) {
  return (
    <div
      className={cn("relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200", className)}
      {...props}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-500 ease-out", colorClass)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
export { Progress };
