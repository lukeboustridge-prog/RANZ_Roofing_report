"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SeverityBadge } from "@/components/badges/SeverityBadge";
import { ClassificationBadge } from "@/components/badges/ClassificationBadge";
import {
  ArrowLeft,
  Plus,
  AlertTriangle,
  Loader2,
  Pencil,
  Trash2,
  X,
  MapPin,
  Camera,
  Image as ImageIcon,
} from "lucide-react";
import Image from "next/image";
import type { DefectSeverity, DefectClass } from "@prisma/client";

const DEFECT_CLASSES = [
  { value: "MAJOR_DEFECT", label: "Major Defect" },
  { value: "MINOR_DEFECT", label: "Minor Defect" },
  { value: "SAFETY_HAZARD", label: "Safety Hazard" },
  { value: "MAINTENANCE_ITEM", label: "Maintenance Item" },
  { value: "WORKMANSHIP_ISSUE", label: "Workmanship Issue" },
];

const DEFECT_SEVERITIES = [
  { value: "CRITICAL", label: "Critical", color: "bg-red-500" },
  { value: "HIGH", label: "High", color: "bg-orange-500" },
  { value: "MEDIUM", label: "Medium", color: "bg-yellow-500" },
  { value: "LOW", label: "Low", color: "bg-green-500" },
];

const PRIORITY_LEVELS = [
  { value: "IMMEDIATE", label: "Immediate" },
  { value: "SHORT_TERM", label: "Short Term (1-3 months)" },
  { value: "MEDIUM_TERM", label: "Medium Term (3-12 months)" },
  { value: "LONG_TERM", label: "Long Term (12+ months)" },
];

interface Photo {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  originalFilename: string;
  defectId: string | null;
}

interface RoofElement {
  id: string;
  elementType: string;
  location: string;
}

interface Defect {
  id: string;
  defectNumber: number;
  title: string;
  description: string;
  location: string;
  classification: string;
  severity: string;
  observation: string;
  analysis: string | null;
  opinion: string | null;
  codeReference: string | null;
  copReference: string | null;
  probableCause: string | null;
  contributingFactors: string | null;
  recommendation: string | null;
  priorityLevel: string | null;
  estimatedCost: string | null;
  roofElementId: string | null;
  roofElement?: RoofElement | null;
  photos?: Photo[];
}

interface FormData {
  title: string;
  description: string;
  location: string;
  roofElementId: string;
  classification: string;
  severity: string;
  observation: string;
  analysis: string;
  opinion: string;
  codeReference: string;
  copReference: string;
  probableCause: string;
  contributingFactors: string;
  recommendation: string;
  priorityLevel: string;
  estimatedCost: string;
}

const initialFormData: FormData = {
  title: "",
  description: "",
  location: "",
  roofElementId: "",
  classification: "MINOR_DEFECT",
  severity: "MEDIUM",
  observation: "",
  analysis: "",
  opinion: "",
  codeReference: "",
  copReference: "",
  probableCause: "",
  contributingFactors: "",
  recommendation: "",
  priorityLevel: "MEDIUM_TERM",
  estimatedCost: "",
};

