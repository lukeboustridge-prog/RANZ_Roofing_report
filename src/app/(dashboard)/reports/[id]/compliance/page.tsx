"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Save,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MinusCircle,
  ChevronDown,
  ChevronUp,
  Shield,
} from "lucide-react";

// Types
interface ChecklistItem {
  id: string;
  section: string;
  item: string;
  description: string;
  required: boolean;
}

interface Checklist {
  id: string;
  name: string;
  category: string;
  standard: string | null;
  items: ChecklistItem[];
}

interface ChecklistResults {
  [checklistKey: string]: {
    [itemId: string]: string;
  };
}

interface ItemNotes {
  [itemId: string]: string;
}

type ComplianceStatus = "pass" | "fail" | "partial" | "na" | "";

const STATUS_OPTIONS: { value: ComplianceStatus; label: string }[] = [
  { value: "", label: "Select..." },
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
  { value: "partial", label: "Partial" },
  { value: "na", label: "N/A" },
];

const STATUS_ICONS: Record<ComplianceStatus, React.ReactNode> = {
  pass: <CheckCircle2 className="h-5 w-5 text-green-600" />,
  fail: <XCircle className="h-5 w-5 text-red-600" />,
  partial: <AlertTriangle className="h-5 w-5 text-orange-500" />,
  na: <MinusCircle className="h-5 w-5 text-gray-400" />,
  "": null,
};

const STATUS_COLORS: Record<ComplianceStatus, string> = {
  pass: "border-l-green-500 bg-green-50/50",
  fail: "border-l-red-500 bg-red-50/50",
  partial: "border-l-orange-500 bg-orange-50/50",
  na: "border-l-gray-300 bg-gray-50/50",
  "": "border-l-gray-200",
};

