"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/badges/SeverityBadge";
import { ClassificationBadge } from "@/components/badges/ClassificationBadge";
import { Pencil, Trash2, MapPin, Image } from "lucide-react";
import type { DefectSeverity, DefectClass } from "@prisma/client";

interface DefectListItemProps {
  defect: {
    id: string;
    defectNumber: number;
    title: string;
    location: string;
    severity: DefectSeverity;
    classification: DefectClass;
    observation: string;
    analysis?: string | null;
    recommendation?: string | null;
    priorityLevel?: string | null;
    _count?: {
      photos: number;
    };
  };
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
}

export function DefectListItem({ defect, onEdit, onDelete, showActions = true }: DefectListItemProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-sm font-medium text-muted-foreground shrink-0">
                #{defect.defectNumber}
              </span>
              <h3 className="font-semibold text-foreground truncate">{defect.title}</h3>
              <SeverityBadge severity={defect.severity} />
              <ClassificationBadge classification={defect.classification} />
            </div>

            {/* Location */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{defect.location}</span>
              {defect._count?.photos && defect._count.photos > 0 && (
                <>
                  <span className="mx-1">|</span>
                  <Image className="h-3.5 w-3.5 shrink-0" />
                  <span>{defect._count.photos} photo{defect._count.photos > 1 ? "s" : ""}</span>
                </>
              )}
            </div>

            {/* Observation preview */}
            <p className="text-sm text-foreground line-clamp-2">{defect.observation}</p>

            {/* Recommendation if present */}
            {defect.recommendation && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                <span className="font-medium">Rec:</span> {defect.recommendation}
              </p>
            )}
          </div>

          {/* Actions */}
          {showActions && (onEdit || onDelete) && (
            <div className="flex gap-1 shrink-0">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(defect.id)}
                  className="h-8 w-8"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(defect.id)}
                  className="h-8 w-8"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
