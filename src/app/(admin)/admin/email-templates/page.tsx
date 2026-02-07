"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Mail,
  Edit,
  Loader2,
  Download,
  CheckCircle,
  XCircle,
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

function formatType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/admin/email-templates");
      if (!response.ok) throw new Error("Failed to fetch email templates");
      const data = await response.json();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDefaults = async () => {
    if (!confirm("This will create or update default email templates. Continue?"))
      return;

    setSeeding(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/email-templates/seed", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to seed templates");
      }

      const data = await response.json();
      setSuccess(data.message || "Default templates seeded successfully");
      await fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
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
          <h1 className="text-3xl font-bold tracking-tight">
            Email Templates
          </h1>
          <p className="text-muted-foreground">
            Manage email notification templates. Edit subjects, HTML content,
            and plain text for each notification type.
          </p>
        </div>
        {templates.length === 0 && (
          <Button
            variant="outline"
            onClick={handleSeedDefaults}
            disabled={seeding}
          >
            {seeding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Seeding...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Seed Defaults
              </>
            )}
          </Button>
        )}
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
              <Mail className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">
                No email templates yet
              </h3>
              <p className="mt-2 text-muted-foreground">
                Seed default templates from the system to get started.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={handleSeedDefaults}
                disabled={seeding}
              >
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
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Templates</CardTitle>
            <CardDescription>
              {templates.length} email template{templates.length !== 1 ? "s" : ""}{" "}
              configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{template.name}</h3>
                      {template.isActive ? (
                        <Badge
                          variant="outline"
                          className="text-green-700 border-green-300 bg-green-50"
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="mr-1 h-3 w-3" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                        {template.type}
                      </span>
                      <span className="truncate">
                        Subject: {template.subject}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Updated{" "}
                      {new Date(template.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Link href={`/admin/email-templates/${template.id}`}>
                    <Button variant="outline" size="sm">
                      <Edit className="mr-2 h-3 w-3" />
                      Edit
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