export default function ComplianceAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;

  // State
  const [checklists, setChecklists] = useState<Record<string, Checklist>>({});
  const [results, setResults] = useState<ChecklistResults>({});
  const [notes, setNotes] = useState<ItemNotes>({});
  const [nonComplianceSummary, setNonComplianceSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const [expandedChecklists, setExpandedChecklists] = useState<Set<string>>(
    new Set()
  );

  // Fetch checklists and existing assessment
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch checklists
        const checklistsRes = await fetch("/api/compliance");
        if (!checklistsRes.ok) throw new Error("Failed to fetch checklists");
        const checklistsData = await checklistsRes.json();
        setChecklists(checklistsData.data);

        // Initialize expanded state - expand all by default
        setExpandedChecklists(new Set(Object.keys(checklistsData.data)));

        // Fetch existing assessment
        const assessmentRes = await fetch(`/api/compliance/${reportId}`);
        if (assessmentRes.ok) {
          const assessmentData = await assessmentRes.json();
          if (assessmentData.data) {
            setResults(assessmentData.data.checklistResults || {});
            setNonComplianceSummary(
              assessmentData.data.nonComplianceSummary || ""
            );
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [reportId]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (Object.keys(results).length > 0) {
        handleSave(true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [results, nonComplianceSummary]);

  // Update item status
  const updateItemStatus = (
    checklistKey: string,
    itemId: string,
    status: string
  ) => {
    setResults((prev) => ({
      ...prev,
      [checklistKey]: {
        ...(prev[checklistKey] || {}),
        [itemId]: status,
      },
    }));
  };

  // Update item notes
  const updateItemNotes = (itemId: string, noteText: string) => {
    setNotes((prev) => ({
      ...prev,
      [itemId]: noteText,
    }));
  };

  // Toggle checklist expansion
  const toggleChecklist = (key: string) => {
    setExpandedChecklists((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Generate non-compliance summary
  const generateNonComplianceSummary = useCallback(() => {
    const failedItems: string[] = [];

    Object.entries(checklists).forEach(([key, checklist]) => {
      const checklistResults = results[key] || {};
      checklist.items.forEach((item) => {
        const status = checklistResults[item.id];
        if (status === "fail" || status === "partial") {
          failedItems.push(
            `${item.section} - ${item.item}: ${status === "fail" ? "Non-compliant" : "Partial compliance"}`
          );
        }
      });
    });

    if (failedItems.length > 0) {
      setNonComplianceSummary(
        `Non-compliance items identified:\n\n${failedItems.join("\n")}`
      );
    }
  }, [checklists, results]);

  // Save assessment
  const handleSave = async (isAutoSave = false) => {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/compliance/${reportId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklistResults: results,
          nonComplianceSummary,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save assessment");
      }

      setLastSaved(new Date());
    } catch (err) {
      if (!isAutoSave) {
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  };

  // Calculate completion percentage
  const calculateCompletion = () => {
    let totalRequired = 0;
    let completedRequired = 0;

    Object.entries(checklists).forEach(([key, checklist]) => {
      const checklistResults = results[key] || {};
      checklist.items.forEach((item) => {
        if (item.required) {
          totalRequired++;
          if (checklistResults[item.id]) {
            completedRequired++;
          }
        }
      });
    });

    return totalRequired > 0
      ? Math.round((completedRequired / totalRequired) * 100)
      : 0;
  };

  // Check for incomplete required items
  const getIncompleteItems = () => {
    const incomplete: string[] = [];

    Object.entries(checklists).forEach(([key, checklist]) => {
      const checklistResults = results[key] || {};
      checklist.items.forEach((item) => {
        if (item.required && !checklistResults[item.id]) {
          incomplete.push(`${checklist.name}: ${item.section} - ${item.item}`);
        }
      });
    });

    return incomplete;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const completion = calculateCompletion();
  const incompleteItems = getIncompleteItems();

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
          <h1 className="text-3xl font-bold tracking-tight">
            Compliance Assessment
          </h1>
          <p className="text-muted-foreground">
            Assess building code and industry standard compliance for this
            inspection.
          </p>
        </div>

        {/* Save status */}
        <div className="flex items-center gap-4">
          {lastSaved && (
            <span className="text-sm text-muted-foreground">
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <Button onClick={() => handleSave()} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Completion Progress</span>
            <span className="text-sm text-muted-foreground">
              {completion}% complete
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-[var(--ranz-blue-500)] h-2 rounded-full transition-all"
              style={{ width: `${completion}%` }}
            />
          </div>
          {incompleteItems.length > 0 && completion < 100 && (
            <p className="mt-2 text-sm text-muted-foreground">
              {incompleteItems.length} required items remaining
            </p>
          )}
        </CardContent>
      </Card>

      {/* Checklists */}
      <div className="space-y-6">
        {Object.entries(checklists).map(([key, checklist]) => {
          const isExpanded = expandedChecklists.has(key);
          const checklistResults = results[key] || {};

          // Calculate checklist stats
          const stats = checklist.items.reduce(
            (acc, item) => {
              const status = checklistResults[item.id] as ComplianceStatus;
              if (status === "pass") acc.pass++;
              else if (status === "fail") acc.fail++;
              else if (status === "partial") acc.partial++;
              else if (status === "na") acc.na++;
              else acc.pending++;
              return acc;
            },
            { pass: 0, fail: 0, partial: 0, na: 0, pending: 0 }
          );

          return (
            <Card key={key}>
              <CardHeader
                className="cursor-pointer"
                onClick={() => toggleChecklist(key)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-[var(--ranz-blue-500)]" />
                    <div>
                      <CardTitle className="text-lg">{checklist.name}</CardTitle>
                      <CardDescription>
                        {checklist.items.length} assessment items
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Stats badges */}
                    <div className="flex gap-2">
                      {stats.pass > 0 && (
                        <Badge
                          variant="outline"
                          className="border-green-500 text-green-700"
                        >
                          {stats.pass} Pass
                        </Badge>
                      )}
                      {stats.fail > 0 && (
                        <Badge
                          variant="outline"
                          className="border-red-500 text-red-700"
                        >
                          {stats.fail} Fail
                        </Badge>
                      )}
                      {stats.partial > 0 && (
                        <Badge
                          variant="outline"
                          className="border-orange-500 text-orange-700"
                        >
                          {stats.partial} Partial
                        </Badge>
                      )}
                      {stats.pending > 0 && (
                        <Badge variant="secondary">{stats.pending} Pending</Badge>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="space-y-4">
                  {checklist.items.map((item) => {
                    const status = (checklistResults[item.id] ||
                      "") as ComplianceStatus;

                    return (
                      <div
                        key={item.id}
                        className={`border-l-4 rounded-md p-4 ${STATUS_COLORS[status]}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-sm text-muted-foreground">
                                {item.section}
                              </span>
                              {item.required && (
                                <span className="text-red-500">*</span>
                              )}
                              {STATUS_ICONS[status]}
                            </div>
                            <h4 className="font-medium">{item.item}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {item.description}
                            </p>
                          </div>

                          <div className="flex flex-col gap-2 min-w-[140px]">
                            <Select
                              value={status}
                              onChange={(e) =>
                                updateItemStatus(key, item.id, e.target.value)
                              }
                              aria-label={`Compliance status for ${item.item}`}
                            >
                              {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </Select>
                          </div>
                        </div>

                        {/* Notes field for fail/partial items */}
                        {(status === "fail" || status === "partial") && (
                          <div className="mt-3">
                            <Label
                              htmlFor={`notes-${item.id}`}
                              className="text-sm"
                            >
                              Notes
                            </Label>
                            <Textarea
                              id={`notes-${item.id}`}
                              value={notes[item.id] || ""}
                              onChange={(e) =>
                                updateItemNotes(item.id, e.target.value)
                              }
                              placeholder="Add notes about this non-compliance..."
                              rows={2}
                              className="mt-1"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Non-Compliance Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Non-Compliance Summary</CardTitle>
              <CardDescription>
                Summary of all non-compliant items for the final report
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={generateNonComplianceSummary}
            >
              Auto-Generate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={nonComplianceSummary}
            onChange={(e) => setNonComplianceSummary(e.target.value)}
            placeholder="Enter a summary of non-compliance findings..."
            rows={6}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" asChild>
          <Link href={`/reports/${reportId}/defects`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Defects
          </Link>
        </Button>

        <div className="flex gap-2">
          <Button onClick={() => handleSave()} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Progress
          </Button>
          <Button asChild>
            <Link href={`/reports/${reportId}/pdf`}>
              Continue to PDF
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Validation warnings */}
      {incompleteItems.length > 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h4 className="font-medium text-yellow-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Required items not yet assessed
          </h4>
          <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
            {incompleteItems.slice(0, 5).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
            {incompleteItems.length > 5 && (
              <li>...and {incompleteItems.length - 5} more</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
