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
import {
  ArrowLeft,
  Plus,
  Loader2,
  Save,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Star,
  Layers,
  Type,
  Hash,
  ToggleLeft,
  AlignLeft,
  List,
  AlertCircle,
} from "lucide-react";

const INSPECTION_TYPES = [
  { value: "FULL_INSPECTION", label: "Full Inspection" },
  { value: "VISUAL_ONLY", label: "Visual Only" },
  { value: "NON_INVASIVE", label: "Non-Invasive" },
  { value: "INVASIVE", label: "Invasive" },
  { value: "DISPUTE_RESOLUTION", label: "Dispute Resolution" },
  { value: "PRE_PURCHASE", label: "Pre-Purchase" },
  { value: "MAINTENANCE_REVIEW", label: "Maintenance Review" },
  { value: "WARRANTY_CLAIM", label: "Warranty Claim" },
];

const FIELD_TYPES = [
  { value: "text", label: "Text", icon: Type },
  { value: "textarea", label: "Text Area", icon: AlignLeft },
  { value: "number", label: "Number", icon: Hash },
  { value: "select", label: "Dropdown", icon: List },
  { value: "checkbox", label: "Checkbox", icon: ToggleLeft },
];

interface TemplateField {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox" | "number";
  placeholder?: string;
  options?: string[];
  defaultValue?: string;
  required: boolean;
}

interface TemplateSection {
  id: string;
  name: string;
  description?: string;
  required: boolean;
  order: number;
  fields: TemplateField[];
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  inspectionType: string;
  sections: TemplateSection[];
  checklists: string[] | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [inspectionType, setInspectionType] = useState("FULL_INSPECTION");
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [checklists, setChecklists] = useState<string[]>([]);

  useEffect(() => {
    if (templateId !== "new") {
      fetchTemplate();
    } else {
      setLoading(false);
    }
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      const response = await fetch(`/api/admin/templates/${templateId}`);
      if (!response.ok) throw new Error("Failed to fetch template");
      const data = await response.json();
      setTemplate(data);
      setName(data.name);
      setDescription(data.description || "");
      setInspectionType(data.inspectionType);
      setIsDefault(data.isDefault);
      setIsActive(data.isActive);
      setSections(Array.isArray(data.sections) ? data.sections : []);
      setChecklists(Array.isArray(data.checklists) ? data.checklists : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const url = templateId === "new"
        ? "/api/admin/templates"
        : `/api/admin/templates/${templateId}`;
      const method = templateId === "new" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          type: inspectionType,
          inspectionType,
          sections,
          checklists,
          isDefault,
          isActive,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save template");
      }

      const data = await response.json();
      setSuccess("Template saved successfully");

      if (templateId === "new") {
        router.push(`/admin/templates/${data.id}`);
      } else {
        setTemplate(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const toggleSectionExpanded = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const addSection = () => {
    const newSection: TemplateSection = {
      id: `section_${Date.now()}`,
      name: "New Section",
      description: "",
      required: false,
      order: sections.length + 1,
      fields: [],
    };
    setSections([...sections, newSection]);
    setExpandedSections((prev) => new Set(prev).add(newSection.id));
  };

  const updateSection = (index: number, updates: Partial<TemplateSection>) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], ...updates };
    setSections(newSections);
  };

  const deleteSection = (index: number) => {
    if (!confirm("Are you sure you want to delete this section?")) return;
    setSections(sections.filter((_, i) => i !== index));
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === sections.length - 1) return;

    const newSections = [...sections];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];

    // Update order numbers
    newSections.forEach((section, i) => {
      section.order = i + 1;
    });

