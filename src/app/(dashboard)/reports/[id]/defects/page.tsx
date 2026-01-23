"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Plus,
  AlertTriangle,
  Loader2,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

const DEFECT_CLASSES = [
  { value: "MAJOR_DEFECT", label: "Major Defect" },
  { value: "MINOR_DEFECT", label: "Minor Defect" },
  { value: "SAFETY_HAZARD", label: "Safety Hazard" },
  { value: "MAINTENANCE_ITEM", label: "Maintenance Item" },
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
  recommendation: string | null;
  priorityLevel: string | null;
}

interface FormData {
  title: string;
  description: string;
  location: string;
  classification: string;
  severity: string;
  observation: string;
  analysis: string;
  opinion: string;
  codeReference: string;
  copReference: string;
  recommendation: string;
  priorityLevel: string;
}

const initialFormData: FormData = {
  title: "",
  description: "",
  location: "",
  classification: "MINOR_DEFECT",
  severity: "MEDIUM",
  observation: "",
  analysis: "",
  opinion: "",
  codeReference: "",
  copReference: "",
  recommendation: "",
  priorityLevel: "MEDIUM_TERM",
};

export default function DefectsPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;

  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  useEffect(() => {
    fetchDefects();
  }, [reportId]);

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
          reportId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save defect");
      }

      await fetchDefects();
      setShowForm(false);
      setEditingId(null);
      setFormData(initialFormData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (defect: Defect) => {
    setFormData({
      title: defect.title,
      description: defect.description,
      location: defect.location,
      classification: defect.classification,
      severity: defect.severity,
      observation: defect.observation,
      analysis: defect.analysis || "",
      opinion: defect.opinion || "",
      codeReference: defect.codeReference || "",
      copReference: defect.copReference || "",
      recommendation: defect.recommendation || "",
      priorityLevel: defect.priorityLevel || "MEDIUM_TERM",
    });
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
    setError("");
  };

  const getSeverityColor = (severity: string) => {
    const found = DEFECT_SEVERITIES.find((s) => s.value === severity);
    return found?.color || "bg-gray-500";
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="classification">Classification *</Label>
                    <Select
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
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="severity">Severity *</Label>
                    <Select
                      id="severity"
                      value={formData.severity}
                      onChange={(e) => updateField("severity", e.target.value)}
                    >
                      {DEFECT_SEVERITIES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </Select>
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
                <div>
                  <Label htmlFor="priorityLevel">Priority</Label>
                  <Select
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
                  </Select>
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
            <Card key={defect.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        #{defect.defectNumber}
                      </span>
                      <h3 className="text-lg font-semibold">{defect.title}</h3>
                      <Badge
                        className={`${getSeverityColor(defect.severity)} text-white`}
                      >
                        {defect.severity}
                      </Badge>
                      <Badge variant="outline">
                        {defect.classification.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Location: {defect.location}
                    </p>

                    <div className="mt-4 space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase">
                          Observation
                        </p>
                        <p className="text-sm">{defect.observation}</p>
                      </div>
                      {defect.analysis && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase">
                            Analysis
                          </p>
                          <p className="text-sm">{defect.analysis}</p>
                        </div>
                      )}
                      {defect.opinion && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase">
                            Opinion
                          </p>
                          <p className="text-sm italic">{defect.opinion}</p>
                        </div>
                      )}
                      {defect.recommendation && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase">
                            Recommendation
                          </p>
                          <p className="text-sm">{defect.recommendation}</p>
                          {defect.priorityLevel && (
                            <Badge variant="outline" className="mt-1">
                              {defect.priorityLevel.replace(/_/g, " ")}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(defect)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(defect.id)}
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
