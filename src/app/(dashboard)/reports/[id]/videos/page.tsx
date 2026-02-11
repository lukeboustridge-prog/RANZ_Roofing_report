"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Upload,
  Video as VideoIcon,
  Loader2,
  Trash2,
  X,
  MapPin,
  Clock,
  Pencil,
  Play,
  FileVideo,
} from "lucide-react";

interface Video {
  id: string;
  filename: string;
  originalFilename: string;
  url: string;
  thumbnailUrl: string | null;
  mimeType: string;
  fileSize: number;
  duration: number | null;
  title: string | null;
  description: string | null;
  capturedAt: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  createdAt: string;
}

/** Convert R2 public URL to proxy URL for reliable media playback */
function getMediaUrl(url: string): string {
  try {
    if (url.startsWith("https://") && url.includes(".r2.dev/")) {
      const key = url.split(".r2.dev/")[1];
      return `/api/media/${key}`;
    }
  } catch {
    // fall through
  }
  return url;
}

export default function VideosPage() {
  const params = useParams();
  const reportId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    fetchVideos();
  }, [reportId]);

  const fetchVideos = async () => {
    try {
      const response = await fetch(`/api/videos?reportId=${reportId}`);
      if (!response.ok) throw new Error("Failed to fetch videos");
      const data = await response.json();
      setVideos(data);
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
        // Validate file type
        if (!file.type.startsWith("video/")) {
          throw new Error("Only video files are allowed");
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("metadata", JSON.stringify({
          reportId,
        }));

        const response = await fetch("/api/videos", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to upload video");
        }
      }

      await fetchVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload videos");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm("Are you sure you want to delete this video?")) return;

    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete video");
      await fetchVideos();
      if (selectedVideo?.id === videoId) {
        setSelectedVideo(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const startEdit = (video: Video) => {
    setEditingId(video.id);
    setEditTitle(video.title || "");
    setEditDescription(video.description || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
  };

  const saveEdit = async () => {
    if (!editingId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/videos/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle || null,
          description: editDescription || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to update video");

      const updatedVideo = await response.json();
      setVideos(videos.map(v => v.id === editingId ? updatedVideo : v));
      if (selectedVideo?.id === editingId) {
        setSelectedVideo(updatedVideo);
      }
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update video");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Unknown";
    return new Date(dateStr).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "Unknown";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
          <h1 className="text-3xl font-bold tracking-tight">Videos</h1>
          <p className="text-muted-foreground">
            Upload and manage inspection videos.
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
          <CardTitle>Upload Videos</CardTitle>
          <CardDescription>
            Upload walkthrough or inspection videos from your device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                Supported formats: MP4, MOV, AVI, WebM
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
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
                {uploading ? "Uploading..." : "Select Videos"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video grid and detail view */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Video grid */}
        <div className="lg:col-span-2">
          {videos.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <VideoIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No videos yet</h3>
                  <p className="mt-2 text-muted-foreground">
                    Upload videos from your inspection.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {videos.map((video) => (
                <div
                  key={video.id}
                  onClick={() => setSelectedVideo(video)}
                  className={`relative aspect-video rounded-lg overflow-hidden cursor-pointer border-2 transition-all bg-muted ${
                    selectedVideo?.id === video.id
                      ? "border-[var(--ranz-blue-500)] ring-2 ring-[var(--ranz-blue-500)]/20"
                      : "border-transparent hover:border-muted-foreground/20"
                  }`}
                >
                  {video.thumbnailUrl ? (
                    <video
                      src={getMediaUrl(video.url)}
                      className="w-full h-full object-cover"
                      preload="metadata"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileVideo className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                      <Play className="h-6 w-6 text-black ml-1" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-white text-sm truncate">
                      {video.title || video.originalFilename}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Video details panel */}
        <div className="lg:col-span-1">
          {selectedVideo ? (
            <Card className="sticky top-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Video Details</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedVideo(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Preview */}
                <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                  <video
                    src={getMediaUrl(selectedVideo.url)}
                    controls
                    className="w-full h-full"
                    preload="metadata"
                  />
                </div>

                {/* Metadata */}
                {editingId === selectedVideo.id ? (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="editTitle">Title</Label>
                      <Input
                        id="editTitle"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Enter a title..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="editDescription">Description</Label>
                      <Textarea
                        id="editDescription"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Enter a description..."
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={saveEdit} disabled={saving} className="flex-1">
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save
                      </Button>
                      <Button variant="outline" onClick={cancelEdit}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Title</p>
                      <p className="font-medium">
                        {selectedVideo.title || "Untitled"}
                      </p>
                    </div>

                    <div>
                      <p className="text-muted-foreground">Filename</p>
                      <p className="font-medium truncate">
                        {selectedVideo.originalFilename}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-muted-foreground">Size</p>
                        <p className="font-medium">
                          {formatFileSize(selectedVideo.fileSize)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Duration</p>
                        <p className="font-medium">
                          {formatDuration(selectedVideo.duration)}
                        </p>
                      </div>
                    </div>

                    {selectedVideo.capturedAt && (
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-muted-foreground">Captured</p>
                          <p className="font-medium">
                            {formatDate(selectedVideo.capturedAt)}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedVideo.gpsLat && selectedVideo.gpsLng && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-muted-foreground">Location</p>
                          <p className="font-medium">
                            {selectedVideo.gpsLat.toFixed(6)},{" "}
                            {selectedVideo.gpsLng.toFixed(6)}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedVideo.description && (
                      <div>
                        <p className="text-muted-foreground">Description</p>
                        <p className="font-medium">{selectedVideo.description}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                {editingId !== selectedVideo.id && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => startEdit(selectedVideo)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Details
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(selectedVideo.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <VideoIcon className="mx-auto h-8 w-8 mb-2" />
                  <p>Select a video to view details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
