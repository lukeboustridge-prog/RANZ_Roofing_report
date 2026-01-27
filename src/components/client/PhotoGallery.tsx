"use client";

/**
 * Photo Gallery Component
 * Grid display with lightbox for viewing photos
 */

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface Photo {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  caption?: string | null;
  photoType?: string;
}

interface PhotoGalleryProps {
  photos: Photo[];
  columns?: 2 | 3 | 4;
  allowDownload?: boolean;
  className?: string;
}

export function PhotoGallery({
  photos,
  columns = 4,
  allowDownload = false,
  className,
}: PhotoGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const openLightbox = useCallback((index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
    setIsZoomed(false);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setIsZoomed(false);
  }, []);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
    setIsZoomed(false);
  }, [photos.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
    setIsZoomed(false);
  }, [photos.length]);

  const toggleZoom = useCallback(() => {
    setIsZoomed((prev) => !prev);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          closeLightbox();
          break;
        case "ArrowLeft":
          goToPrevious();
          break;
        case "ArrowRight":
          goToNext();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [lightboxOpen, closeLightbox, goToPrevious, goToNext]);

  if (photos.length === 0) {
    return null;
  }

  const currentPhoto = photos[currentIndex];

  const columnClasses = {
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
  };

  return (
    <>
      {/* Grid */}
      <div className={cn(`grid gap-4 ${columnClasses[columns]}`, className)}>
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            onClick={() => openLightbox(index)}
            className="group relative aspect-square rounded-lg overflow-hidden bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <Image
              src={photo.thumbnailUrl || photo.url}
              alt={photo.caption || `Photo ${index + 1}`}
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {/* Caption overlay */}
            {photo.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <p className="text-white text-xs truncate">{photo.caption}</p>
              </div>
            )}
            {/* Photo type badge */}
            {photo.photoType && (
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="text-xs bg-black/50 text-white border-0">
                  {photo.photoType.replace(/_/g, " ")}
                </Badge>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxOpen && currentPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          onClick={closeLightbox}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">
                {currentIndex + 1} / {photos.length}
              </span>
              {currentPhoto.caption && (
                <span className="text-sm text-gray-300 truncate max-w-md">
                  {currentPhoto.caption}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleZoom();
                }}
                title={isZoomed ? "Zoom out" : "Zoom in"}
              >
                {isZoomed ? (
                  <ZoomOut className="h-5 w-5" />
                ) : (
                  <ZoomIn className="h-5 w-5" />
                )}
              </Button>
              {allowDownload && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(currentPhoto.url, "_blank");
                  }}
                  title="Download"
                >
                  <Download className="h-5 w-5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
                onClick={closeLightbox}
                title="Close"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Image */}
          <div
            className="flex-1 flex items-center justify-center px-16 py-4 overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={cn(
                "relative transition-transform",
                isZoomed ? "cursor-zoom-out" : "cursor-zoom-in"
              )}
              onClick={toggleZoom}
            >
              <Image
                src={currentPhoto.url}
                alt={currentPhoto.caption || `Photo ${currentIndex + 1}`}
                width={isZoomed ? 1920 : 1200}
                height={isZoomed ? 1440 : 900}
                className={cn(
                  "object-contain max-h-[80vh]",
                  isZoomed && "max-h-none"
                )}
                priority
              />
            </div>
          </div>

          {/* Navigation */}
          {photos.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 h-12 w-12"
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevious();
                }}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 h-12 w-12"
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </>
          )}

          {/* Thumbnail strip */}
          {photos.length > 1 && (
            <div className="flex justify-center gap-2 px-4 py-3 overflow-x-auto">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(index);
                    setIsZoomed(false);
                  }}
                  className={cn(
                    "relative w-16 h-16 rounded overflow-hidden flex-shrink-0 transition-all",
                    index === currentIndex
                      ? "ring-2 ring-white"
                      : "opacity-50 hover:opacity-75"
                  )}
                >
                  <Image
                    src={photo.thumbnailUrl || photo.url}
                    alt={photo.caption || `Thumbnail ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default PhotoGallery;
