"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { TemplateSelector } from "@/components/reports/TemplateSelector";

const PROPERTY_TYPES = [
  { value: "RESIDENTIAL_1", label: "Residential - 1 storey" },
  { value: "RESIDENTIAL_2", label: "Residential - 2 storey" },
  { value: "RESIDENTIAL_3", label: "Residential - 3+ storey" },
  { value: "COMMERCIAL_LOW", label: "Commercial - Low rise" },
  { value: "COMMERCIAL_HIGH", label: "Commercial - High rise" },
  { value: "INDUSTRIAL", label: "Industrial" },
];

const INSPECTION_TYPES = [
  { value: "FULL_INSPECTION", label: "Full Inspection" },
  { value: "VISUAL_ONLY", label: "Visual Only" },
  { value: "NON_INVASIVE", label: "Non-Invasive" },
  { value: "INVASIVE", label: "Invasive" },
  { value: "DISPUTE_RESOLUTION", label: "Dispute Resolution" },
  { value: "PRE_PURCHASE", label: "Pre-Purchase" },
  { value: "MAINTENANCE_REVIEW", label: "Maintenance Review" },
];

const NZ_REGIONS = [
  "Northland",
  "Auckland",
  "Waikato",
  "Bay of Plenty",
  "Gisborne",
  "Hawke's Bay",
  "Taranaki",
  "Manawatu-Whanganui",
  "Wellington",
  "Tasman",
  "Nelson",
  "Marlborough",
  "West Coast",
  "Canterbury",
  "Otago",
  "Southland",
];

interface FormData {
  // Property
  propertyAddress: string;
  propertyCity: string;
  propertyRegion: string;
  propertyPostcode: string;
  propertyType: string;
  buildingAge: string;
  // Inspection
  inspectionDate: string;
  inspectionType: string;
  weatherConditions: string;
  accessMethod: string;
  limitations: string;
  // Client
  clientName: string;
  clientEmail: string;
  clientPhone: string;
}

const initialFormData: FormData = {
  propertyAddress: "",
  propertyCity: "",
  propertyRegion: "",
  propertyPostcode: "",
  propertyType: "RESIDENTIAL_1",
  buildingAge: "",
  inspectionDate: new Date().toISOString().split("T")[0],
  inspectionType: "FULL_INSPECTION",
  weatherConditions: "",
  accessMethod: "",
  limitations: "",
  clientName: "",
  clientEmail: "",
  clientPhone: "",
};

