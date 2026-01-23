"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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
  photoType: string;
  caption: string | null;
  capturedAt: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  cameraMake: string | null;
  cameraModel: string | null;
  sortOrder: number;
  createdAt: string;
}

export default function PhotosPage() {
  const params = useParams();
  const reportId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [uploadType, setUploadType] = useState("GENERAL");

  useEffect(() => {
    fetchPhotos();
  }, [reportId]);

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
              <Select
                id="photoType"
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
              >
                {PHOTO_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
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
                  {photo.thumbnailUrl || photo.url ? (
                    <Image
                      src={photo.thumbnailUrl || photo.url}
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
                    <Badge variant="secondary" className="text-xs">
                      {photo.photoType.replace("_", " ")}
                    </Badge>
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
                <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                  {selectedPhoto.url ? (
                    <Image
                      src={selectedPhoto.url}
                      alt={selectedPhoto.caption || selectedPhoto.originalFilename}
                      fill
                      className="object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>

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
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open(selectedPhoto.url, "_blank")}
                  >
                    View Full Size
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDelete(selectedPhoto.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
    </div>
  );
}
