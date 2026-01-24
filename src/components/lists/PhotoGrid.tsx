"use client";

import Image from "next/image";
import { Plus, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Photo {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  caption?: string | null;
}

interface PhotoGridProps {
  photos: Photo[];
  onAddClick?: () => void;
  onRemoveClick?: (photoId: string) => void;
  onPhotoClick?: (photo: Photo) => void;
  maxDisplay?: number;
  showAddButton?: boolean;
  className?: string;
}

export function PhotoGrid({
  photos,
  onAddClick,
  onRemoveClick,
  onPhotoClick,
  maxDisplay = 6,
  showAddButton = true,
  className,
}: PhotoGridProps) {
  const displayPhotos = photos.slice(0, maxDisplay);
  const remainingCount = photos.length - maxDisplay;

  return (
    <div
      className={cn("grid grid-cols-2 gap-2", className)}
      role="list"
      aria-label={`Photo gallery with ${photos.length} photos`}
    >
      {displayPhotos.map((photo, index) => (
        <div
          key={photo.id}
          role="listitem"
          className="relative aspect-square rounded-lg overflow-hidden bg-muted group cursor-pointer focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
          onClick={() => onPhotoClick?.(photo)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onPhotoClick?.(photo);
            }
          }}
          tabIndex={0}
          aria-label={photo.caption || `Photo ${index + 1}`}
        >
          <Image
            src={photo.thumbnailUrl || photo.url}
            alt={photo.caption || `Photo ${index + 1}`}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform group-hover:scale-105"
            loading={index < 4 ? "eager" : "lazy"}
          />
          {onRemoveClick && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveClick(photo.id);
              }}
              className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-black/70"
              aria-label={`Remove photo ${photo.caption || index + 1}`}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
          {photo.caption && (
            <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/60 to-transparent">
              <p className="text-xs text-white truncate">{photo.caption}</p>
            </div>
          )}
        </div>
      ))}

      {/* Show remaining count overlay on last visible photo */}
      {remainingCount > 0 && displayPhotos.length > 0 && (
        <div
          className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold text-lg"
          style={{
            gridColumn: `${displayPhotos.length}`,
            gridRow: Math.ceil(displayPhotos.length / 2),
          }}
        >
          +{remainingCount}
        </div>
      )}

      {/* Add button */}
      {showAddButton && onAddClick && (
        <button
          type="button"
          onClick={onAddClick}
          className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
          aria-label="Add new photo"
        >
          <Plus className="h-6 w-6" aria-hidden="true" />
          <span className="text-xs font-medium">Add Photo</span>
        </button>
      )}

      {/* Empty state */}
      {photos.length === 0 && !showAddButton && (
        <div
          className="col-span-2 py-8 flex flex-col items-center justify-center text-muted-foreground"
          role="status"
          aria-label="No photos available"
        >
          <ImageIcon className="h-8 w-8 mb-2" aria-hidden="true" />
          <p className="text-sm">No photos</p>
        </div>
      )}
    </div>
  );
}
