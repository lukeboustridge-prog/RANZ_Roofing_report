"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/select";
import { useAutosave, AutosaveIndicator } from "@/hooks/use-autosave";
import { ArrowLeft, Loader2, Save } from "lucide-react";

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

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "PENDING_REVIEW", label: "Pending Review" },
  { value: "APPROVED", label: "Approved" },
  { value: "FINALISED", label: "Finalised" },
];

interface FormData {
  propertyAddress: string;
  propertyCity: string;
  propertyRegion: string;
  propertyPostcode: string;
  propertyType: string;
  buildingAge: string;
  inspectionDate: string;
  inspectionType: string;
  weatherConditions: string;
  methodology: string;
  equipment: string;
  accessMethod: string;
  limitations: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  status: string;
}

export default function EditReportPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;

  const [formData, setFormData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  // Auto-save function
  const handleAutosave = useCallback(async (data: FormData) => {
    const response = await fetch(`/api/reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        buildingAge: data.buildingAge ? parseInt(data.buildingAge) : null,
        inspectionDate: new Date(data.inspectionDate).toISOString(),
        methodology: data.methodology || null,
        equipment: data.equipment ? data.equipment.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean) : null,
      }),
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || "Failed to save");
    }
  }, [reportId]);

  // Initialize autosave
  const autosave = useAutosave({
    data: formData!,
    onSave: handleAutosave,
    debounce: 3000, // 3 seconds after last change
    interval: 60000, // Also save every 60 seconds
    enabled: initialDataLoaded && formData !== null && formData.status !== "FINALISED",
  });

  useEffect(() => {
    fetchReport();
  }, [reportId]);

  const fetchReport = async () => {
    try {
      const response = await fetch(`/api/reports/${reportId}`);
      if (!response.ok) throw new Error("Failed to fetch report");
      const data = await response.json();

      setFormData({
        propertyAddress: data.propertyAddress || "",
        propertyCity: data.propertyCity || "",
        propertyRegion: data.propertyRegion || "",
        propertyPostcode: data.propertyPostcode || "",
        propertyType: data.propertyType || "RESIDENTIAL_1",
        buildingAge: data.buildingAge?.toString() || "",
        inspectionDate: data.inspectionDate
          ? new Date(data.inspectionDate).toISOString().split("T")[0]
          : "",
        inspectionType: data.inspectionType || "FULL_INSPECTION",
        weatherConditions: data.weatherConditions || "",
        methodology: typeof data.methodology === 'string' ? data.methodology : (data.methodology ? JSON.stringify(data.methodology) : ""),
        equipment: Array.isArray(data.equipment) ? data.equipment.join(", ") : (typeof data.equipment === 'string' ? data.equipment : ""),
        accessMethod: data.accessMethod || "",
        limitations: data.limitations || "",
        clientName: data.clientName || "",
        clientEmail: data.clientEmail || "",
        clientPhone: data.clientPhone || "",
        status: data.status || "DRAFT",
      });
      // Mark initial data as loaded after a short delay to prevent immediate autosave
      setTimeout(() => setInitialDataLoaded(true), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof FormData, value: string) => {
    if (!formData) return;
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          buildingAge: formData.buildingAge ? parseInt(formData.buildingAge) : null,
          inspectionDate: new Date(formData.inspectionDate).toISOString(),
          methodology: formData.methodology || null,
          equipment: formData.equipment ? formData.equipment.split(/[,\n]/).map(s => s.trim()).filter(Boolean) : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update report");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/reports/${reportId}`);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-md">
        Failed to load report
      </div>
    );
  }

  const isFinalised = formData.status === "FINALISED";

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Link
            href={`/reports/${reportId}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Report
          </Link>
          <AutosaveIndicator
            status={autosave.status}
            lastSaved={autosave.lastSaved}
            error={autosave.error}
          />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Report</h1>
        <p className="text-muted-foreground">
          Update the report details and information.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-100 text-green-800 rounded-md">
          Report updated successfully! Redirecting...
        </div>
      )}

      {isFinalised && (
        <div className="p-4 bg-yellow-100 text-yellow-800 rounded-md">
          This report has been finalised and cannot be edited.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle>Report Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="status">Status</Label>
              <NativeSelect
                id="status"
                value={formData.status}
                onChange={(e) => updateField("status", e.target.value)}
                disabled={isFinalised}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </CardContent>
        </Card>

        {/* Property Details */}
        <Card>
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
            <CardDescription>
              Property address and building information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="propertyAddress">Street Address *</Label>
              <Input
                id="propertyAddress"
                value={formData.propertyAddress}
                onChange={(e) => updateField("propertyAddress", e.target.value)}
                disabled={isFinalised}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="propertyCity">City *</Label>
                <Input
                  id="propertyCity"
                  value={formData.propertyCity}
                  onChange={(e) => updateField("propertyCity", e.target.value)}
                  disabled={isFinalised}
                  required
                />
              </div>
              <div>
                <Label htmlFor="propertyPostcode">Postcode *</Label>
                <Input
                  id="propertyPostcode"
                  value={formData.propertyPostcode}
                  onChange={(e) => updateField("propertyPostcode", e.target.value)}
                  disabled={isFinalised}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="propertyRegion">Region *</Label>
              <NativeSelect
                id="propertyRegion"
                value={formData.propertyRegion}
                onChange={(e) => updateField("propertyRegion", e.target.value)}
                disabled={isFinalised}
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
                  disabled={isFinalised}
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
                  disabled={isFinalised}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inspection Details */}
        <Card>
          <CardHeader>
            <CardTitle>Inspection Details</CardTitle>
            <CardDescription>
              Inspection date and conditions.
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
                  disabled={isFinalised}
                  required
                />
              </div>
              <div>
                <Label htmlFor="inspectionType">Inspection Type *</Label>
                <NativeSelect
                  id="inspectionType"
                  value={formData.inspectionType}
                  onChange={(e) => updateField("inspectionType", e.target.value)}
                  disabled={isFinalised}
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
                disabled={isFinalised}
                placeholder="Fine, 18°C, light wind"
              />
            </div>

            <div>
              <Label htmlFor="methodology">Inspection Methodology</Label>
              <Textarea
                id="methodology"
                value={formData.methodology}
                onChange={(e) => updateField("methodology", e.target.value)}
                disabled={isFinalised}
                placeholder="Describe the inspection approach, process, and standards followed..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                ISO 17020 required. Describe the inspection process and standards referenced.
              </p>
            </div>

            <div>
              <Label htmlFor="equipment">Equipment Used</Label>
              <Textarea
                id="equipment"
                value={formData.equipment}
                onChange={(e) => updateField("equipment", e.target.value)}
                disabled={isFinalised}
                placeholder="List instruments used, separated by commas or new lines (e.g., moisture meter, drone, thermal camera...)"
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                ISO 17020 required. List all instruments and tools used during inspection.
              </p>
            </div>

            <div>
              <Label htmlFor="accessMethod">Access Method</Label>
              <Input
                id="accessMethod"
                value={formData.accessMethod}
                onChange={(e) => updateField("accessMethod", e.target.value)}
                disabled={isFinalised}
                placeholder="Ladder, drone, scaffold"
              />
            </div>

            <div>
              <Label htmlFor="limitations">Limitations</Label>
              <Textarea
                id="limitations"
                value={formData.limitations}
                onChange={(e) => updateField("limitations", e.target.value)}
                disabled={isFinalised}
                placeholder="Any areas not inspected or limitations encountered..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
            <CardDescription>
              Client contact details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) => updateField("clientName", e.target.value)}
                disabled={isFinalised}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="clientEmail">Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) => updateField("clientEmail", e.target.value)}
                  disabled={isFinalised}
                />
              </div>
              <div>
                <Label htmlFor="clientPhone">Phone</Label>
                <Input
                  id="clientPhone"
                  type="tel"
                  value={formData.clientPhone}
                  onChange={(e) => updateField("clientPhone", e.target.value)}
                  disabled={isFinalised}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/reports/${reportId}`)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving || isFinalised}>
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
      </form>
    </div>
  );
}
