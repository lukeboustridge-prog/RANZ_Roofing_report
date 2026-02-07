"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Code,
  Variable,
} from "lucide-react";

interface EmailTemplate {
  id: string;
  type: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  variables: Record<string, string>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Sample data for preview variable substitution
const SAMPLE_DATA: Record<string, string> = {
  reportNumber: "RANZ-2025-001234",
  propertyAddress: "42 Example Street, Wellington 6011",
  inspectorName: "John Smith",
  inspectorEmail: "john.smith@example.com",
  reviewerName: "Jane Doe",
  reportUrl: "https://reports.ranz.org.nz/reports/example-id",
  reason: "Insufficient photographic evidence of roof penetration defects.",
  criticalCount: "2",
  issueCount: "3",
  noteCount: "1",
  suggestionCount: "1",
  totalComments: "7",
  clientName: "Bob Wilson",
  clientEmail: "bob@example.com",
  requestType: "Full Inspection",
  urgency: "STANDARD",
  scheduledDate: "15 March 2025",
  notes: "Access via side gate. Dog in backyard.",
  assignmentUrl: "https://reports.ranz.org.nz/assignments/example-id",
  commentCount: "3",
};

function substituteVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

export default function EmailTemplateEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { toast } = useToast();

  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Form state
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [isActive, setIsActive] = useState(true);

  const fetchTemplate = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/email-templates/${id}`);
      if (!response.ok) throw new Error("Failed to fetch template");
      const data: EmailTemplate = await response.json();
      setTemplate(data);
      setSubject(data.subject);
      setBodyHtml(data.bodyHtml);
      setBodyText(data.bodyText);
      setIsActive(data.isActive);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  const handleSave = async () => {
    setSaving(true);

    try {
      const response = await fetch(`/api/admin/email-templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          bodyHtml,
          bodyText,
          isActive,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save template");
      }

      const data = await response.json();

      // Show warnings if any variables are missing
      if (data.warnings && data.warnings.length > 0) {
        toast({
          title: "Template saved with warnings",
          description: data.warnings.join("; "),
          variant: "info",
        });
      } else {
        toast({
          title: "Template saved",
          description: "Email template updated successfully.",
          variant: "success",
        });
      }

      // Update local template state with saved data
      setTemplate((prev) =>
        prev
          ? {
              ...prev,
              subject,
              bodyHtml,
              bodyText,
              isActive,
              updatedAt: new Date().toISOString(),
            }
          : prev
      );
    } catch (err) {
      toast({
        title: "Error saving template",
        description:
          err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Generate preview HTML with sample variable substitution
  const previewHtml = substituteVariables(bodyHtml, SAMPLE_DATA);
  const previewSubject = substituteVariables(subject, SAMPLE_DATA);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="space-y-8">
        <div className="space-y-1">
          <Link
            href="/admin/email-templates"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Email Templates
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">
            Template Not Found
          </h1>
        </div>
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          {error || "Email template not found."}
        </div>
      </div>
    );
  }

  const variableNames = Object.keys(template.variables || {});

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Link
            href="/admin/email-templates"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Email Templates
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">
            {template.name}
          </h1>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="font-mono text-xs"
            >
              {template.type}
            </Badge>
          </div>
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
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Available Variables */}
      {variableNames.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Variable className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Available Variables</CardTitle>
            </div>
            <CardDescription>
              Use these placeholders in your subject, HTML body, and text body.
              They will be replaced with actual values when sending.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {variableNames.map((varName) => (
                <code
                  key={varName}
                  className="px-2 py-1 bg-muted rounded text-sm font-mono cursor-default"
                  title={`Type: ${template.variables[varName]}`}
                >
                  {"{{"}
                  {varName}
                  {"}}"}
                </code>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="isActive">Active</Label>
              <p className="text-sm text-muted-foreground">
                When inactive, the system will use the hardcoded default
                template instead.
              </p>
            </div>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </CardContent>
      </Card>

      {/* Subject */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subject Line</CardTitle>
          <CardDescription>
            The email subject. Use {"{{variable}}"} placeholders for dynamic
            content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject..."
          />
        </CardContent>
      </Card>

      {/* HTML Body */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Code className="h-4 w-4" />
                HTML Body
              </CardTitle>
              <CardDescription>
                The HTML content of the email. This is wrapped in the RANZ
                branded email template automatically.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? (
                <>
                  <EyeOff className="mr-2 h-3 w-3" />
                  Hide Preview
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-3 w-3" />
                  Show Preview
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            id="bodyHtml"
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            placeholder="HTML email body..."
            className="font-mono text-sm min-h-[300px]"
          />
        </CardContent>
      </Card>

      {/* Preview */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Email Preview
            </CardTitle>
            <CardDescription>
              Preview with sample data substituted for variables.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Subject</Label>
              <p className="font-medium">{previewSubject}</p>
            </div>
            <div className="border rounded-md overflow-hidden">
              {/* RANZ branded wrapper preview */}
              <div
                style={{
                  fontFamily:
                    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  lineHeight: 1.5,
                  color: "#111827",
                  maxWidth: "600px",
                  margin: "0 auto",
                  padding: "20px",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    backgroundColor: "#2d5c8f",
                    padding: "20px",
                    borderRadius: "8px 8px 0 0",
                  }}
                >
                  <h1
                    style={{
                      color: "white",
                      margin: 0,
                      fontSize: "20px",
                    }}
                  >
                    RANZ Roofing Report
                  </h1>
                </div>
                {/* Content */}
                <div
                  style={{
                    backgroundColor: "#f9fafb",
                    padding: "24px",
                    border: "1px solid #e5e7eb",
                    borderTop: "none",
                    borderRadius: "0 0 8px 8px",
                  }}
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
                {/* Footer */}
                <div
                  style={{
                    textAlign: "center" as const,
                    padding: "16px",
                    color: "#6b7280",
                    fontSize: "12px",
                  }}
                >
                  <p style={{ margin: 0 }}>
                    This is an automated notification from RANZ Roofing Report
                    Platform
                  </p>
                  <p style={{ margin: "8px 0 0 0" }}>
                    Please do not reply to this email.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plain Text Body */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plain Text Body</CardTitle>
          <CardDescription>
            Fallback text version for email clients that do not support HTML.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            id="bodyText"
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            placeholder="Plain text email body..."
            className="font-mono text-sm min-h-[120px]"
          />
        </CardContent>
      </Card>

      {/* Bottom Save Button */}
      <div className="flex items-center gap-4 pb-8">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
        <Link href="/admin/email-templates">
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>
    </div>
  );
}
