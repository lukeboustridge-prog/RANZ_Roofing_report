"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Upload,
  Mic,
  Loader2,
  Trash2,
  X,
  Clock,
  Pencil,
  Play,
  Pause,
} from "lucide-react";

interface VoiceNote {
  id: string;
  filename: string;
  originalFilename: string;
  url: string;
  mimeType: string;
  fileSize: number;
  duration: number | null;
  recordedAt: string | null;
  transcription: string | null;
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

export default function VoiceNotesPage() {
  const params = useParams();
  const reportId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedNote, setSelectedNote] = useState<VoiceNote | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTranscription, setEditTranscription] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchVoiceNotes();
  }, [reportId]);

  const fetchVoiceNotes = async () => {
    try {
      const response = await fetch(`/api/voice-notes?reportId=${reportId}`);
      if (!response.ok) throw new Error("Failed to fetch voice notes");
      const data = await response.json();
      setVoiceNotes(data);
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
        if (!file.type.startsWith("audio/")) {
          throw new Error("Only audio files are allowed");
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("metadata", JSON.stringify({ reportId }));

        const response = await fetch("/api/voice-notes", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to upload voice note");
        }
      }

      await fetchVoiceNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload voice notes");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this voice note?")) return;

    try {
      const response = await fetch(`/api/voice-notes/${noteId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete voice note");
      await fetchVoiceNotes();
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const togglePlayback = (note: VoiceNote) => {
    if (playingId === note.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(getMediaUrl(note.url));
      audio.onended = () => setPlayingId(null);
      audio.play();
      audioRef.current = audio;
      setPlayingId(note.id);
    }
  };

  const startEdit = (note: VoiceNote) => {
    setEditingId(note.id);
    setEditTranscription(note.transcription || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTranscription("");
  };

  const saveEdit = async () => {
    if (!editingId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/voice-notes/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcription: editTranscription || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to update voice note");

      const updated = await response.json();
      setVoiceNotes(voiceNotes.map(v => v.id === editingId ? updated : v));
      if (selectedNote?.id === editingId) {
        setSelectedNote(updated);
      }
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update voice note");
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
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return "Unknown";
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
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
          <h1 className="text-3xl font-bold tracking-tight">Voice Notes</h1>
          <p className="text-muted-foreground">
            Upload and manage inspection voice notes and audio recordings.
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
          <CardTitle>Upload Voice Notes</CardTitle>
          <CardDescription>
            Upload audio recordings from your inspection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                Supported formats: M4A, MP3, WAV, AAC, OGG
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
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
                {uploading ? "Uploading..." : "Select Audio Files"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voice notes list and detail view */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Voice notes list */}
        <div className="lg:col-span-2">
          {voiceNotes.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Mic className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No voice notes yet</h3>
                  <p className="mt-2 text-muted-foreground">
                    Upload audio recordings or sync from the mobile app.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {voiceNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  className={`flex items-center gap-4 p-4 rounded-lg cursor-pointer border transition-all bg-card ${
                    selectedNote?.id === note.id
                      ? "border-[var(--ranz-blue-500)] ring-2 ring-[var(--ranz-blue-500)]/20"
                      : "border-border hover:border-muted-foreground/20"
                  }`}
                >
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlayback(note);
                    }}
                  >
                    {playingId === note.id ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 ml-0.5" />
                    )}
                  </Button>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {note.originalFilename}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span>{formatDuration(note.duration)}</span>
                      <span>{formatFileSize(note.fileSize)}</span>
                      {note.recordedAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(note.recordedAt)}
                        </span>
                      )}
                    </div>
                    {note.transcription && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {note.transcription}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Voice note details panel */}
        <div className="lg:col-span-1">
          {selectedNote ? (
            <Card className="sticky top-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Voice Note Details</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedNote(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Audio player */}
                <div className="rounded-lg overflow-hidden bg-muted p-4">
                  <audio
                    src={getMediaUrl(selectedNote.url)}
                    controls
                    className="w-full"
                    preload="metadata"
                  />
                </div>

                {/* Metadata */}
                {editingId === selectedNote.id ? (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="editTranscription">Transcription</Label>
                      <Textarea
                        id="editTranscription"
                        value={editTranscription}
                        onChange={(e) => setEditTranscription(e.target.value)}
                        placeholder="Type the transcription..."
                        rows={6}
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
                      <p className="text-muted-foreground">Filename</p>
                      <p className="font-medium truncate">
                        {selectedNote.originalFilename}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-muted-foreground">Size</p>
                        <p className="font-medium">
                          {formatFileSize(selectedNote.fileSize)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Duration</p>
                        <p className="font-medium">
                          {formatDuration(selectedNote.duration)}
                        </p>
                      </div>
                    </div>

                    {selectedNote.recordedAt && (
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-muted-foreground">Recorded</p>
                          <p className="font-medium">
                            {formatDate(selectedNote.recordedAt)}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedNote.transcription && (
                      <div>
                        <p className="text-muted-foreground">Transcription</p>
                        <p className="font-medium whitespace-pre-wrap">
                          {selectedNote.transcription}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                {editingId !== selectedNote.id && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => startEdit(selectedNote)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      {selectedNote.transcription ? "Edit Transcription" : "Add Transcription"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(selectedNote.id)}
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
                  <Mic className="mx-auto h-8 w-8 mb-2" />
                  <p>Select a voice note to view details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
