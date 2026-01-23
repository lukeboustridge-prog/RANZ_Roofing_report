import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DefectSeverity } from "@prisma/client";

const severityConfig: Record<DefectSeverity, { label: string; className: string }> = {
  CRITICAL: {
    label: "Critical",
    className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
  },
  HIGH: {
    label: "High",
    className: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100",
  },
  MEDIUM: {
    label: "Medium",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100",
  },
  LOW: {
    label: "Low",
    className: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
  },
};

interface SeverityBadgeProps {
  severity: DefectSeverity;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const config = severityConfig[severity];

  return (
    <Badge className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
