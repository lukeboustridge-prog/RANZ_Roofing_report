"use client";

/**
 * Pending Uploads
 *
 * Shows list of photos waiting to be uploaded
 */

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Upload, Image, X, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { db } from "@/lib/offline/db";
import { photoStore } from "@/lib/offline/stores/photo-store";
import { formatBytes } from "@/lib/offline/photo-uploader";
import type { OfflinePhoto } from "@/lib/offline/types";

interface PendingUploadsProps {
  className?: string;
  maxVisible?: number;
}

export function PendingUploads({
  className,
  maxVisible = 5,
}: PendingUploadsProps) {
  const pendingPhotos = useLiveQuery(
    () => db.photos.where("syncStatus").equals("pending_upload").toArray(),
    [],
    []
  );

  const errorPhotos = useLiveQuery(
    () => db.photos.where("syncStatus").equals("error").toArray(),
    [],
    []
  );

  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  // Generate thumbnail URLs
  useEffect(() => {
    const newThumbnails: Record<string, string> = {};

    [...pendingPhotos, ...errorPhotos].forEach((photo) => {
      if (photo.thumbnailBlob) {
        newThumbnails[photo.id] = URL.createObjectURL(photo.thumbnailBlob);
      } else if (photo.blob) {
        newThumbnails[photo.id] = URL.createObjectURL(photo.blob);
      }
    });

    setThumbnails(newThumbnails);

    // Cleanup
    return () => {
      Object.values(newThumbnails).forEach(URL.revokeObjectURL);
    };
  }, [pendingPhotos, errorPhotos]);

  const totalSize = [...pendingPhotos, ...errorPhotos].reduce(
    (acc, photo) => acc + photo.fileSize,
    0
  );

  if (pendingPhotos.length === 0 && errorPhotos.length === 0) {
    return null;
  }

  return (
    <div className={cn("bg-muted/50 border rounded-lg", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4" />
          <span className="font-medium">Pending Uploads</span>
          <span className="text-sm text-muted-foreground">
            ({pendingPhotos.length + errorPhotos.length} photos, {formatBytes(totalSize)})
          </span>
        </div>
      </div>

      {/* Photo List */}
      <ScrollArea className="max-h-[300px]">
        <div className="p-2 space-y-2">
          {/* Error photos first */}
          {errorPhotos.slice(0, maxVisible).map((photo) => (
            <PhotoItem
              key={photo.id}
              photo={photo}
              thumbnail={thumbnails[photo.id]}
              hasError
            />
          ))}

          {/* Pending photos */}
          {pendingPhotos.slice(0, maxVisible).map((photo) => (
            <PhotoItem
              key={photo.id}
              photo={photo}
              thumbnail={thumbnails[photo.id]}
            />
          ))}

          {/* Show more */}
          {pendingPhotos.length + errorPhotos.length > maxVisible && (
            <div className="text-center py-2 text-sm text-muted-foreground">
              +{pendingPhotos.length + errorPhotos.length - maxVisible} more photos
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface PhotoItemProps {
  photo: OfflinePhoto;
  thumbnail?: string;
  hasError?: boolean;
}

function PhotoItem({ photo, thumbnail, hasError }: PhotoItemProps) {
  const handleRemove = async () => {
    if (confirm("Remove this photo? This cannot be undone.")) {
      await photoStore.deletePhoto(photo.id);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-2 rounded-lg",
        hasError ? "bg-red-50 border border-red-200" : "bg-background"
      )}
    >
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={photo.originalFilename}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Image className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          {photo.originalFilename}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatBytes(photo.fileSize)}
        </div>

        {/* Progress */}
        {photo.uploadProgress !== undefined && photo.uploadProgress > 0 && (
          <Progress value={photo.uploadProgress} className="h-1 mt-1" />
        )}

        {/* Error */}
        {hasError && (
          <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
            <AlertCircle className="w-3 h-3" />
            Upload failed
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {hasError && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Retry upload"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={handleRemove}
          title="Remove photo"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Compact version showing just count
 */
export function PendingUploadsCompact({ className }: { className?: string }) {
  const count = useLiveQuery(
    () => db.photos.where("syncStatus").equals("pending_upload").count(),
    [],
    0
  );

  if (count === 0) return null;

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      <Upload className="w-4 h-4 text-yellow-500" />
      <span>
        {count} photo{count > 1 ? "s" : ""} pending upload
      </span>
    </div>
  );
}

export default PendingUploads;
