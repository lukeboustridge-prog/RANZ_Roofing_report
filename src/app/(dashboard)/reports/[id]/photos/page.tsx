"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Upload,
  Camera,
  Loader2,
  Trash2,
  X,
  MapPin,
  Clock,
  Pencil,
  AlertTriangle,
  Link as LinkIcon,
  Maximize2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const PHOTO_TYPES = [
  { value: "OVERVIEW", label: "Overview" },
  { value: "CONTEXT", label: "Context" },
  { value: "DETAIL", label: "Detail" },
  { value: "SCALE_REFERENCE", label: "Scale Reference" },
  { value: "GENERAL", label: "General" },
];

interface Photo {
  id: string;
  filename: string;
  originalFilename: string;
  url: string;
  thumbnailUrl: string | null;
  annotatedUrl: string | null;
  isEdited: boolean;
  photoType: string;
  caption: string | null;
  capturedAt: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  cameraMake: string | null;
  cameraModel: string | null;
  sortOrder: number;
  createdAt: string;
  defectId: string | null;
  roofElementId: string | null;
}

interface Defect {
  id: string;
  defectNumber: number;
  title: string;
}

export default function PhotosPage() {
  const params = useParams();
  const reportId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [uploadType, setUploadType] = useState("GENERAL");
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);

  // Get the display URL for a photo (annotated version if available)
  const getDisplayUrl = (photo: Photo) => {
    return photo.annotatedUrl || photo.url;
  };

  // Get thumbnail or display URL for grid
  const getGridUrl = (photo: Photo) => {
    return photo.thumbnailUrl || photo.annotatedUrl || photo.url;
  };

  // Navigate to next/previous photo in lightbox
  const navigateLightbox = (direction: "prev" | "next") => {
    if (!lightboxPhoto) return;
    const currentIndex = photos.findIndex(p => p.id === lightboxPhoto.id);
    if (currentIndex === -1) return;

    const newIndex = direction === "prev"
      ? (currentIndex - 1 + photos.length) % photos.length
      : (currentIndex + 1) % photos.length;
    setLightboxPhoto(photos[newIndex]);
  };

  useEffect(() => {
    fetchPhotos();
    fetchDefects();
  }, [reportId]);

  const fetchDefects = async () => {
    try {
      const response = await fetch(`/api/defects?reportId=${reportId}`);
      if (response.ok) {
        const data = await response.json();
        setDefects(data);
      }
    } catch {
      // Ignore errors fetching defects
    }
  };

  const fetchPhotos = async () => {
    try {
      const response = await fetch(`/api/photos?reportId=${reportId}`);
      if (!response.ok) throw new Error("Failed to fetch photos");
      const data = await response.json();
      setPhotos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError("");

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("metadata", JSON.stringify({
          reportId,
          photoType: uploadType,
        }));

        const response = await fetch("/api/photos", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to upload photo");
        }
      }

      await fetchPhotos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photos");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!confirm("Are you sure you want to delete this photo?")) return;

    try {
      const response = await fetch(`/api/photos/${photoId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete photo");
      await fetchPhotos();
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Unknown";
    return new Date(dateStr).toLocaleString();
  };

  const handleLinkToDefect = async (photoId: string, defectId: string | null) => {
    setLinking(true);
    try {
      const response = await fetch(`/api/photos/${photoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defectId }),
      });

      if (!response.ok) {
        throw new Error("Failed to update photo");
      }

      const updatedPhoto = await response.json();
      setPhotos(photos.map(p => p.id === photoId ? updatedPhoto : p));
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto(updatedPhoto);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link photo");
    } finally {
      setLinking(false);
    }
  };

  const getDefectForPhoto = (defectId: string | null) => {
    if (!defectId) return null;
    return defects.find(d => d.id === defectId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Link
            href={`/reports/${reportId}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Report
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Photos</h1>
          <p className="text-muted-foreground">
            Upload and manage inspection photos.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}

      {/* Upload section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Photos</CardTitle>
          <CardDescription>
            Select photos from your device. EXIF metadata (GPS, timestamp) will
            be extracted automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="photoType">Photo Type</Label>
              <NativeSelect
                id="photoType"
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
              >
                {PHOTO_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {uploading ? "Uploading..." : "Select Photos"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photo grid and detail view */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Photo grid */}
        <div className="lg:col-span-2">
          {photos.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Camera className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No photos yet</h3>
                  <p className="mt-2 text-muted-foreground">
                    Upload photos from your inspection.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                    selectedPhoto?.id === photo.id
                      ? "border-[var(--ranz-blue-500)] ring-2 ring-[var(--ranz-blue-500)]/20"
                      : "border-transparent hover:border-muted-foreground/20"
                  }`}
                >
                  {getGridUrl(photo) ? (
                    <Image
                      src={getGridUrl(photo)}
                      alt={photo.caption || photo.originalFilename}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Camera className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <div className="flex items-center gap-1 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {photo.photoType.replace("_", " ")}
                      </Badge>
                      {photo.isEdited && (
                        <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-200 border-blue-400/50">
                          <Pencil className="h-3 w-3 mr-0.5" />
                          Annotated
                        </Badge>
                      )}
                      {photo.defectId && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-0.5" />
                          Defect
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Photo details panel */}
        <div className="lg:col-span-1">
          {selectedPhoto ? (
            <Card className="sticky top-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Photo Details</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedPhoto(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Preview */}
                <div
                  className="relative aspect-video rounded-lg overflow-hidden bg-muted cursor-pointer group"
                  onClick={() => setLightboxPhoto(selectedPhoto)}
                >
                  {getDisplayUrl(selectedPhoto) ? (
                    <>
                      <Image
                        src={getDisplayUrl(selectedPhoto)}
                        alt={selectedPhoto.caption || selectedPhoto.originalFilename}
                        fill
                        className="object-contain"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                {selectedPhoto.isEdited && (
                  <p className="text-xs text-blue-600 flex items-center gap-1">
                    <Pencil className="h-3 w-3" />
                    This photo has been annotated
                  </p>
                )}

                {/* Metadata */}
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Filename</p>
                    <p className="font-medium truncate">
                      {selectedPhoto.originalFilename}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <Badge>{selectedPhoto.photoType.replace("_", " ")}</Badge>
                  </div>

                  {selectedPhoto.capturedAt && (
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-muted-foreground">Captured</p>
                        <p className="font-medium">
                          {formatDate(selectedPhoto.capturedAt)}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedPhoto.gpsLat && selectedPhoto.gpsLng && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-muted-foreground">Location</p>
                        <p className="font-medium">
                          {selectedPhoto.gpsLat.toFixed(6)},{" "}
                          {selectedPhoto.gpsLng.toFixed(6)}
                        </p>
                      </div>
                    </div>
                  )}

                  {(selectedPhoto.cameraMake || selectedPhoto.cameraModel) && (
                    <div>
                      <p className="text-muted-foreground">Camera</p>
                      <p className="font-medium">
                        {[selectedPhoto.cameraMake, selectedPhoto.cameraModel]
                          .filter(Boolean)
                          .join(" ")}
                      </p>
                    </div>
                  )}

                  {selectedPhoto.caption && (
                    <div>
                      <p className="text-muted-foreground">Caption</p>
                      <p className="font-medium">{selectedPhoto.caption}</p>
                    </div>
                  )}

                  {/* Link to Defect */}
                  <div className="pt-3 border-t">
                    <Label htmlFor="linkDefect" className="text-muted-foreground">
                      Linked to Defect
                    </Label>
                    <NativeSelect
                      id="linkDefect"
                      value={selectedPhoto.defectId || ""}
                      onChange={(e) => handleLinkToDefect(selectedPhoto.id, e.target.value || null)}
                      disabled={linking}
                      className="mt-1"
                    >
                      <option value="">Not linked</option>
                      {defects.map((defect) => (
                        <option key={defect.id} value={defect.id}>
                          #{defect.defectNumber} - {defect.title}
                        </option>
                      ))}
                    </NativeSelect>
                    {defects.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        No defects recorded yet.{" "}
                        <Link href={`/reports/${reportId}/defects`} className="text-[var(--ranz-blue-500)] hover:underline">
                          Add defects
                        </Link>
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-4 border-t">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setLightboxPhoto(selectedPhoto)}
                    >
                      <Maximize2 className="mr-2 h-4 w-4" />
                      View Larger
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(selectedPhoto.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Link href={`/reports/${reportId}/photos/${selectedPhoto.id}/annotate`}>
                    <Button variant="secondary" className="w-full">
                      <Pencil className="mr-2 h-4 w-4" />
                      {selectedPhoto.isEdited ? "Edit Annotations" : "Annotate Photo"}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Camera className="mx-auto h-8 w-8 mb-2" />
                  <p>Select a photo to view details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxPhoto(null)}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
            onClick={() => setLightboxPhoto(null)}
          >
            <X className="h-8 w-8" />
          </button>

          {/* Navigation buttons */}
          {photos.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateLightbox("prev");
                }}
              >
                <ChevronLeft className="h-10 w-10" />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateLightbox("next");
                }}
              >
                <ChevronRight className="h-10 w-10" />
              </button>
            </>
          )}

          {/* Image */}
          <div
            className="relative max-w-[90vw] max-h-[90vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={getDisplayUrl(lightboxPhoto)}
              alt={lightboxPhoto.caption || lightboxPhoto.originalFilename}
              fill
              className="object-contain"
              sizes="90vw"
              priority
            />
          </div>

          {/* Photo info */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg text-white text-sm flex items-center gap-3">
            <span className="font-medium">{lightboxPhoto.originalFilename}</span>
            <Badge variant="secondary" className="text-xs">
              {lightboxPhoto.photoType.replace("_", " ")}
            </Badge>
            {lightboxPhoto.isEdited && (
              <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-200 border-blue-400/50">
                <Pencil className="h-3 w-3 mr-0.5" />
                Annotated
              </Badge>
            )}
            <span className="text-white/60">
              {photos.findIndex(p => p.id === lightboxPhoto.id) + 1} / {photos.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