export default function DefectsPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;

  const [defects, setDefects] = useState<Defect[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [roofElements, setRoofElements] = useState<RoofElement[]>([]);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  useEffect(() => {
    fetchDefects();
    fetchPhotos();
    fetchRoofElements();
  }, [reportId]);

  const fetchRoofElements = async () => {
    try {
      const response = await fetch(`/api/elements?reportId=${reportId}`);
      if (response.ok) {
        const data = await response.json();
        setRoofElements(data);
      }
    } catch {
      // Ignore errors
    }
  };

  const fetchPhotos = async () => {
    try {
      const response = await fetch(`/api/photos?reportId=${reportId}`);
      if (response.ok) {
        const data = await response.json();
        setPhotos(data);
      }
    } catch {
      // Ignore errors
    }
  };

  const fetchDefects = async () => {
    try {
      const response = await fetch(`/api/defects?reportId=${reportId}`);
      if (!response.ok) throw new Error("Failed to fetch defects");
      const data = await response.json();
      setDefects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const url = editingId
        ? `/api/defects/${editingId}`
        : "/api/defects";
      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          roofElementId: formData.roofElementId || null,
          reportId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save defect");
      }

      const savedDefect = await response.json();

      // Link selected photos to this defect
      const defectId = savedDefect.id;

      // First, unlink any photos that were previously linked but are now deselected
      if (editingId) {
        const previouslyLinked = photos.filter(p => p.defectId === editingId);
        for (const photo of previouslyLinked) {
          if (!selectedPhotoIds.includes(photo.id)) {
            await fetch(`/api/photos/${photo.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ defectId: null }),
            });
          }
        }
      }

      // Link newly selected photos
      for (const photoId of selectedPhotoIds) {
        const photo = photos.find(p => p.id === photoId);
        if (photo && photo.defectId !== defectId) {
          await fetch(`/api/photos/${photoId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ defectId }),
          });
        }
      }

      await fetchDefects();
      await fetchPhotos();
      setShowForm(false);
      setEditingId(null);
      setFormData(initialFormData);
      setSelectedPhotoIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotoIds(prev =>
      prev.includes(photoId)
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  const getAvailablePhotos = () => {
    // Photos not linked to any defect, OR linked to the currently editing defect
    return photos.filter(p => !p.defectId || p.defectId === editingId);
  };

  const getPhotosForDefect = (defectId: string) => {
    return photos.filter(p => p.defectId === defectId);
  };

  const handleEdit = (defect: Defect) => {
    setFormData({
      title: defect.title,
      description: defect.description,
      location: defect.location,
      roofElementId: defect.roofElementId || "",
      classification: defect.classification,
      severity: defect.severity,
      observation: defect.observation,
      analysis: defect.analysis || "",
      opinion: defect.opinion || "",
      codeReference: defect.codeReference || "",
      copReference: defect.copReference || "",
      probableCause: defect.probableCause || "",
      contributingFactors: defect.contributingFactors || "",
      recommendation: defect.recommendation || "",
      priorityLevel: defect.priorityLevel || "MEDIUM_TERM",
      estimatedCost: defect.estimatedCost || "",
    });
    // Load currently linked photos
    const linkedPhotos = photos.filter(p => p.defectId === defect.id);
    setSelectedPhotoIds(linkedPhotos.map(p => p.id));
    setEditingId(defect.id);
    setShowForm(true);
  };

  const handleDelete = async (defectId: string) => {
    if (!confirm("Are you sure you want to delete this defect?")) return;

    try {
      const response = await fetch(`/api/defects/${defectId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete defect");
      await fetchDefects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(initialFormData);
    setSelectedPhotoIds([]);
    setError("");
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
          <h1 className="text-3xl font-bold tracking-tight">Defects</h1>
          <p className="text-muted-foreground">
            Document and classify defects found during inspection.
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Defect
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {editingId ? "Edit Defect" : "Add New Defect"}
                </CardTitle>
                <CardDescription>
                  Use the three-part structure: Observation (factual) → Analysis
                  (technical) → Opinion (professional judgment)
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={cancelForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label htmlFor="title">Defect Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    placeholder="e.g., Corroded ridge flashing"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => updateField("location", e.target.value)}
                    placeholder="e.g., North elevation, main ridge"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="roofElementId">Related Roof Element</Label>
                  <NativeSelect
                    id="roofElementId"
                    value={formData.roofElementId}
                    onChange={(e) => updateField("roofElementId", e.target.value)}
                  >
                    <option value="">Not linked to element</option>
                    {roofElements.map((element) => (
                      <option key={element.id} value={element.id}>
                        {element.elementType.replace(/_/g, " ")} - {element.location}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="classification">Classification *</Label>
                    <NativeSelect
                      id="classification"
                      value={formData.classification}
                      onChange={(e) =>
                        updateField("classification", e.target.value)
                      }
                    >
                      {DEFECT_CLASSES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div>
                    <Label htmlFor="severity">Severity *</Label>
                    <NativeSelect
                      id="severity"
                      value={formData.severity}
                      onChange={(e) => updateField("severity", e.target.value)}
                    >
                      {DEFECT_SEVERITIES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                </div>
              </div>

              {/* Three-part structure */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="observation">
                    Observation (Factual Description) *
                  </Label>
                  <Textarea
                    id="observation"
                    value={formData.observation}
                    onChange={(e) => updateField("observation", e.target.value)}
                    placeholder="Describe exactly what was observed without interpretation..."
                    rows={3}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Factual, objective description of what was seen
                  </p>
                </div>

                <div>
                  <Label htmlFor="analysis">Analysis (Technical Interpretation)</Label>
                  <Textarea
                    id="analysis"
                    value={formData.analysis}
                    onChange={(e) => updateField("analysis", e.target.value)}
                    placeholder="Technical interpretation of the observation..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Technical explanation of why this is a defect
                  </p>
                </div>

                <div>
                  <Label htmlFor="opinion">Opinion (Professional Judgment)</Label>
                  <Textarea
                    id="opinion"
                    value={formData.opinion}
                    onChange={(e) => updateField("opinion", e.target.value)}
                    placeholder="In my professional opinion..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your professional opinion, clearly labelled as such
                  </p>
                </div>
              </div>

              {/* Causation */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="probableCause">Probable Cause</Label>
                  <Textarea
                    id="probableCause"
                    value={formData.probableCause}
                    onChange={(e) => updateField("probableCause", e.target.value)}
                    placeholder="What likely caused this defect..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="contributingFactors">Contributing Factors</Label>
                  <Textarea
                    id="contributingFactors"
                    value={formData.contributingFactors}
                    onChange={(e) => updateField("contributingFactors", e.target.value)}
                    placeholder="Other factors that contributed..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Code references */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="codeReference">Building Code Reference</Label>
                  <Input
                    id="codeReference"
                    value={formData.codeReference}
                    onChange={(e) => updateField("codeReference", e.target.value)}
                    placeholder="e.g., E2/AS1 Section 9.1"
                  />
                </div>
                <div>
                  <Label htmlFor="copReference">COP Reference</Label>
                  <Input
                    id="copReference"
                    value={formData.copReference}
                    onChange={(e) => updateField("copReference", e.target.value)}
                    placeholder="e.g., COP v25.12 Section 7.1"
                  />
                </div>
              </div>

              {/* Recommendation */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="md:col-span-2">
                  <Label htmlFor="recommendation">Recommendation</Label>
                  <Textarea
                    id="recommendation"
                    value={formData.recommendation}
                    onChange={(e) =>
                      updateField("recommendation", e.target.value)
                    }
                    placeholder="Recommended remediation actions..."
                    rows={2}
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="priorityLevel">Priority</Label>
                    <NativeSelect
                      id="priorityLevel"
                      value={formData.priorityLevel}
                      onChange={(e) =>
                        updateField("priorityLevel", e.target.value)
                      }
                    >
                      {PRIORITY_LEVELS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div>
                    <Label htmlFor="estimatedCost">Estimated Cost</Label>
                    <Input
                      id="estimatedCost"
                      value={formData.estimatedCost}
                      onChange={(e) => updateField("estimatedCost", e.target.value)}
                      placeholder="e.g., $2,000 - $5,000"
                    />
                  </div>
                </div>
              </div>

              {/* Description (general notes) */}
              <div>
                <Label htmlFor="description">Additional Notes</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Any additional notes or context..."
                  rows={2}
                />
              </div>

              {/* Photo Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Link Photos ({selectedPhotoIds.length} selected)
                  </Label>
                  <Link
                    href={`/reports/${reportId}/photos`}
                    className="text-sm text-[var(--ranz-blue-500)] hover:underline"
                  >
                    Manage Photos
                  </Link>
                </div>
                {getAvailablePhotos().length === 0 ? (
                  <div className="p-4 border rounded-lg text-center">
                    <Camera className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No photos available.{" "}
                      <Link href={`/reports/${reportId}/photos`} className="text-[var(--ranz-blue-500)] hover:underline">
                        Upload photos
                      </Link>{" "}
                      first.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {getAvailablePhotos().map((photo) => (
                      <div
                        key={photo.id}
                        onClick={() => togglePhotoSelection(photo.id)}
                        className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                          selectedPhotoIds.includes(photo.id)
                            ? "border-[var(--ranz-blue-500)] ring-2 ring-[var(--ranz-blue-500)]/20"
                            : "border-transparent hover:border-muted-foreground/30"
                        }`}
                      >
                        <Image
                          src={photo.thumbnailUrl || photo.url}
                          alt={photo.originalFilename}
                          fill
                          className="object-cover"
                        />
                        {selectedPhotoIds.includes(photo.id) && (
                          <div className="absolute inset-0 bg-[var(--ranz-blue-500)]/20 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-[var(--ranz-blue-500)] flex items-center justify-center">
                              <span className="text-white text-xs font-bold">✓</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={cancelForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingId ? "Update Defect" : "Add Defect"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Defects list */}
      {defects.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No defects recorded</h3>
              <p className="mt-2 text-muted-foreground">
                Start documenting defects found during the inspection.
              </p>
              <Button className="mt-4" onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Defect
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {defects.map((defect) => (
            <Card key={defect.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-muted-foreground shrink-0">
                        #{defect.defectNumber}
                      </span>
                      <h3 className="text-lg font-semibold truncate">{defect.title}</h3>
                      <SeverityBadge severity={defect.severity as DefectSeverity} />
                      <ClassificationBadge classification={defect.classification as DefectClass} />
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span>{defect.location}</span>
                      {defect.roofElement && (
                        <>
                          <span className="text-muted-foreground/50">•</span>
                          <span>{defect.roofElement.elementType.replace(/_/g, " ")}</span>
                        </>
                      )}
                    </div>

                    <div className="mt-4 space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Observation
                        </p>
                        <p className="text-sm mt-0.5">{defect.observation}</p>
                      </div>
                      {defect.analysis && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Analysis
                          </p>
                          <p className="text-sm mt-0.5">{defect.analysis}</p>
                        </div>
                      )}
                      {defect.opinion && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Opinion
                          </p>
                          <p className="text-sm italic mt-0.5">{defect.opinion}</p>
                        </div>
                      )}
                      {(defect.probableCause || defect.contributingFactors) && (
                        <div className="grid gap-2 md:grid-cols-2">
                          {defect.probableCause && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Probable Cause
                              </p>
                              <p className="text-sm mt-0.5">{defect.probableCause}</p>
                            </div>
                          )}
                          {defect.contributingFactors && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Contributing Factors
                              </p>
                              <p className="text-sm mt-0.5">{defect.contributingFactors}</p>
                            </div>
                          )}
                        </div>
                      )}
                      {(defect.codeReference || defect.copReference) && (
                        <div className="flex gap-4 flex-wrap">
                          {defect.codeReference && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Code Reference
                              </p>
                              <p className="text-sm mt-0.5 font-mono">{defect.codeReference}</p>
                            </div>
                          )}
                          {defect.copReference && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                COP Reference
                              </p>
                              <p className="text-sm mt-0.5 font-mono">{defect.copReference}</p>
                            </div>
                          )}
                        </div>
                      )}
                      {defect.recommendation && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Recommendation
                          </p>
                          <p className="text-sm mt-0.5">{defect.recommendation}</p>
                          <div className="flex gap-2 mt-1.5 flex-wrap">
                            {defect.priorityLevel && (
                              <Badge variant="outline">
                                {defect.priorityLevel.replace(/_/g, " ")}
                              </Badge>
                            )}
                            {defect.estimatedCost && (
                              <Badge variant="outline" className="bg-muted">
                                Est: {defect.estimatedCost}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Linked Photos */}
                      {getPhotosForDefect(defect.id).length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                            <ImageIcon className="h-3 w-3 inline mr-1" />
                            Photos ({getPhotosForDefect(defect.id).length})
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            {getPhotosForDefect(defect.id).slice(0, 4).map((photo) => (
                              <div
                                key={photo.id}
                                className="relative w-16 h-16 rounded overflow-hidden bg-muted"
                              >
                                <Image
                                  src={photo.thumbnailUrl || photo.url}
                                  alt=""
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ))}
                            {getPhotosForDefect(defect.id).length > 4 && (
                              <div className="w-16 h-16 rounded bg-muted flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">
                                  +{getPhotosForDefect(defect.id).length - 4}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1 ml-4 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(defect)}
                      className="h-8 w-8"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(defect.id)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
