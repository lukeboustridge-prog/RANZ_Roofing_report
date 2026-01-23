"use client";

import { cn } from "@/lib/utils";
import { Check, X, AlertTriangle, Minus } from "lucide-react";

type ComplianceStatus = "pass" | "fail" | "partial" | "na";

interface ComplianceToggleProps {
  value: ComplianceStatus | null;
  onChange: (value: ComplianceStatus) => void;
  disabled?: boolean;
  className?: string;
}

const statusConfig: Record<ComplianceStatus, { label: string; icon: React.ElementType; activeClass: string }> = {
  pass: {
    label: "Pass",
    icon: Check,
    activeClass: "bg-green-100 text-green-700 border-green-300",
  },
  fail: {
    label: "Fail",
    icon: X,
    activeClass: "bg-red-100 text-red-700 border-red-300",
  },
  partial: {
    label: "Partial",
    icon: AlertTriangle,
    activeClass: "bg-yellow-100 text-yellow-700 border-yellow-300",
  },
  na: {
    label: "N/A",
    icon: Minus,
    activeClass: "bg-slate-100 text-slate-600 border-slate-300",
  },
};

export function ComplianceToggle({ value, onChange, disabled, className }: ComplianceToggleProps) {
  const statuses: ComplianceStatus[] = ["pass", "fail", "partial", "na"];

  return (
    <div className={cn("inline-flex rounded-md border border-border", className)}>
      {statuses.map((status) => {
        const config = statusConfig[status];
        const Icon = config.icon;
        const isActive = value === status;

        return (
          <button
            key={status}
            type="button"
            disabled={disabled}
            onClick={() => onChange(status)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
              "first:rounded-l-md last:rounded-r-md",
              "border-r last:border-r-0 border-border",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isActive
                ? config.activeClass
                : "bg-background text-muted-foreground hover:bg-muted"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}
