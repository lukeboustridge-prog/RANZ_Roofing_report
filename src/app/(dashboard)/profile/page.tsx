"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  Award,
  Calendar,
  FileText,
  Shield,
  Save,
  Loader2,
  CheckCircle,
  X,
  Plus,
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  status: string;
  company: string | null;
  address: string | null;
  qualifications: string | null;
  lbpNumber: string | null;
  yearsExperience: number | null;
  specialisations: string[];
  cvUrl: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    reports: number;
  };
}

const SPECIALISATION_OPTIONS = [
  "Metal Roofing",
  "Tile Roofing",
  "Membrane Roofing",
  "Shingle Roofing",
  "Asphalt Roofing",
  "Slate Roofing",
  "Commercial Roofing",
  "Residential Roofing",
  "Weathertightness",
  "Building Forensics",
  "Dispute Resolution",
];

const roleLabels: Record<string, string> = {
  INSPECTOR: "Inspector",
  REVIEWER: "Reviewer",
  ADMIN: "Administrator",
  SUPER_ADMIN: "Super Administrator",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  SUSPENDED: "destructive",
  PENDING_APPROVAL: "secondary",
};

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    company: "",
    address: "",
    qualifications: "",
    lbpNumber: "",
    yearsExperience: "",
    specialisations: [] as string[],
  });

  const [newSpecialisation, setNewSpecialisation] = useState("");

  // Load profile
  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/profile");
        if (!response.ok) {
          throw new Error("Failed to load profile");
        }
        const data = await response.json();
        setProfile(data);
        setFormData({
          name: data.name || "",
          phone: data.phone || "",
          company: data.company || "",
          address: data.address || "",
          qualifications: data.qualifications || "",
          lbpNumber: data.lbpNumber || "",
          yearsExperience: data.yearsExperience?.toString() || "",
          specialisations: data.specialisations || [],
        });
      } catch (error) {
        console.error("Error loading profile:", error);
        toast({
          title: "Error",
          description: "Failed to load profile",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [toast]);

  const handleChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const addSpecialisation = (spec: string) => {
    if (spec && !formData.specialisations.includes(spec)) {
      handleChange("specialisations", [...formData.specialisations, spec]);
    }
    setNewSpecialisation("");
  };

  const removeSpecialisation = (spec: string) => {
    handleChange(
      "specialisations",
      formData.specialisations.filter((s) => s !== spec)
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone || null,
          company: formData.company || null,
          address: formData.address || null,
          qualifications: formData.qualifications || null,
          lbpNumber: formData.lbpNumber || null,
          yearsExperience: formData.yearsExperience
            ? parseInt(formData.yearsExperience)
            : null,
          specialisations: formData.specialisations,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save profile");
      }

      const updatedProfile = await response.json();
      setProfile((prev) => (prev ? { ...prev, ...updatedProfile } : null));
      setHasChanges(false);
      toast({
        title: "Profile saved",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">
            Manage your inspector credentials and contact information.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main form - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profile.email}</span>
                    <Badge variant="outline" className="ml-auto">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="e.g., +64 21 123 4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => handleChange("company", e.target.value)}
                    placeholder="Your company name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Business Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Enter your business address"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Inspector Credentials */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Inspector Credentials
              </CardTitle>
              <CardDescription>
                Your professional qualifications and credentials for inclusion
                in reports.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lbpNumber">LBP Number</Label>
                  <Input
                    id="lbpNumber"
                    value={formData.lbpNumber}
                    onChange={(e) => handleChange("lbpNumber", e.target.value)}
                    placeholder="e.g., BP123456"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearsExperience">Years of Experience</Label>
                  <Input
                    id="yearsExperience"
                    type="number"
                    min="0"
                    value={formData.yearsExperience}
                    onChange={(e) =>
                      handleChange("yearsExperience", e.target.value)
                    }
                    placeholder="e.g., 15"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="qualifications">
                  Qualifications & Certifications
                </Label>
                <Textarea
                  id="qualifications"
                  value={formData.qualifications}
                  onChange={(e) =>
                    handleChange("qualifications", e.target.value)
                  }
                  placeholder="List your qualifications, certifications, and professional memberships..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  This will appear in the Inspector Credentials section of your
                  reports.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Specialisations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Specialisations
              </CardTitle>
              <CardDescription>
                Areas of expertise for matching inspections to your skills.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current specialisations */}
              <div className="flex flex-wrap gap-2">
                {formData.specialisations.map((spec) => (
                  <Badge
                    key={spec}
                    variant="secondary"
                    className="px-3 py-1 flex items-center gap-1"
                  >
                    {spec}
                    <button
                      onClick={() => removeSpecialisation(spec)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {formData.specialisations.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No specialisations added yet.
                  </p>
                )}
              </div>

              {/* Add from suggestions */}
              <div className="space-y-2">
                <Label>Quick Add</Label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALISATION_OPTIONS.filter(
                    (s) => !formData.specialisations.includes(s)
                  ).map((spec) => (
                    <Button
                      key={spec}
                      variant="outline"
                      size="sm"
                      onClick={() => addSpecialisation(spec)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {spec}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom specialisation */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom specialisation..."
                  value={newSpecialisation}
                  onChange={(e) => setNewSpecialisation(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSpecialisation(newSpecialisation);
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => addSpecialisation(newSpecialisation)}
                  disabled={!newSpecialisation.trim()}
                >
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Account Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Role</span>
                <Badge variant="outline">
                  {roleLabels[profile.role] || profile.role}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={statusVariants[profile.status] || "default"}>
                  {profile.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Total Reports
                </span>
                <span className="font-medium">{profile._count.reports}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Member Since
                </span>
                <span className="text-sm">
                  {new Date(profile.createdAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* CV Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                CV / Resume
              </CardTitle>
              <CardDescription>
                Upload your CV for inclusion in report appendices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profile.cvUrl ? (
                <div className="space-y-2">
                  <a
                    href={profile.cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--ranz-blue-600)] hover:underline flex items-center gap-1"
                  >
                    <FileText className="h-4 w-4" />
                    View current CV
                  </a>
                  <Button variant="outline" size="sm" className="w-full">
                    Replace CV
                  </Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Upload CV
                </Button>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                PDF format recommended. Max 5MB.
              </p>
            </CardContent>
          </Card>

          {/* Help */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong>Qualifications:</strong> Include all relevant
                certifications, trade qualifications, and professional
                memberships.
              </p>
              <p>
                <strong>LBP Number:</strong> Your Licensed Building Practitioner
                number is required for building inspection reports.
              </p>
              <p>
                <strong>Specialisations:</strong> Help RANZ match you with
                appropriate inspection assignments.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