export default function NewReportPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          buildingAge: formData.buildingAge ? parseInt(formData.buildingAge) : null,
          inspectionDate: new Date(formData.inspectionDate).toISOString(),
        }),
      });

      // Handle non-JSON responses
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        if (!response.ok) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        throw new Error("Invalid response from server");
      }

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Your session has expired. Please refresh the page or sign in again.");
        }
        throw new Error(data.error || "Failed to create report");
      }

      // Apply template if selected (fire-and-forget)
      if (selectedTemplateId) {
        fetch(`/api/templates/${selectedTemplateId}/apply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportId: data.id }),
        }).catch((err) => {
          console.error("Failed to apply template:", err);
        });
      }

      router.push(`/reports/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 1) {
      return true; // Template selection is optional
    }
    if (step === 2) {
      return (
        formData.propertyAddress &&
        formData.propertyCity &&
        formData.propertyRegion &&
        formData.propertyPostcode &&
        formData.propertyType
      );
    }
    if (step === 3) {
      return formData.inspectionDate && formData.inspectionType;
    }
    if (step === 4) {
      return formData.clientName;
    }
    return true;
  };

  const handleTemplateSelect = (templateId: string | null, inspectionType?: string) => {
    setSelectedTemplateId(templateId);
    if (inspectionType) {
      updateField("inspectionType", inspectionType);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Report</h1>
        <p className="text-muted-foreground">
          Create a new roofing inspection report.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-between">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                s === step
                  ? "bg-[var(--ranz-blue-500)] text-white"
                  : s < step
                  ? "bg-green-500 text-white"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {s}
            </div>
            <span className="ml-2 text-sm font-medium">
              {s === 1 ? "Template" : s === 2 ? "Property" : s === 3 ? "Inspection" : "Client"}
            </span>
            {s < 4 && (
              <div
                className={`w-16 h-0.5 mx-4 ${
                  s < step ? "bg-green-500" : "bg-secondary"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}

      {/* Step 1: Template Selection */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Template (Optional)</CardTitle>
            <CardDescription>
              Choose a template to pre-fill report fields, or skip to start with a blank report.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TemplateSelector
              selectedTemplateId={selectedTemplateId}
              onSelect={handleTemplateSelect}
            />
          </CardContent>
        </Card>
      )}

      {/* Step 2: Property Details */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
            <CardDescription>
              Enter the property address and building information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="propertyAddress">Street Address *</Label>
              <Input
                id="propertyAddress"
                value={formData.propertyAddress}
                onChange={(e) => updateField("propertyAddress", e.target.value)}
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="propertyCity">City *</Label>
                <Input
                  id="propertyCity"
                  value={formData.propertyCity}
                  onChange={(e) => updateField("propertyCity", e.target.value)}
                  placeholder="Auckland"
                />
              </div>
              <div>
                <Label htmlFor="propertyPostcode">Postcode *</Label>
                <Input
                  id="propertyPostcode"
                  value={formData.propertyPostcode}
                  onChange={(e) => updateField("propertyPostcode", e.target.value)}
                  placeholder="1010"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="propertyRegion">Region *</Label>
              <NativeSelect
                id="propertyRegion"
                value={formData.propertyRegion}
                onChange={(e) => updateField("propertyRegion", e.target.value)}
              >
                <option value="">Select region</option>
                {NZ_REGIONS.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="propertyType">Property Type *</Label>
                <NativeSelect
                  id="propertyType"
                  value={formData.propertyType}
                  onChange={(e) => updateField("propertyType", e.target.value)}
                >
                  {PROPERTY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div>
                <Label htmlFor="buildingAge">Building Age (years)</Label>
                <Input
                  id="buildingAge"
                  type="number"
                  value={formData.buildingAge}
                  onChange={(e) => updateField("buildingAge", e.target.value)}
                  placeholder="15"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Inspection Details */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Inspection Details</CardTitle>
            <CardDescription>
              Enter the inspection date and conditions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="inspectionDate">Inspection Date *</Label>
                <Input
                  id="inspectionDate"
                  type="date"
                  value={formData.inspectionDate}
                  onChange={(e) => updateField("inspectionDate", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="inspectionType">Inspection Type *</Label>
                <NativeSelect
                  id="inspectionType"
                  value={formData.inspectionType}
                  onChange={(e) => updateField("inspectionType", e.target.value)}
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
              <Label htmlFor="weatherConditions">Weather Conditions</Label>
              <Input
                id="weatherConditions"
                value={formData.weatherConditions}
                onChange={(e) => updateField("weatherConditions", e.target.value)}
                placeholder="Fine, 18°C, light wind"
              />
            </div>

            <div>
              <Label htmlFor="accessMethod">Access Method</Label>
              <Input
                id="accessMethod"
                value={formData.accessMethod}
                onChange={(e) => updateField("accessMethod", e.target.value)}
                placeholder="Ladder, drone, scaffold"
              />
            </div>

            <div>
              <Label htmlFor="limitations">Limitations</Label>
              <Textarea
                id="limitations"
                value={formData.limitations}
                onChange={(e) => updateField("limitations", e.target.value)}
                placeholder="Any areas not inspected or limitations encountered..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Client Information */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
            <CardDescription>
              Enter the client&apos;s contact details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) => updateField("clientName", e.target.value)}
                placeholder="John Smith"
              />
            </div>

            <div>
              <Label htmlFor="clientEmail">Email</Label>
              <Input
                id="clientEmail"
                type="email"
                value={formData.clientEmail}
                onChange={(e) => updateField("clientEmail", e.target.value)}
                placeholder="john@example.com"
              />
            </div>

            <div>
              <Label htmlFor="clientPhone">Phone</Label>
              <Input
                id="clientPhone"
                type="tel"
                value={formData.clientPhone}
                onChange={(e) => updateField("clientPhone", e.target.value)}
                placeholder="021 123 4567"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 1}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {step < 4 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!canProceed() || loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Report
          </Button>
        )}
      </div>
    </div>
  );
}
