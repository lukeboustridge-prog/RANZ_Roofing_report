"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Plus,
  FileText,
  Edit,
  Trash2,
  Star,
  Loader2,
  Download,
  Layers,
  CheckSquare,
} from "lucide-react";

const INSPECTION_TYPES = [
  { value: "FULL_INSPECTION", label: "Full Inspection" },
  { value: "VISUAL_ONLY", label: "Visual Only" },
  { value: "NON_INVASIVE", label: "Non-Invasive" },
  { value: "INVASIVE", label: "Invasive" },
  { value: "DISPUTE_RESOLUTION", label: "Dispute Resolution" },
  { value: "PRE_PURCHASE", label: "Pre-Purchase" },
  { value: "MAINTENANCE_REVIEW", label: "Maintenance Review" },
];

interface Template {
  id: string;
  name: string;
  description: string | null;
  inspectionType: string;
  sections: unknown;
  checklists: unknown;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/admin/templates");
      if (!response.ok) throw new Error("Failed to fetch templates");
      const data = await response.json();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const response = await fetch(`/api/admin/templates/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete template");
      }

      await fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const getTypeLabel = (type: string) => {
    return INSPECTION_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getSectionCount = (sections: unknown) => {
    if (Array.isArray(sections)) return sections.length;
    if (sections && typeof sections === "object") return Object.keys(sections).length;
    return 0;
  };

  const getChecklistCount = (checklists: unknown) => {
    if (Array.isArray(checklists)) return checklists.length;
    return 0;
  };

  const handleSeedTemplates = async () => {
    if (!confirm("This will create or update default templates. Continue?")) return;

    setSeeding(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/templates/seed", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to seed templates");
      }

      const data = await response.json();
      setSuccess(data.message);
      await fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSeeding(false);
    }
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
            href="/admin"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Report Templates</h1>
          <p className="text-muted-foreground">
            Manage report templates for different inspection types.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSeedTemplates} disabled={seeding}>
            {seeding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Seeding...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Seed Default Templates
              </>
            )}
          </Button>
          <Link href="/admin/templates/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 text-green-700 border border-green-200 rounded-md">
          {success}
        </div>
      )}

      {/* Templates List */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No templates yet</h3>
              <p className="mt-2 text-muted-foreground">
                Create your first report template or seed default templates to get started.
              </p>
              <div className="flex justify-center gap-2 mt-4">
                <Button variant="outline" onClick={handleSeedTemplates} disabled={seeding}>
                  <Download className="mr-2 h-4 w-4" />
                  Seed Defaults
                </Button>
                <Link href="/admin/templates/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Template
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className={!template.isActive ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {template.name}
                      {template.isDefault && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      )}
                    </CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{getTypeLabel(template.inspectionType)}</Badge>
                    {!template.isActive && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>

                  {/* Sections and Checklists Info */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5" />
                      {getSectionCount(template.sections)} sections
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckSquare className="h-3.5 w-3.5" />
                      {getChecklistCount(template.checklists)} checklists
                    </span>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Updated {new Date(template.updatedAt).toLocaleDateString()}
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/admin/templates/${template.id}`} className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Edit className="mr-2 h-3 w-3" />
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="h-3 w-3" />
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
