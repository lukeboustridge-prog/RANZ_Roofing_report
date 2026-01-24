"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConditionBadge } from "@/components/badges/ConditionBadge";
import { Pencil, Trash2, MapPin, Layers } from "lucide-react";
import type { ConditionRating, ElementType } from "@prisma/client";

const elementTypeLabels: Record<ElementType, string> = {
  ROOF_CLADDING: "Roof Cladding",
  RIDGE: "Ridge",
  VALLEY: "Valley",
  HIP: "Hip",
  BARGE: "Barge",
  FASCIA: "Fascia",
  GUTTER: "Gutter",
  DOWNPIPE: "Downpipe",
  FLASHING_WALL: "Wall Flashing",
  FLASHING_PENETRATION: "Penetration Flashing",
  FLASHING_PARAPET: "Parapet Flashing",
  SKYLIGHT: "Skylight",
  VENT: "Vent",
  ANTENNA_MOUNT: "Antenna Mount",
  SOLAR_PANEL: "Solar Panel",
  UNDERLAY: "Underlay",
  INSULATION: "Insulation",
  ROOF_STRUCTURE: "Roof Structure",
  OTHER: "Other",
};

interface ElementListItemProps {
  element: {
    id: string;
    elementType: ElementType;
    location: string;
    material?: string | null;
    claddingType?: string | null;
    manufacturer?: string | null;
    pitch?: number | null;
    area?: number | null;
    conditionRating?: ConditionRating | null;
    conditionNotes?: string | null;
  };
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
}

export function ElementListItem({ element, onEdit, onDelete, showActions = true }: ElementListItemProps) {
  const typeLabel = elementTypeLabels[element.elementType] || element.elementType;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
              <h3 className="font-semibold text-foreground">{typeLabel}</h3>
              {element.conditionRating && (
                <ConditionBadge condition={element.conditionRating} />
              )}
            </div>

            {/* Location */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{element.location}</span>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {element.material && (
                <div>
                  <span className="text-muted-foreground">Material:</span>{" "}
                  <span className="text-foreground">{element.material}</span>
                </div>
              )}
              {element.claddingType && (
                <div>
                  <span className="text-muted-foreground">Type:</span>{" "}
                  <span className="text-foreground">{element.claddingType}</span>
                </div>
              )}
              {element.pitch != null && (
                <div>
                  <span className="text-muted-foreground">Pitch:</span>{" "}
                  <span className="text-foreground">{element.pitch}&deg;</span>
                </div>
              )}
              {element.area != null && (
                <div>
                  <span className="text-muted-foreground">Area:</span>{" "}
                  <span className="text-foreground">{element.area} m&sup2;</span>
                </div>
              )}
            </div>

            {/* Condition notes */}
            {element.conditionNotes && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {element.conditionNotes}
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
                  onClick={() => onEdit(element.id)}
                  className="h-8 w-8"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(element.id)}
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