    setSections(newSections);
  };

  const addField = (sectionIndex: number) => {
    const newField: TemplateField = {
      id: `field_${Date.now()}`,
      label: "New Field",
      type: "text",
      required: false,
    };
    const newSections = [...sections];
    newSections[sectionIndex].fields.push(newField);
    setSections(newSections);
  };

  const updateField = (sectionIndex: number, fieldIndex: number, updates: Partial<TemplateField>) => {
    const newSections = [...sections];
    newSections[sectionIndex].fields[fieldIndex] = {
      ...newSections[sectionIndex].fields[fieldIndex],
      ...updates,
    };
    setSections(newSections);
  };

  const deleteField = (sectionIndex: number, fieldIndex: number) => {
    const newSections = [...sections];
    newSections[sectionIndex].fields = newSections[sectionIndex].fields.filter(
      (_, i) => i !== fieldIndex
    );
    setSections(newSections);
  };

  const getTypeLabel = (type: string) => {
    return INSPECTION_TYPES.find((t) => t.value === type)?.label || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Link
            href="/admin/templates"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">
            {templateId === "new" ? "New Template" : `Edit: ${template?.name}`}
          </h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Template
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 text-green-700 border border-green-200 rounded-md">
          {success}
        </div>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Template Details</CardTitle>
          <CardDescription>Basic information about this template</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Standard Full Inspection"
              />
            </div>
            <div>
              <Label htmlFor="type">Inspection Type</Label>
              <NativeSelect
                id="type"
                value={inspectionType}
                onChange={(e) => setInspectionType(e.target.value)}
              >
                {INSPECTION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of when to use this template..."
              rows={2}
            />
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-yellow-500" />
                Default template for {getTypeLabel(inspectionType)}
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm">Active (available for use)</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Sections Builder */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Template Sections
              </CardTitle>
              <CardDescription>
                Define the sections and fields that will appear in reports using this template
              </CardDescription>
            </div>
            <Button onClick={addSection}>
              <Plus className="mr-2 h-4 w-4" />
              Add Section
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Layers className="mx-auto h-12 w-12 mb-4" />
              <p>No sections yet. Add sections to define the structure of reports.</p>
              <Button variant="outline" className="mt-4" onClick={addSection}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Section
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {sections.map((section, sectionIndex) => (
                <div
                  key={section.id}
                  className="border rounded-lg"
                >
                  {/* Section Header */}
                  <div className="p-4 bg-muted/30 flex items-center gap-4">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />

                    <div className="flex-1 flex items-center gap-4">
                      <div className="flex-1">
                        <Input
                          value={section.name}
                          onChange={(e) => updateSection(sectionIndex, { name: e.target.value })}
                          className="font-medium bg-transparent border-0 p-0 h-auto focus-visible:ring-0"
                          placeholder="Section name"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        {section.required && (
                          <Badge variant="secondary" className="text-xs">Required</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {section.fields.length} fields
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveSection(sectionIndex, "up")}
                        disabled={sectionIndex === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveSection(sectionIndex, "down")}
                        disabled={sectionIndex === sections.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleSectionExpanded(section.id)}
                      >
                        {expandedSections.has(section.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteSection(sectionIndex)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Section Content (expanded) */}
                  {expandedSections.has(section.id) && (
                    <div className="p-4 space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label>Description</Label>
                          <Input
                            value={section.description || ""}
                            onChange={(e) =>
                              updateSection(sectionIndex, { description: e.target.value })
                            }
                            placeholder="Brief description of this section"
                          />
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={section.required}
                              onChange={(e) =>
                                updateSection(sectionIndex, { required: e.target.checked })
                              }
                              className="h-4 w-4"
                            />
                            <span className="text-sm">Required section</span>
                          </label>
                        </div>
                      </div>

                      {/* Fields */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Fields</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addField(sectionIndex)}
                          >
                            <Plus className="mr-2 h-3 w-3" />
                            Add Field
                          </Button>
                        </div>

                        {section.fields.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground text-sm border rounded-md">
                            No fields yet. Add fields to capture data in this section.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {section.fields.map((field, fieldIndex) => (
                              <div
                                key={field.id}
                                className="p-3 border rounded-md bg-background"
                              >
                                <div className="grid gap-3 md:grid-cols-4">
                                  <div>
                                    <Label className="text-xs">Label</Label>
                                    <Input
                                      value={field.label}
                                      onChange={(e) =>
                                        updateField(sectionIndex, fieldIndex, {
                                          label: e.target.value,
                                        })
                                      }
                                      placeholder="Field label"
                                      className="h-8"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Type</Label>
                                    <NativeSelect
                                      value={field.type}
                                      onChange={(e) =>
                                        updateField(sectionIndex, fieldIndex, {
                                          type: e.target.value as TemplateField["type"],
                                        })
                                      }
                                      className="h-8"
                                    >
                                      {FIELD_TYPES.map((type) => (
                                        <option key={type.value} value={type.value}>
                                          {type.label}
                                        </option>
                                      ))}
                                    </NativeSelect>
                                  </div>
                                  <div>
                                    <Label className="text-xs">Default Value</Label>
                                    <Input
                                      value={field.defaultValue || ""}
                                      onChange={(e) =>
                                        updateField(sectionIndex, fieldIndex, {
                                          defaultValue: e.target.value,
                                        })
                                      }
                                      placeholder="Default value"
                                      className="h-8"
                                    />
                                  </div>
                                  <div className="flex items-end gap-2">
                                    <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                                      <input
                                        type="checkbox"
                                        checked={field.required}
                                        onChange={(e) =>
                                          updateField(sectionIndex, fieldIndex, {
                                            required: e.target.checked,
                                          })
                                        }
                                        className="h-3 w-3"
                                      />
                                      Required
                                    </label>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => deleteField(sectionIndex, fieldIndex)}
                                    >
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                  </div>
                                </div>

                                {/* Options for select fields */}
                                {field.type === "select" && (
                                  <div className="mt-2">
                                    <Label className="text-xs">Options (comma-separated)</Label>
                                    <Input
                                      value={(field.options || []).join(", ")}
                                      onChange={(e) =>
                                        updateField(sectionIndex, fieldIndex, {
                                          options: e.target.value
                                            .split(",")
                                            .map((o) => o.trim())
                                            .filter(Boolean),
                                        })
                                      }
                                      placeholder="Option 1, Option 2, Option 3"
                                      className="h-8"
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checklists */}
      <Card>
        <CardHeader>
          <CardTitle>Associated Checklists</CardTitle>
          <CardDescription>
            Select which compliance checklists should be included with this template
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {["e2_as1", "metal_roof_cop", "b2_durability"].map((checklist) => (
              <label key={checklist} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklists.includes(checklist)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setChecklists([...checklists, checklist]);
                    } else {
                      setChecklists(checklists.filter((c) => c !== checklist));
                    }
                  }}
                  className="h-4 w-4"
                />
                <span className="text-sm">
                  {checklist === "e2_as1" && "E2/AS1 External Moisture"}
                  {checklist === "metal_roof_cop" && "Metal Roof Code of Practice"}
                  {checklist === "b2_durability" && "B2 Durability"}
                </span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save Button (bottom) */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push("/admin/templates")}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Template
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
