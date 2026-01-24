"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/select";
import { ConditionBadge } from "@/components/badges/ConditionBadge";
import {
  ArrowLeft,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  X,
  Layers,
  MapPin,
} from "lucide-react";
import type { ConditionRating } from "@prisma/client";

const ELEMENT_TYPES = [
  { value: "ROOF_CLADDING", label: "Roof Cladding" },
  { value: "RIDGE", label: "Ridge" },
  { value: "VALLEY", label: "Valley" },
  { value: "HIP", label: "Hip" },
  { value: "BARGE", label: "Barge" },
  { value: "FASCIA", label: "Fascia" },
  { value: "GUTTER", label: "Gutter" },
  { value: "DOWNPIPE", label: "Downpipe" },
  { value: "FLASHING_WALL", label: "Wall Flashing" },
  { value: "FLASHING_PENETRATION", label: "Penetration Flashing" },
  { value: "SKYLIGHT", label: "Skylight" },
  { value: "VENT", label: "Vent" },
  { value: "OTHER", label: "Other" },
];

const CONDITION_RATINGS = [
  { value: "GOOD", label: "Good", color: "bg-green-500" },
  { value: "FAIR", label: "Fair", color: "bg-yellow-500" },
  { value: "POOR", label: "Poor", color: "bg-orange-500" },
  { value: "CRITICAL", label: "Critical", color: "bg-red-500" },
  { value: "NOT_INSPECTED", label: "Not Inspected", color: "bg-gray-500" },
];

interface RoofElement {
  id: string;
  elementType: string;
  location: string;
  claddingType: string | null;
  material: string | null;
  manufacturer: string | null;
  pitch: number | null;
  area: number | null;
  conditionRating: string | null;
  conditionNotes: string | null;
}

interface FormData {
  elementType: string;
  location: string;
  claddingType: string;
  material: string;
  manufacturer: string;
  pitch: string;
  area: string;
  conditionRating: string;
  conditionNotes: string;
}

const initialFormData: FormData = {
  elementType: "ROOF_CLADDING",
  location: "",
  claddingType: "",
  material: "",
  manufacturer: "",
  pitch: "",
  area: "",
  conditionRating: "NOT_INSPECTED",
  conditionNotes: "",
};

