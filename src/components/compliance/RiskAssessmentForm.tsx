"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  HardHat,
  ClipboardCheck,
  RefreshCw,
} from "lucide-react";
import {
  type WizardInputs,
  type Pathway,
  type Scope,
  type Pitch,
  type Age,
  type ConsentStatus,
  type BuildingType,
  type Variation,
  type Discovery,
  type Licence,
  type Supervision,
  type Completion,
  type ExecTask,
  type ComplexRisk,
  evaluateCompliance,
  isWizardComplete,
  type ComplianceResult,
} from "@/lib/compliance";
import { ComplianceAlerts } from "./ComplianceAlerts";

// ============================================
// OPTION DEFINITIONS
// ============================================

const PATHWAY_OPTIONS: { value: Pathway; label: string; description: string }[] = [
  {
    value: "planning",
    label: "Planning & Pricing",
    description: "Do I need a Consent? Do I need an LBP?",
  },
  {
    value: "execution",
    label: "Doing the Work / Issues",
    description: "On site, making changes, supervising staff, or have a dispute.",
  },
];

const SCOPE_OPTIONS: { value: Scope; label: string; description: string }[] = [
  {
    value: "new",
    label: "New Build or Extension",
    description: "New footprint or structural extension.",
  },
  {
    value: "replace_same",
    label: "Like-for-Like Replacement",
    description: "Same position, comparable materials.",
  },
  {
    value: "replace_change",
    label: "Replacement with Design Changes",
    description: "e.g. Removing parapets, changing pitch.",
  },
];

const PITCH_OPTIONS: { value: Pitch; label: string }[] = [
  { value: "standard", label: "Standard Pitch (>3°)" },
  { value: "low", label: "Low Pitch (1.5° – 3°)" },
  { value: "zero", label: "Flat / Zero Pitch (<1.5°)" },
];

const COMPLEX_OPTIONS: { value: ComplexRisk; label: string; description: string }[] = [
  {
    value: "gutter",
    label: "Internal Gutter → External Conversion",
    description: "Changing drainage system design (E1/E2).",
  },
  {
    value: "skillion",
    label: "Skillion Roof (No Cavity)",
    description: "Risk of condensation if ventilation not added.",
  },
  {
    value: "truss",
    label: "New Trusses / Structural",
    description: "Trusses = Primary Structure (Det 2023/008).",
  },
  {
    value: "dormer",
    label: "Dormer / Boundary Proximity",
    description: "Fire Rating (Det 2024/018).",
  },
  {
    value: "container",
    label: "Shipping Container Roof",
    description: "Roofing over a container is Building Work (Det 2019/057).",
  },
  {
    value: "attic_storage",
    label: "Attic Storage / Conversion",
    description: "Boarding over joists for storage (Det 2023/036).",
  },
  {
    value: "h1_upgrade",
    label: "Insulation Upgrade (H1)",
    description: "Installing thicker insulation (R6.6) or PIR board.",
  },
  {
    value: "sips",
    label: "SIPs / Special Substrates",
    description: "Fixing to Structural Insulated Panels (McFarlane [2025]).",
  },
  {
    value: "solar",
    label: "Solar Panels",
    description: "Adding weight/penetrations.",
  },
  {
    value: "asbestos",
    label: "Pre-2000 / Asbestos Risk",
    description: "Potential Health & Safety Stop Work.",
  },
  {
    value: "none",
    label: "None of the above",
    description: "Standard re-roof or new build.",
  },
];

const AGE_OPTIONS: { value: Age; label: string; description: string }[] = [
  { value: "old", label: "Over 15 Years Old", description: "Normal end of life." },
  { value: "young", label: "Under 15 Years Old", description: "Premature failure." },
];

const CONSENT_STATUS_OPTIONS: { value: ConsentStatus; label: string; description?: string }[] = [
  { value: "yes", label: "Yes, Consent Issued" },
  { value: "emergency", label: "No - Emergency Work (s41c)", description: "Immediate danger to people/property." },
  { value: "no_check", label: "Unsure / Not Confirmed" },
];

