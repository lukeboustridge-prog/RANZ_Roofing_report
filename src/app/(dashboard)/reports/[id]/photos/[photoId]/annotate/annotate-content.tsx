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

export default function AnnotateContent() {
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

  const parseErrorResponse = async (response: Response): Promise<string> => {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        const data = await response.json();
        return data.error || `Request failed (${response.status})`;
      } catch {
        return `Request failed (${response.status})`;
      }
    }
    // Non-JSON response (e.g. "Request Entity Too Large")
    const text = await response.text();
    return text || `Request failed (${response.status})`;
  };

  const fetchPhoto = async () => {
    const url = `/api/photos/${photoId}/annotate`;
    console.log("[Annotate] Fetching photo data:", { photoId, url });

    try {
      const response = await fetch(url);
      console.log("[Annotate] Fetch response:", {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get("content-type"),
      });

      if (!response.ok) {
        const errorMsg = await parseErrorResponse(response);
        console.error("[Annotate] API error:", { status: response.status, errorMsg });
        throw new Error(errorMsg);
      }
      const data = await response.json();
      console.log("[Annotate] Photo loaded:", { id: data.id, hasAnnotations: Array.isArray(data.annotations) && data.annotations.length > 0 });
      setPhoto(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      console.error("[Annotate] fetchPhoto failed:", {
        error: err,
        message,
        photoId,
        url,
      });

      // Provide more specific error messages
      if (message === "Failed to fetch") {
        setError("Could not connect to the server. Check your network connection and try refreshing the page.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Convert a data URL to a Blob without using fetch().
   * fetch(dataUrl) can fail on very large images in some browsers.
   */
  const dataUrlToBlob = (dataUrl: string): Blob => {
    const [header, base64Data] = dataUrl.split(",");
    const mimeMatch = header.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/png";
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  };

  const handleSave = async (annotations: unknown[], dataUrl: string) => {
    setSaving(true);
    setError("");

    console.log("[Annotate] Saving annotations:", {
      photoId,
      annotationCount: Array.isArray(annotations) ? annotations.length : 0,
      hasDataUrl: !!dataUrl,
      dataUrlLength: dataUrl?.length ?? 0,
    });

    try {
      const formData = new FormData();
      formData.append("annotations", JSON.stringify(annotations));

      // Convert data URL to Blob for multipart upload
      if (dataUrl && dataUrl.startsWith("data:image/")) {
        try {
          const blob = dataUrlToBlob(dataUrl);
          console.log("[Annotate] Converted image to blob:", {
            size: blob.size,
            type: blob.type,
            sizeMB: (blob.size / (1024 * 1024)).toFixed(2) + " MB",
          });
          formData.append("annotatedImage", blob, "annotated.png");
        } catch (conversionErr) {
          console.error("[Annotate] Failed to convert data URL to blob:", conversionErr);
          setError("Failed to process the annotated image. The image may be too large.");
          setSaving(false);
          return;
        }
      }

      const url = `/api/photos/${photoId}/annotate`;
      console.log("[Annotate] POSTing to:", url);

      const saveResponse = await fetch(url, {
        method: "POST",
        body: formData,
      });

      console.log("[Annotate] Save response:", {
        status: saveResponse.status,
        statusText: saveResponse.statusText,
        contentType: saveResponse.headers.get("content-type"),
      });

      if (!saveResponse.ok) {
        const errorMsg = await parseErrorResponse(saveResponse);
        console.error("[Annotate] Save API error:", { status: saveResponse.status, errorMsg });
        throw new Error(errorMsg);
      }

      console.log("[Annotate] Save successful, navigating back");
      router.push(`/reports/${reportId}/photos`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save";
      console.error("[Annotate] handleSave failed:", {
        error: err,
        message,
        photoId,
      });

      // Provide more specific error messages
      if (message === "Failed to fetch") {
        setError("Could not save annotations. The image may be too large or the server is not responding. Try reducing the image size or refreshing the page.");
      } else {
        setError(message);
      }
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
