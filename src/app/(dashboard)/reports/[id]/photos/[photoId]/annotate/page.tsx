"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PhotoAnnotator } from "@/components/photo/photo-annotator";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";

interface PhotoData {
  id: string;
  url: string;
  annotations: unknown[];
  isEdited: boolean;
}

export default function AnnotatePhotoPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;
  const photoId = params.photoId as string;

  const [photo, setPhoto] = useState<PhotoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPhoto();
  }, [photoId]);

  const fetchPhoto = async () => {
    try {
      const response = await fetch(`/api/photos/${photoId}/annotate`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch photo");
      }
      const data = await response.json();
      setPhoto(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (annotations: unknown[], dataUrl: string) => {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/photos/${photoId}/annotate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ annotations }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save annotations");
      }

      // Navigate back to photos page
      router.push(`/reports/${reportId}/photos`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/reports/${reportId}/photos`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !photo) {
    return (
      <div className="space-y-4">
        <Link
          href={`/reports/${reportId}/photos`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Photos
        </Link>
        <div className="p-4 bg-destructive/10 text-destructive rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error || "Photo not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href={`/reports/${reportId}/photos`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Photos
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Annotate Photo</h1>
        <p className="text-muted-foreground">
          Add arrows, circles, text, and other annotations to highlight defects or areas of interest.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {saving && (
        <div className="p-4 bg-blue-100 text-blue-800 rounded-md flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving annotations...
        </div>
      )}

      {/* Annotator */}
      <Card>
        <CardContent className="pt-6">
          <PhotoAnnotator
            imageUrl={photo.url}
            initialAnnotations={photo.annotations as []}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>

      {/* Help text */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Annotation Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li><strong>Pen:</strong> Freehand drawing for highlighting areas</li>
            <li><strong>Arrow:</strong> Point to specific defects or issues</li>
            <li><strong>Circle/Rectangle:</strong> Outline areas of concern</li>
            <li><strong>Text:</strong> Add labels or notes directly on the image</li>
            <li><strong>Colors:</strong> Use red for critical issues, orange for high priority</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