const BUILDING_TYPE_OPTIONS: { value: BuildingType; label: string; description: string }[] = [
  { value: "residential", label: "Yes (Owner Occupied)", description: "Standard residential rules apply." },
  { value: "rental", label: "Yes (Rental Property / Tenanted)", description: "Higher risk for ventilation (Det 2015/057)." },
  { value: "commercial", label: "No (Commercial / Industrial)", description: "Warehouses, offices, etc." },
];

const VARIATION_OPTIONS: { value: Variation; label: string; description: string }[] = [
  { value: "yes", label: "Yes", description: "Changing flashings, details, pitch, layout, or substituting specified products." },
  { value: "no", label: "No", description: "Following the consented plans and specifications exactly." },
];

const EXEC_TASK_OPTIONS: { value: ExecTask; label: string; description?: string }[] = [
  { value: "finish_eaves", label: "Eaves, Fascia & Gutters", description: "Finishing metal or underlay. (Det 2024/051)" },
  { value: "flashings", label: "Installing Flashings", description: "Barges, Heads, Aprons. (Det 2025/033)" },
  { value: "penetration", label: "Penetrations (Flues/Pipes)", description: "Installing wood burners etc. (Det 2024/036)" },
  { value: "substitution", label: "Product Substitution", description: "Swapping Brands (Membrane/Timber). (Det 2023/013)" },
  { value: "insulation", label: "Retrofitting Insulation", description: "Adding foam or bats. (Det 2019/002)" },
  { value: "none", label: "General Roofing / None" },
];

const DISCOVERY_OPTIONS: { value: Discovery; label: string; description: string }[] = [
  { value: "structural", label: "Issues Found (Rot / Code Compliance)", description: "Rot, errors, or structure not up to current Code." },
  { value: "checked_ok", label: "Checked & Compliant", description: "I have verified the substrate is ready." },
  { value: "none", label: "Not Checked Yet", description: "I need to verify substrate before starting." },
];

const LICENCE_OPTIONS: { value: Licence; label: string; description: string }[] = [
  { value: "yes", label: "Yes", description: "e.g. I have a Membrane licence and I am installing Membrane." },
  { value: "no", label: "No / Different Class", description: "e.g. I am a Metal roofer installing Membrane." },
];

const SUPERVISION_OPTIONS: { value: Supervision; label: string }[] = [
  { value: "self", label: "I am doing it myself" },
  { value: "check", label: "Supervising others (Physical Checks)" },
  { value: "remote", label: "Remote / No Inspection" },
];

const COMPLETION_OPTIONS: { value: Completion; label: string }[] = [
  { value: "in_progress", label: "Work in Progress (No Issues)" },
  { value: "finished", label: "Job Completed Normally" },
  { value: "dispute", label: "Dispute / Payment Issue" },
  { value: "terminated", label: "Contract Terminated / Walked Off" },
];

// ============================================
// MAIN COMPONENT
// ============================================

interface RiskAssessmentFormProps {
  initialData?: WizardInputs | null;
  onInputsChange?: (inputs: WizardInputs) => void;
  onResultChange?: (result: ComplianceResult | null) => void;
  onSave?: (inputs: WizardInputs, result: ComplianceResult | null) => Promise<void>;
  saving?: boolean;
}

