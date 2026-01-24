"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Upload,
  FileText,
  Loader2,
  Trash2,
  X,
  Clock,
  Pencil,
  Download,
  FileCheck,
  FileWarning,
  FileCode,
  FileClock,
  File,
} from "lucide-react";

const DOCUMENT_TYPES = [
  { value: "BUILDING_CONSENT", label: "Building Consent", icon: FileCheck },
  { value: "CODE_OF_COMPLIANCE", label: "Code of Compliance", icon: FileCheck },
  { value: "MANUFACTURER_SPEC", label: "Manufacturer Spec", icon: FileCode },
  { value: "PREVIOUS_REPORT", label: "Previous Report", icon: FileClock },
  { value: "CORRESPONDENCE", label: "Correspondence", icon: FileText },
  { value: "CALIBRATION_CERT", label: "Calibration Certificate", icon: FileWarning },
  { value: "OTHER", label: "Other", icon: File },
];

interface Document {
  id: string;
  documentType: string;
  title: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  url: string;
  createdAt: string;
}

export default function DocumentsPage() {
  const params = useParams();
  const reportId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadDocType, setUploadDocType] = useState("OTHER");
  const [uploadTitle, setUploadTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDocType, setEditDocType] = useState("");

  useEffect(() => {
    fetchDocuments();
  }, [reportId]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/api/documents?reportId=${reportId}`);
      if (!response.ok) throw new Error("Failed to fetch documents");
      const data = await response.json();
      setDocuments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      if (!uploadTitle) {
        setUploadTitle(files[0].name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadTitle) return;

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("metadata", JSON.stringify({
        reportId,
        documentType: uploadDocType,
        title: uploadTitle,
      }));

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to upload document");
      }

      await fetchDocuments();
      cancelUpload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const cancelUpload = () => {
    setShowUploadForm(false);
    setSelectedFile(null);
    setUploadTitle("");
    setUploadDocType("OTHER");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete document");
      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const startEdit = (doc: Document) => {
    setEditingId(doc.id);
    setEditTitle(doc.title);
    setEditDocType(doc.documentType);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDocType("");
  };

  const saveEdit = async () => {
    if (!editingId || !editTitle) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/documents/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          documentType: editDocType,
        }),
      });

      if (!response.ok) throw new Error("Failed to update document");

      await fetchDocuments();
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update document");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getDocumentTypeInfo = (type: string) => {
    return DOCUMENT_TYPES.find(t => t.value === type) || DOCUMENT_TYPES[DOCUMENT_TYPES.length - 1];
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
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            Upload and manage supporting documents.
          </p>
        </div>
        {!showUploadForm && (
          <Button onClick={() => setShowUploadForm(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}

      {/* Upload form */}
      {showUploadForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upload Document</CardTitle>
                <CardDescription>
                  Add supporting documents like building consents, specifications, or correspondence.
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={cancelUpload}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="docType">Document Type *</Label>
                <NativeSelect
                  id="docType"
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value)}
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div>
                <Label htmlFor="docTitle">Title *</Label>
                <Input
                  id="docTitle"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Enter document title"
                />
              </div>
            </div>

            <div>
              <Label>File</Label>
              <div className="mt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-24 border-dashed"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="text-center">
                      <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
                      <p className="text-sm">Click to select file</p>
                      <p className="text-xs text-muted-foreground">
                        PDF, Word, Excel, or images
                      </p>
                    </div>
                  </Button>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={cancelUpload}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={uploading || !selectedFile || !uploadTitle}
              >
                {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents list */}
      {documents.length === 0 && !showUploadForm ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No documents yet</h3>
              <p className="mt-2 text-muted-foreground">
                Upload supporting documents for this report.
              </p>
              <Button className="mt-4" onClick={() => setShowUploadForm(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload First Document
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => {
            const typeInfo = getDocumentTypeInfo(doc.documentType);
            const IconComponent = typeInfo.icon;

            return (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-5 pb-5">
                  {editingId === doc.id ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor="editDocType">Document Type</Label>
                          <NativeSelect
                            id="editDocType"
                            value={editDocType}
                            onChange={(e) => setEditDocType(e.target.value)}
                          >
                            {DOCUMENT_TYPES.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </NativeSelect>
                        </div>
                        <div>
                          <Label htmlFor="editDocTitle">Title</Label>
                          <Input
                            id="editDocTitle"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={cancelEdit}>
                          Cancel
                        </Button>
                        <Button onClick={saveEdit} disabled={saving || !editTitle}>
                          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-muted rounded-lg">
                        <IconComponent className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{doc.title}</h3>
                          <Badge variant="outline">
                            {typeInfo.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span>{doc.filename}</span>
                          <span>•</span>
                          <span>{formatFileSize(doc.fileSize)}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(doc.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          className="h-8 w-8"
                        >
                          <a href={doc.url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(doc)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(doc.id)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
