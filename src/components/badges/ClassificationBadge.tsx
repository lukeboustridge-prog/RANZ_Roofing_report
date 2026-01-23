import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DefectClass } from "@prisma/client";

const classificationConfig: Record<DefectClass, { label: string; className: string }> = {
  MAJOR_DEFECT: {
    label: "Major Defect",
    className: "bg-red-50 text-red-600 border-red-200 hover:bg-red-50",
  },
  MINOR_DEFECT: {
    label: "Minor Defect",
    className: "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-50",
  },
  SAFETY_HAZARD: {
    label: "Safety Hazard",
    className: "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-50",
  },
  MAINTENANCE_ITEM: {
    label: "Maintenance Item",
    className: "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-50",
  },
};

interface ClassificationBadgeProps {
  classification: DefectClass;
  className?: string;
}

export function ClassificationBadge({ classification, className }: ClassificationBadgeProps) {
  const config = classificationConfig[classification];

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