export function RiskAssessmentForm({
  initialData,
  onInputsChange,
  onResultChange,
  onSave,
  saving = false,
}: RiskAssessmentFormProps) {
  // State
  const [inputs, setInputs] = useState<WizardInputs>(
    initialData || {
      pathway: null,
      scope: null,
      pitch: "standard",
      complex: [],
      age: null,
      consent_status: null,
      b_type: null,
      variation: null,
      exec_task: "none",
      discovery: null,
      licence: null,
      supervision: null,
      completion: null,
    }
  );
  const [result, setResult] = useState<ComplianceResult | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  // Evaluate compliance whenever inputs change
  useEffect(() => {
    const newResult = evaluateCompliance(inputs);
    setResult(newResult);
    onResultChange?.(newResult);
    onInputsChange?.(inputs);
  }, [inputs, onInputsChange, onResultChange]);

  // Helper to update a single field
  const updateField = <K extends keyof WizardInputs>(
    field: K,
    value: WizardInputs[K]
  ) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  // Handle complex risk multi-select
  const handleComplexChange = (value: ComplexRisk, checked: boolean) => {
    setInputs((prev) => {
      const current = prev.complex || [];

      if (value === "none") {
        // If "none" is checked, clear all others
        return { ...prev, complex: checked ? ["none"] : [] };
      } else {
        // If another option is checked, remove "none"
        const filtered = current.filter((v) => v !== "none");
        if (checked) {
          return { ...prev, complex: [...filtered, value] };
        } else {
          return { ...prev, complex: filtered.filter((v) => v !== value) };
        }
      }
    });
  };

  // Reset form
  const handleReset = () => {
    setInputs({
      pathway: null,
      scope: null,
      pitch: "standard",
      complex: [],
      age: null,
      consent_status: null,
      b_type: null,
      variation: null,
      exec_task: "none",
      discovery: null,
      licence: null,
      supervision: null,
      completion: null,
    });
  };

  const isComplete = isWizardComplete(inputs);
  const showPlanningFields = inputs.pathway === "planning";
  const showExecutionFields = inputs.pathway === "execution";
  const showAgeField = showPlanningFields && inputs.scope === "replace_same";

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HardHat className="h-5 w-5 text-[var(--ranz-blue-500)]" />
                <div>
                  <CardTitle className="text-lg">Risk & Scope Assessment</CardTitle>
                  <CardDescription>
                    Evaluate consent requirements and LBP obligations
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {result && result.status !== "check_required" && (
                  <Badge
                    variant={
                      result.status === "likely_exempt" || result.status === "commercial_exempt"
                        ? "default"
                        : "destructive"
                    }
                    className={
                      result.status === "likely_exempt"
                        ? "bg-green-600"
                        : result.status === "commercial_exempt"
                        ? "bg-slate-600"
                        : ""
                    }
                  >
                    {result.bannerTitle}
                  </Badge>
                )}
                {result && result.warnings.length > 0 && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {result.warnings.length} Alerts
                  </Badge>
                )}
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Pathway Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">What is your situation?</Label>
              <RadioGroup
                value={inputs.pathway || ""}
                onValueChange={(v) => updateField("pathway", v as Pathway)}
                className="grid grid-cols-1 md:grid-cols-2 gap-3"
              >
                {PATHWAY_OPTIONS.map((option) => (
                  <div key={option.value}>
                    <RadioGroupItem
                      value={option.value}
                      id={`pathway-${option.value}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`pathway-${option.value}`}
                      className="flex flex-col p-4 border rounded-lg cursor-pointer hover:bg-muted/50 peer-data-[state=checked]:border-[var(--ranz-blue-500)] peer-data-[state=checked]:bg-[var(--ranz-blue-50)]"
                    >
                      <span className="font-medium">{option.label}</span>
                      <span className="text-sm text-muted-foreground">
                        {option.description}
                      </span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* ============================================ */}
            {/* PLANNING PATHWAY FIELDS */}
            {/* ============================================ */}
            {showPlanningFields && (
              <>
                {/* Scope */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">What is the nature of the work?</Label>
                  <RadioGroup
                    value={inputs.scope || ""}
                    onValueChange={(v) => updateField("scope", v as Scope)}
                    className="space-y-2"
                  >
                    {SCOPE_OPTIONS.map((option) => (
                      <div key={option.value}>
                        <RadioGroupItem
                          value={option.value}
                          id={`scope-${option.value}`}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={`scope-${option.value}`}
                          className="flex flex-col p-3 border rounded-lg cursor-pointer hover:bg-muted/50 peer-data-[state=checked]:border-[var(--ranz-blue-500)] peer-data-[state=checked]:bg-[var(--ranz-blue-50)]"
                        >
                          <span className="font-medium">{option.label}</span>
                          <span className="text-sm text-muted-foreground">
                            {option.description}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Pitch */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Roof Pitch</Label>
                  <Select
                    value={inputs.pitch}
                    onValueChange={(v) => updateField("pitch", v as Pitch)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select pitch" />
                    </SelectTrigger>
                    <SelectContent>
                      {PITCH_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Complex Risks */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    High Risk Scenarios (Select all that apply)
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {COMPLEX_OPTIONS.map((option) => (
                      <div
                        key={option.value}
                        className={`flex items-start space-x-3 p-3 border rounded-lg ${
                          inputs.complex?.includes(option.value)
                            ? "border-[var(--ranz-blue-500)] bg-[var(--ranz-blue-50)]"
                            : ""
                        }`}
                      >
                        <Checkbox
                          id={`complex-${option.value}`}
                          checked={inputs.complex?.includes(option.value)}
                          onCheckedChange={(checked) =>
                            handleComplexChange(option.value, checked as boolean)
                          }
                        />
                        <Label
                          htmlFor={`complex-${option.value}`}
                          className="cursor-pointer flex-1"
                        >
                          <span className="font-medium text-sm">{option.label}</span>
                          <span className="block text-xs text-muted-foreground">
                            {option.description}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Age (only for like-for-like replacement) */}
                {showAgeField && (
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">
                      How old is the current roof? (15-Year Rule)
                    </Label>
                    <RadioGroup
                      value={inputs.age || ""}
                      onValueChange={(v) => updateField("age", v as Age)}
                      className="grid grid-cols-1 md:grid-cols-2 gap-3"
                    >
                      {AGE_OPTIONS.map((option) => (
                        <div key={option.value}>
                          <RadioGroupItem
                            value={option.value}
                            id={`age-${option.value}`}
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor={`age-${option.value}`}
                            className="flex flex-col p-3 border rounded-lg cursor-pointer hover:bg-muted/50 peer-data-[state=checked]:border-[var(--ranz-blue-500)] peer-data-[state=checked]:bg-[var(--ranz-blue-50)]"
                          >
                            <span className="font-medium">{option.label}</span>
                            <span className="text-sm text-muted-foreground">
                              {option.description}
                            </span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                {/* Consent Status */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Has a Consent been issued?</Label>
                  <RadioGroup
                    value={inputs.consent_status || ""}
                    onValueChange={(v) => updateField("consent_status", v as ConsentStatus)}
                    className="space-y-2"
                  >
                    {CONSENT_STATUS_OPTIONS.map((option) => (
                      <div key={option.value}>
                        <RadioGroupItem
                          value={option.value}
                          id={`consent-${option.value}`}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={`consent-${option.value}`}
                          className="flex flex-col p-3 border rounded-lg cursor-pointer hover:bg-muted/50 peer-data-[state=checked]:border-[var(--ranz-blue-500)] peer-data-[state=checked]:bg-[var(--ranz-blue-50)]"
                        >
                          <span className="font-medium">{option.label}</span>
                          {option.description && (
                            <span className="text-sm text-muted-foreground">
                              {option.description}
                            </span>
                          )}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </>
            )}

            {/* ============================================ */}
            {/* EXECUTION PATHWAY FIELDS */}
            {/* ============================================ */}
            {showExecutionFields && (
              <>
                {/* Building Type */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Is this a Residential building?</Label>
                  <RadioGroup
                    value={inputs.b_type || ""}
                    onValueChange={(v) => updateField("b_type", v as BuildingType)}
                    className="space-y-2"
                  >
                    {BUILDING_TYPE_OPTIONS.map((option) => (
                      <div key={option.value}>
                        <RadioGroupItem
                          value={option.value}
                          id={`btype-${option.value}`}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={`btype-${option.value}`}
                          className="flex flex-col p-3 border rounded-lg cursor-pointer hover:bg-muted/50 peer-data-[state=checked]:border-[var(--ranz-blue-500)] peer-data-[state=checked]:bg-[var(--ranz-blue-50)]"
                        >
                          <span className="font-medium">{option.label}</span>
                          <span className="text-sm text-muted-foreground">
                            {option.description}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Variation */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    Are you deviating from Plans or substituting products?
                  </Label>
                  <RadioGroup
                    value={inputs.variation || ""}
                    onValueChange={(v) => updateField("variation", v as Variation)}
                    className="grid grid-cols-1 md:grid-cols-2 gap-3"
                  >
                    {VARIATION_OPTIONS.map((option) => (
                      <div key={option.value}>
                        <RadioGroupItem
                          value={option.value}
                          id={`variation-${option.value}`}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={`variation-${option.value}`}
                          className="flex flex-col p-3 border rounded-lg cursor-pointer hover:bg-muted/50 peer-data-[state=checked]:border-[var(--ranz-blue-500)] peer-data-[state=checked]:bg-[var(--ranz-blue-50)]"
                        >
                          <span className="font-medium">{option.label}</span>
                          <span className="text-sm text-muted-foreground">
                            {option.description}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Exec Task */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    Are you performing any of these tasks?
                  </Label>
                  <Select
                    value={inputs.exec_task || "none"}
                    onValueChange={(v) => updateField("exec_task", v as ExecTask)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select task type" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXEC_TASK_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex flex-col">
                            <span>{option.label}</span>
                            {option.description && (
                              <span className="text-xs text-muted-foreground">
                                {option.description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Discovery */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    Have you checked the substrate?
                  </Label>
                  <RadioGroup
                    value={inputs.discovery || ""}
                    onValueChange={(v) => updateField("discovery", v as Discovery)}
                    className="space-y-2"
                  >
                    {DISCOVERY_OPTIONS.map((option) => (
                      <div key={option.value}>
                        <RadioGroupItem
                          value={option.value}
                          id={`discovery-${option.value}`}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={`discovery-${option.value}`}
                          className="flex flex-col p-3 border rounded-lg cursor-pointer hover:bg-muted/50 peer-data-[state=checked]:border-[var(--ranz-blue-500)] peer-data-[state=checked]:bg-[var(--ranz-blue-50)]"
                        >
                          <span className="font-medium">{option.label}</span>
                          <span className="text-sm text-muted-foreground">
                            {option.description}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Licence */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    Do you hold the specific Licence Class for this work?
                  </Label>
                  <RadioGroup
                    value={inputs.licence || ""}
                    onValueChange={(v) => updateField("licence", v as Licence)}
                    className="grid grid-cols-1 md:grid-cols-2 gap-3"
                  >
                    {LICENCE_OPTIONS.map((option) => (
                      <div key={option.value}>
                        <RadioGroupItem
                          value={option.value}
                          id={`licence-${option.value}`}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={`licence-${option.value}`}
                          className="flex flex-col p-3 border rounded-lg cursor-pointer hover:bg-muted/50 peer-data-[state=checked]:border-[var(--ranz-blue-500)] peer-data-[state=checked]:bg-[var(--ranz-blue-50)]"
                        >
                          <span className="font-medium">{option.label}</span>
                          <span className="text-sm text-muted-foreground">
                            {option.description}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Supervision */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    How are you supervising this job?
                  </Label>
                  <Select
                    value={inputs.supervision || ""}
                    onValueChange={(v) => updateField("supervision", v as Supervision)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supervision method" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPERVISION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Completion */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">What is the job status?</Label>
                  <Select
                    value={inputs.completion || ""}
                    onValueChange={(v) => updateField("completion", v as Completion)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select job status" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPLETION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* ============================================ */}
            {/* RESULTS DISPLAY */}
            {/* ============================================ */}
            {inputs.pathway && (
              <div className="pt-4 border-t">
                <ComplianceAlerts
                  result={result}
                  showBanner={true}
                  showReasons={true}
                  showActions={true}
                />
              </div>
            )}

            {/* ============================================ */}
            {/* ACTIONS */}
            {/* ============================================ */}
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={handleReset}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset
              </Button>

              {onSave && (
                <Button
                  onClick={() => onSave(inputs, result)}
                  disabled={saving || !isComplete}
                >
                  {saving ? (
                    <ClipboardCheck className="mr-2 h-4 w-4 animate-pulse" />
                  ) : (
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                  )}
                  Save Assessment
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