export default function ElementsPage() {
  const params = useParams();
  const reportId = params.id as string;

  const [elements, setElements] = useState<RoofElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  useEffect(() => {
    fetchElements();
  }, [reportId]);

  const fetchElements = async () => {
    try {
      const response = await fetch(`/api/elements?reportId=${reportId}`);
      if (!response.ok) throw new Error("Failed to fetch elements");
      const data = await response.json();
      setElements(data);
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
        ? `/api/elements/${editingId}`
        : "/api/elements";
      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          reportId,
          pitch: formData.pitch ? parseFloat(formData.pitch) : null,
          area: formData.area ? parseFloat(formData.area) : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save element");
      }

      await fetchElements();
      setShowForm(false);
      setEditingId(null);
      setFormData(initialFormData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (element: RoofElement) => {
    setFormData({
      elementType: element.elementType,
      location: element.location,
      claddingType: element.claddingType || "",
      material: element.material || "",
      manufacturer: element.manufacturer || "",
      pitch: element.pitch?.toString() || "",
      area: element.area?.toString() || "",
      conditionRating: element.conditionRating || "NOT_INSPECTED",
      conditionNotes: element.conditionNotes || "",
    });
    setEditingId(element.id);
    setShowForm(true);
  };

  const handleDelete = async (elementId: string) => {
    if (!confirm("Are you sure you want to delete this element?")) return;

    try {
      const response = await fetch(`/api/elements/${elementId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete element");
      await fetchElements();
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
          <h1 className="text-3xl font-bold tracking-tight">Roof Elements</h1>
          <p className="text-muted-foreground">
            Document roof components and their condition.
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Element
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
                  {editingId ? "Edit Element" : "Add Roof Element"}
                </CardTitle>
                <CardDescription>
                  Document a roof component and assess its condition.
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={cancelForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="elementType">Element Type *</Label>
                  <NativeSelect
                    id="elementType"
                    value={formData.elementType}
                    onChange={(e) => updateField("elementType", e.target.value)}
                  >
                    {ELEMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => updateField("location", e.target.value)}
                    placeholder="e.g., North elevation, main roof"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="claddingType">Cladding Type</Label>
                  <Input
                    id="claddingType"
                    value={formData.claddingType}
                    onChange={(e) => updateField("claddingType", e.target.value)}
                    placeholder="e.g., Corrugated, standing seam"
                  />
                </div>
                <div>
                  <Label htmlFor="material">Material</Label>
                  <Input
                    id="material"
                    value={formData.material}
                    onChange={(e) => updateField("material", e.target.value)}
                    placeholder="e.g., Colorsteel, Zincalume"
                  />
                </div>
                <div>
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    value={formData.manufacturer}
                    onChange={(e) => updateField("manufacturer", e.target.value)}
                    placeholder="e.g., NZ Steel"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="pitch">Pitch (degrees)</Label>
                  <Input
                    id="pitch"
                    type="number"
                    step="0.1"
                    value={formData.pitch}
                    onChange={(e) => updateField("pitch", e.target.value)}
                    placeholder="e.g., 15"
                  />
                </div>
                <div>
                  <Label htmlFor="area">Area (m²)</Label>
                  <Input
                    id="area"
                    type="number"
                    step="0.1"
                    value={formData.area}
                    onChange={(e) => updateField("area", e.target.value)}
                    placeholder="e.g., 120"
                  />
                </div>
                <div>
                  <Label htmlFor="conditionRating">Condition Rating</Label>
                  <NativeSelect
                    id="conditionRating"
                    value={formData.conditionRating}
                    onChange={(e) =>
                      updateField("conditionRating", e.target.value)
                    }
                  >
                    {CONDITION_RATINGS.map((rating) => (
                      <option key={rating.value} value={rating.value}>
                        {rating.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              </div>

              <div>
                <Label htmlFor="conditionNotes">Condition Notes</Label>
                <Textarea
                  id="conditionNotes"
                  value={formData.conditionNotes}
                  onChange={(e) => updateField("conditionNotes", e.target.value)}
                  placeholder="Notes about the condition of this element..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={cancelForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingId ? "Update Element" : "Add Element"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Elements list */}
      {elements.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Layers className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No elements recorded</h3>
              <p className="mt-2 text-muted-foreground">
                Start documenting the roof components.
              </p>
              <Button className="mt-4" onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Element
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {elements.map((element) => (
            <Card key={element.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                      <h3 className="font-semibold">
                        {element.elementType.replace(/_/g, " ")}
                      </h3>
                      {element.conditionRating && (
                        <ConditionBadge condition={element.conditionRating as ConditionRating} />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span>{element.location}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mt-2">
                      {element.material && (
                        <div>
                          <span className="text-muted-foreground">Material:</span>{" "}
                          <span className="text-foreground">{element.material}</span>
                        </div>
                      )}
                      {element.claddingType && (
                        <div>
                          <span className="text-muted-foreground">Type:</span>{" "}
                          <span className="text-foreground">{element.claddingType}</span>
                        </div>
                      )}
                      {element.pitch && (
                        <div>
                          <span className="text-muted-foreground">Pitch:</span>{" "}
                          <span className="text-foreground">{element.pitch}&deg;</span>
                        </div>
                      )}
                      {element.area && (
                        <div>
                          <span className="text-muted-foreground">Area:</span>{" "}
                          <span className="text-foreground">{element.area} m&sup2;</span>
                        </div>
                      )}
                    </div>

                    {element.conditionNotes && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {element.conditionNotes}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1 ml-4 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(element)}
                      className="h-8 w-8"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(element.id)}
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
