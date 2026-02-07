"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Check, FileText } from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string | null;
  inspectionType: string;
  isDefault: boolean;
}

interface TemplateSelectorProps {
  selectedTemplateId: string | null;
  onSelect: (templateId: string | null, inspectionType?: string) => void;
}

export function TemplateSelector({ selectedTemplateId, onSelect }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/templates");

        if (!response.ok) {
          throw new Error("Failed to fetch templates");
        }

        const data = await response.json();
        setTemplates(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("Error fetching templates:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleTemplateClick = (template: Template | null) => {
    if (template) {
      onSelect(template.id, template.inspectionType);
    } else {
      onSelect(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-destructive/10 text-destructive rounded-md text-sm">
          {error}
        </div>
        <p className="text-sm text-muted-foreground">
          You can continue without selecting a template.
        </p>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="space-y-4">
        <div className="p-6 bg-muted/50 rounded-md text-center">
          <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No templates available. You can create templates in the admin panel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select a template to pre-fill report fields, or skip to create a blank report.
      </p>

      {/* No template option */}
      <Card
        className={`cursor-pointer transition-all hover:border-[var(--ranz-blue-500)] ${
          selectedTemplateId === null
            ? "ring-2 ring-[var(--ranz-blue-500)] border-[var(--ranz-blue-500)]"
            : ""
        }`}
        onClick={() => handleTemplateClick(null)}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">No Template</CardTitle>
              <CardDescription>Start with a blank report</CardDescription>
            </div>
            {selectedTemplateId === null && (
              <Check className="h-5 w-5 text-[var(--ranz-blue-500)]" />
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Template cards */}
      {templates.map((template) => (
        <Card
          key={template.id}
          className={`cursor-pointer transition-all hover:border-[var(--ranz-blue-500)] ${
            selectedTemplateId === template.id
              ? "ring-2 ring-[var(--ranz-blue-500)] border-[var(--ranz-blue-500)]"
              : ""
          }`}
          onClick={() => handleTemplateClick(template)}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  {template.isDefault && (
                    <Badge variant="secondary" className="text-xs">
                      Default
                    </Badge>
                  )}
                </div>
                {template.description && (
                  <CardDescription className="line-clamp-2">
                    {template.description}
                  </CardDescription>
                )}
              </div>
              {selectedTemplateId === template.id && (
                <Check className="h-5 w-5 text-[var(--ranz-blue-500)] ml-2 flex-shrink-0" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="text-xs">
              {formatInspectionType(template.inspectionType)}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Format inspection type enum to readable label
 */
function formatInspectionType(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}
