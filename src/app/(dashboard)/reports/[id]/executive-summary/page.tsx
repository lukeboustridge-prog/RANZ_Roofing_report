"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  FileText,
  Plus,
  Trash2,
  Lightbulb,
  Save,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import type { DefectSeverity, DefectClass, ConditionRating } from "@prisma/client";

interface ExecutiveSummary {
  keyFindings: string[];
  majorDefects: string;
  overallCondition: string;
  criticalRecommendations: string[];
}

interface Defect {
  id: string;
  title: string;
  severity: DefectSeverity;
  classification: DefectClass;
  recommendation: string | null;
}

interface RoofElement {
  id: string;
  elementType: string;
  conditionRating: ConditionRating | null;
}

export default function ExecutiveSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const [summary, setSummary] = useState<ExecutiveSummary>({
    keyFindings: [],
    majorDefects: "",
    overallCondition: "",
    criticalRecommendations: [],
  });

  const [defects, setDefects] = useState<Defect[]>([]);
  const [roofElements, setRoofElements] = useState<RoofElement[]>([]);

  // New finding/recommendation input states
  const [newFinding, setNewFinding] = useState("");
  const [newRecommendation, setNewRecommendation] = useState("");

  // Load executive summary
  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch(`/api/reports/${id}/executive-summary`);
        if (!response.ok) {
          throw new Error("Failed to load executive summary");
        }
        const data = await response.json();
        setSummary(data.executiveSummary);
        setDefects(data.defects || []);
        setRoofElements(data.roofElements || []);
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          title: "Error",
          description: "Failed to load executive summary",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [id, toast]);

  // Auto-save with debounce
  const saveData = useCallback(async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/reports/${id}/executive-summary`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(summary),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      setHasUnsavedChanges(false);
      setLastSaved(new Date());
    } catch (error) {
      console.error("Error saving:", error);
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [id, summary, toast]);

  // Debounced auto-save
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const timeout = setTimeout(() => {
      saveData();
    }, 2000);

    return () => clearTimeout(timeout);
  }, [hasUnsavedChanges, saveData]);

  const updateSummary = <K extends keyof ExecutiveSummary>(
    field: K,
    value: ExecutiveSummary[K]
  ) => {
    setSummary((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  // Add key finding
  const addKeyFinding = () => {
    if (!newFinding.trim()) return;
    updateSummary("keyFindings", [...summary.keyFindings, newFinding.trim()]);
    setNewFinding("");
  };

  // Remove key finding
  const removeKeyFinding = (index: number) => {
    updateSummary(
      "keyFindings",
      summary.keyFindings.filter((_, i) => i !== index)
    );
  };

  // Add critical recommendation
  const addCriticalRecommendation = () => {
    if (!newRecommendation.trim()) return;
    updateSummary("criticalRecommendations", [
      ...summary.criticalRecommendations,
      newRecommendation.trim(),
    ]);
    setNewRecommendation("");
  };

  // Remove critical recommendation
  const removeCriticalRecommendation = (index: number) => {
    updateSummary(
      "criticalRecommendations",
      summary.criticalRecommendations.filter((_, i) => i !== index)
    );
  };

  // Generate suggestions based on defects
  const getSuggestedFindings = (): string[] => {
    const suggestions: string[] = [];

    const criticalDefects = defects.filter((d) => d.severity === "CRITICAL");
    const highDefects = defects.filter((d) => d.severity === "HIGH");
    const majorDefects = defects.filter((d) => d.classification === "MAJOR_DEFECT");
    const safetyHazards = defects.filter((d) => d.classification === "SAFETY_HAZARD");

    if (criticalDefects.length > 0) {
      suggestions.push(
        `${criticalDefects.length} critical defect${criticalDefects.length > 1 ? "s" : ""} requiring immediate attention`
      );
    }

    if (highDefects.length > 0) {
      suggestions.push(
        `${highDefects.length} high-priority defect${highDefects.length > 1 ? "s" : ""} identified`
      );
    }

    if (majorDefects.length > 0) {
      suggestions.push(
        `${majorDefects.length} major defect${majorDefects.length > 1 ? "s" : ""} affecting serviceability or structure`
      );
    }

    if (safetyHazards.length > 0) {
      suggestions.push(
        `${safetyHazards.length} safety hazard${safetyHazards.length > 1 ? "s" : ""} requiring attention`
      );
    }

    // Condition-based suggestions
    const poorCondition = roofElements.filter((e) => e.conditionRating === "POOR");
    const criticalCondition = roofElements.filter((e) => e.conditionRating === "CRITICAL");

    if (criticalCondition.length > 0) {
      suggestions.push(
        `${criticalCondition.length} roof element${criticalCondition.length > 1 ? "s" : ""} in critical condition`
      );
    } else if (poorCondition.length > 0) {
      suggestions.push(
        `${poorCondition.length} roof element${poorCondition.length > 1 ? "s" : ""} in poor condition`
      );
    }

    return suggestions.filter(
      (s) => !summary.keyFindings.includes(s)
    );
  };

  // Generate suggested recommendations from defects
  const getSuggestedRecommendations = (): string[] => {
    const suggestions: string[] = [];

    const criticalDefects = defects.filter((d) => d.severity === "CRITICAL");

    criticalDefects.forEach((d) => {
      if (d.recommendation && !summary.criticalRecommendations.includes(d.recommendation)) {
        suggestions.push(d.recommendation);
      }
    });

    return suggestions.slice(0, 5);
  };

  // Generate overall condition suggestion
  const getSuggestedCondition = (): string => {
    const criticalCount = defects.filter((d) => d.severity === "CRITICAL").length;
    const highCount = defects.filter((d) => d.severity === "HIGH").length;
    const criticalElements = roofElements.filter((e) => e.conditionRating === "CRITICAL").length;
    const poorElements = roofElements.filter((e) => e.conditionRating === "POOR").length;

    if (criticalCount > 0 || criticalElements > 0) {
      return "The roof system is in critical condition requiring immediate remediation. Urgent professional intervention is recommended.";
    }

    if (highCount > 2 || poorElements > 2) {
      return "The roof system shows significant signs of deterioration and requires prompt remedial action within the short term.";
    }

    if (highCount > 0 || poorElements > 0) {
      return "The roof system shows some areas requiring attention but is generally serviceable with planned maintenance.";
    }

    if (defects.length === 0) {
      return "The roof system is in good overall condition with no significant defects observed during the inspection.";
    }

    return "The roof system is in fair to good condition with minor items requiring scheduled maintenance.";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const suggestedFindings = getSuggestedFindings();
  const suggestedRecommendations = getSuggestedRecommendations();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link
            href={`/reports/${id}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Report
          </Link>
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-[var(--ranz-blue-600)]" />
            <h1 className="text-2xl font-bold tracking-tight">Executive Summary</h1>
          </div>
          <p className="text-muted-foreground">
            Summarize key findings, overall condition, and critical recommendations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastSaved && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          {hasUnsavedChanges && (
            <span className="text-xs text-orange-500 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Unsaved changes
            </span>
          )}
          <Button
            onClick={saveData}
            disabled={isSaving || !hasUnsavedChanges}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Findings */}
          <Card>
            <CardHeader>
              <CardTitle>Key Findings</CardTitle>
              <CardDescription>
                Bullet points summarizing the most important observations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing findings */}
              {summary.keyFindings.length > 0 && (
                <ul className="space-y-2">
                  {summary.keyFindings.map((finding, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg"
                    >
                      <span className="text-sm flex-1">{finding}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => removeKeyFinding(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Add new finding */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add a key finding..."
                  value={newFinding}
                  onChange={(e) => setNewFinding(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addKeyFinding()}
                />
                <Button onClick={addKeyFinding} disabled={!newFinding.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Suggestions */}
              {suggestedFindings.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Lightbulb className="h-4 w-4" />
                    Suggestions based on defects
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedFindings.map((suggestion, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          updateSummary("keyFindings", [
                            ...summary.keyFindings,
                            suggestion,
                          ]);
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Major Defects Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Major Defects Summary</CardTitle>
              <CardDescription>
                Brief narrative of major defects found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Summarize the major defects discovered during the inspection..."
                rows={4}
                value={summary.majorDefects}
                onChange={(e) => updateSummary("majorDefects", e.target.value)}
              />
              {defects.filter((d) => d.classification === "MAJOR_DEFECT").length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {defects.filter((d) => d.classification === "MAJOR_DEFECT").length} major defects recorded in defects register
                </p>
              )}
            </CardContent>
          </Card>

          {/* Overall Condition */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Condition Assessment</CardTitle>
              <CardDescription>
                Professional assessment of the roof system&apos;s overall condition
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Describe the overall condition of the roof system..."
                rows={4}
                value={summary.overallCondition}
                onChange={(e) => updateSummary("overallCondition", e.target.value)}
              />
              {!summary.overallCondition && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateSummary("overallCondition", getSuggestedCondition())}
                >
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Generate suggestion
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Critical Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Critical Recommendations</CardTitle>
              <CardDescription>
                Top priority recommendations requiring urgent attention
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing recommendations */}
              {summary.criticalRecommendations.length > 0 && (
                <ol className="space-y-2 list-decimal list-inside">
                  {summary.criticalRecommendations.map((rec, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg"
                    >
                      <span className="text-sm flex-1">{rec}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => removeCriticalRecommendation(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ol>
              )}

              {/* Add new recommendation */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add a critical recommendation..."
                  value={newRecommendation}
                  onChange={(e) => setNewRecommendation(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCriticalRecommendation()}
                />
                <Button
                  onClick={addCriticalRecommendation}
                  disabled={!newRecommendation.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Suggestions from defects */}
              {suggestedRecommendations.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Lightbulb className="h-4 w-4" />
                    From critical/high defects
                  </p>
                  <div className="space-y-2">
                    {suggestedRecommendations.map((suggestion, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="text-xs w-full justify-start"
                        onClick={() => {
                          updateSummary("criticalRecommendations", [
                            ...summary.criticalRecommendations,
                            suggestion,
                          ]);
                        }}
                      >
                        <Plus className="h-3 w-3 mr-2 shrink-0" />
                        <span className="truncate">{suggestion}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Summary Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Report Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Defects</span>
                <span className="font-medium">{defects.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Critical</span>
                <span className="font-medium text-red-600">
                  {defects.filter((d) => d.severity === "CRITICAL").length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">High</span>
                <span className="font-medium text-orange-600">
                  {defects.filter((d) => d.severity === "HIGH").length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Medium</span>
                <span className="font-medium text-yellow-600">
                  {defects.filter((d) => d.severity === "MEDIUM").length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Low</span>
                <span className="font-medium text-green-600">
                  {defects.filter((d) => d.severity === "LOW").length}
                </span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Roof Elements</span>
                  <span className="font-medium">{roofElements.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Guidelines */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                The executive summary should be readable as a standalone document.
              </p>
              <p>
                <strong>Key Findings:</strong> Maximum 1 page, bullet points only.
              </p>
              <p>
                <strong>Major Defects:</strong> Brief narrative highlighting the most significant issues.
              </p>
              <p>
                <strong>Overall Condition:</strong> Professional assessment statement.
              </p>
              <p>
                <strong>Critical Recommendations:</strong> Prioritized action items requiring urgent attention.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
