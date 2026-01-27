"use client";

/**
 * Inspection Request Form
 * Public page for clients to request roofing inspections
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  ClipboardList,
  User,
  MapPin,
  FileText,
  Send,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FormData {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  propertyAddress: string;
  propertyCity: string;
  propertyRegion: string;
  requestType: string;
  urgency: string;
  preferredInspectorId: string;
  notes: string;
}

const INSPECTION_TYPES = [
  { value: "FULL_INSPECTION", label: "Full Inspection", description: "Comprehensive roof assessment" },
  { value: "VISUAL_ONLY", label: "Visual Only", description: "Non-invasive visual assessment" },
  { value: "PRE_PURCHASE", label: "Pre-Purchase", description: "Inspection before property purchase" },
  { value: "DISPUTE_RESOLUTION", label: "Dispute Resolution", description: "Expert assessment for disputes" },
  { value: "MAINTENANCE_REVIEW", label: "Maintenance Review", description: "Routine maintenance check" },
  { value: "WARRANTY_CLAIM", label: "Warranty Claim", description: "Assessment for warranty purposes" },
];

const URGENCY_OPTIONS = [
  { value: "STANDARD", label: "Standard", description: "2-3 weeks", color: "text-gray-600" },
  { value: "PRIORITY", label: "Priority", description: "Within 1 week", color: "text-blue-600" },
  { value: "URGENT", label: "Urgent", description: "Within 48 hours", color: "text-amber-600" },
  { value: "EMERGENCY", label: "Emergency", description: "Same day if possible", color: "text-red-600" },
];

const NZ_REGIONS = [
  { value: "northland", label: "Northland" },
  { value: "auckland", label: "Auckland" },
  { value: "waikato", label: "Waikato" },
  { value: "bay-of-plenty", label: "Bay of Plenty" },
  { value: "gisborne", label: "Gisborne" },
  { value: "hawkes-bay", label: "Hawke's Bay" },
  { value: "taranaki", label: "Taranaki" },
  { value: "manawatu-whanganui", label: "Manawatu-Whanganui" },
  { value: "wellington", label: "Wellington" },
  { value: "tasman", label: "Tasman" },
  { value: "nelson", label: "Nelson" },
  { value: "marlborough", label: "Marlborough" },
  { value: "west-coast", label: "West Coast" },
  { value: "canterbury", label: "Canterbury" },
  { value: "otago", label: "Otago" },
  { value: "southland", label: "Southland" },
];

export default function RequestInspectionPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");

  const [formData, setFormData] = useState<FormData>({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    propertyAddress: "",
    propertyCity: "",
    propertyRegion: "",
    requestType: "FULL_INSPECTION",
    urgency: "STANDARD",
    preferredInspectorId: searchParams.get("inspector") || "",
    notes: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.clientName.trim()) {
      newErrors.clientName = "Name is required";
    }
    if (!formData.clientEmail.trim()) {
      newErrors.clientEmail = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.clientEmail)) {
      newErrors.clientEmail = "Invalid email address";
    }
    if (!formData.propertyAddress.trim()) {
      newErrors.propertyAddress = "Property address is required";
    }
    if (!formData.propertyCity.trim()) {
      newErrors.propertyCity = "City is required";
    }
    if (!formData.propertyRegion) {
      newErrors.propertyRegion = "Region is required";
    }
    if (!formData.requestType) {
      newErrors.requestType = "Inspection type is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/inspection-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          propertyAddress: `${formData.propertyAddress}, ${formData.propertyCity}`,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit request");
      }

      setReferenceNumber(result.referenceNumber || result.id);
      setIsSubmitted(true);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-12 pb-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Request Submitted!</h2>
            <p className="text-muted-foreground mb-6">
              Your inspection request has been received. We&apos;ll be in touch within 1-2 business days.
            </p>
            {referenceNumber && (
              <div className="bg-gray-100 rounded-lg p-4 mb-6">
                <p className="text-sm text-muted-foreground">Reference Number</p>
                <p className="text-lg font-mono font-semibold">{referenceNumber}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground mb-6">
              A confirmation email has been sent to <strong>{formData.clientEmail}</strong>
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/inspectors">
                <Button variant="outline">Browse Inspectors</Button>
              </Link>
              <Link href="/">
                <Button>Go to Home</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[var(--ranz-charcoal)] text-white">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Link
            href="/inspectors"
            className="inline-flex items-center text-sm text-white/70 hover:text-white mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Inspector Directory
          </Link>
          <div className="flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-[var(--ranz-yellow)]" />
            <h1 className="text-2xl font-bold">Request an Inspection</h1>
          </div>
          <p className="text-white/70 mt-2">
            Fill out the form below and we&apos;ll match you with a qualified RANZ inspector.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Your Details
              </CardTitle>
              <CardDescription>
                How should we contact you about this request?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientName">Full Name *</Label>
                  <Input
                    id="clientName"
                    value={formData.clientName}
                    onChange={(e) => updateField("clientName", e.target.value)}
                    placeholder="John Smith"
                    className={errors.clientName ? "border-red-500" : ""}
                  />
                  {errors.clientName && (
                    <p className="text-sm text-red-500 mt-1">{errors.clientName}</p>
                  )}
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
              </div>
              <div>
                <Label htmlFor="clientEmail">Email Address *</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) => updateField("clientEmail", e.target.value)}
                  placeholder="john@example.com"
                  className={errors.clientEmail ? "border-red-500" : ""}
                />
                {errors.clientEmail && (
                  <p className="text-sm text-red-500 mt-1">{errors.clientEmail}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Property Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Property Details
              </CardTitle>
              <CardDescription>
                Where is the property that needs inspection?
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
                  className={errors.propertyAddress ? "border-red-500" : ""}
                />
                {errors.propertyAddress && (
                  <p className="text-sm text-red-500 mt-1">{errors.propertyAddress}</p>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="propertyCity">City/Town *</Label>
                  <Input
                    id="propertyCity"
                    value={formData.propertyCity}
                    onChange={(e) => updateField("propertyCity", e.target.value)}
                    placeholder="Auckland"
                    className={errors.propertyCity ? "border-red-500" : ""}
                  />
                  {errors.propertyCity && (
                    <p className="text-sm text-red-500 mt-1">{errors.propertyCity}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="propertyRegion">Region *</Label>
                  <Select
                    value={formData.propertyRegion}
                    onValueChange={(value) => updateField("propertyRegion", value)}
                  >
                    <SelectTrigger className={errors.propertyRegion ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {NZ_REGIONS.map((region) => (
                        <SelectItem key={region.value} value={region.value}>
                          {region.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.propertyRegion && (
                    <p className="text-sm text-red-500 mt-1">{errors.propertyRegion}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inspection Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Inspection Details
              </CardTitle>
              <CardDescription>
                What type of inspection do you need?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Inspection Type *</Label>
                <div className="grid md:grid-cols-2 gap-2 mt-2">
                  {INSPECTION_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => updateField("requestType", type.value)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        formData.requestType === type.value
                          ? "border-[var(--ranz-blue-500)] bg-[var(--ranz-blue-50)]"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <p className="font-medium text-sm">{type.label}</p>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Urgency</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  {URGENCY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField("urgency", option.value)}
                      className={`p-3 rounded-lg border text-center transition-colors ${
                        formData.urgency === option.value
                          ? "border-[var(--ranz-blue-500)] bg-[var(--ranz-blue-50)]"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <p className={`font-medium text-sm ${option.color}`}>{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  placeholder="Any specific concerns or requirements? (e.g., suspected leak location, recent weather damage, access restrictions)"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              * Required fields
            </p>
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit Request
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
