import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ConditionRating } from "@prisma/client";

const conditionConfig: Record<ConditionRating, { label: string; className: string }> = {
  GOOD: {
    label: "Good",
    className: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
  },
  FAIR: {
    label: "Fair",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100",
  },
  POOR: {
    label: "Poor",
    className: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100",
  },
  CRITICAL: {
    label: "Critical",
    className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
  },
  NOT_INSPECTED: {
    label: "Not Inspected",
    className: "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100",
  },
};

interface ConditionBadgeProps {
  condition: ConditionRating;
  className?: string;
}

export function ConditionBadge({ condition, className }: ConditionBadgeProps) {
  const config = conditionConfig[condition];

  return (
    <Badge className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
