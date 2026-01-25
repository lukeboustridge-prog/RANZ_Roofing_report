"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select";
import {
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Award,
  Shield,
  Loader2,
  Check,
  Bell,
  Palette,
  FileText,
} from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  qualifications: string | null;
  lbpNumber: string | null;
  address: string | null;
  role: string;
}

interface UserPreferences {
  emailReportSubmitted: boolean;
  emailReportApproved: boolean;
  emailReportRejected: boolean;
  emailReportComments: boolean;
  emailReportFinalized: boolean;
  emailAssignmentNew: boolean;
  emailWeeklyDigest: boolean;
  theme: string;
  defaultListView: string;
  itemsPerPage: number;
  defaultInspectionType: string | null;
  defaultRegion: string | null;
}

const INSPECTION_TYPES = [
  { value: "", label: "No default" },
  { value: "FULL_INSPECTION", label: "Full Inspection" },
  { value: "VISUAL_ONLY", label: "Visual Only" },
  { value: "NON_INVASIVE", label: "Non-Invasive" },
  { value: "INVASIVE", label: "Invasive" },
  { value: "DISPUTE_RESOLUTION", label: "Dispute Resolution" },
  { value: "PRE_PURCHASE", label: "Pre-Purchase" },
  { value: "MAINTENANCE_REVIEW", label: "Maintenance Review" },
  { value: "WARRANTY_CLAIM", label: "Warranty Claim" },
];

const NZ_REGIONS = [
  { value: "", label: "No default" },
  { value: "Northland", label: "Northland" },
  { value: "Auckland", label: "Auckland" },
  { value: "Waikato", label: "Waikato" },
  { value: "Bay of Plenty", label: "Bay of Plenty" },
  { value: "Gisborne", label: "Gisborne" },
  { value: "Hawke's Bay", label: "Hawke's Bay" },
  { value: "Taranaki", label: "Taranaki" },
  { value: "Manawatū-Whanganui", label: "Manawatū-Whanganui" },
  { value: "Wellington", label: "Wellington" },
  { value: "Tasman", label: "Tasman" },
  { value: "Nelson", label: "Nelson" },
  { value: "Marlborough", label: "Marlborough" },
  { value: "West Coast", label: "West Coast" },
  { value: "Canterbury", label: "Canterbury" },
  { value: "Otago", label: "Otago" },
  { value: "Southland", label: "Southland" },
];

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>({
    emailReportSubmitted: true,
    emailReportApproved: true,
    emailReportRejected: true,
    emailReportComments: true,
    emailReportFinalized: true,
    emailAssignmentNew: true,
    emailWeeklyDigest: false,
    theme: "system",
    defaultListView: "grid",
    itemsPerPage: 12,
    defaultInspectionType: null,
    defaultRegion: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, prefsRes] = await Promise.all([
        fetch("/api/user/profile"),
        fetch("/api/user/preferences"),
      ]);

      if (!profileRes.ok) throw new Error("Failed to fetch profile");
      const profileData = await profileRes.json();
      setProfile(profileData);

      if (prefsRes.ok) {
        const prefsData = await prefsRes.json();
        setPreferences(prefsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = (key: keyof UserPreferences, value: unknown) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    setError("");
    setSaved(false);

    try {
      // Save profile and preferences in parallel
      const [profileRes, prefsRes] = await Promise.all([
        fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: profile.name,
            phone: profile.phone,
            company: profile.company,
            qualifications: profile.qualifications,
            lbpNumber: profile.lbpNumber,
            address: profile.address,
          }),
        }),
        fetch("/api/user/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(preferences),
        }),
      ]);

      if (!profileRes.ok) {
        const data = await profileRes.json();
        throw new Error(data.error || "Failed to save profile");
      }

      if (!prefsRes.ok) {
        const data = await prefsRes.json();
        throw new Error(data.error || "Failed to save preferences");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
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

  if (!profile) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-md">
        Failed to load profile
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile and account settings.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Your personal information as it appears on reports.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) =>
                  setProfile({ ...profile, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile.email} disabled />
              <p className="text-xs text-muted-foreground">
                Email is managed by your authentication provider.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={profile.phone || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, phone: e.target.value })
                  }
                  className="pl-10"
                  placeholder="+64 21 123 4567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea
                  id="address"
                  value={profile.address || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, address: e.target.value })
                  }
                  className="pl-10 min-h-[80px]"
                  placeholder="Your business address"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professional Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Professional Details
            </CardTitle>
            <CardDescription>
              Your qualifications and business information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="company"
                  value={profile.company || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, company: e.target.value })
                  }
                  className="pl-10"
                  placeholder="Your company name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lbpNumber">LBP Number</Label>
              <div className="relative">
                <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="lbpNumber"
                  value={profile.lbpNumber || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, lbpNumber: e.target.value })
                  }
                  className="pl-10"
                  placeholder="e.g., BP123456"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qualifications">Qualifications</Label>
              <Textarea
                id="qualifications"
                value={profile.qualifications || ""}
                onChange={(e) =>
                  setProfile({ ...profile, qualifications: e.target.value })
                }
                className="min-h-[100px]"
                placeholder="List your relevant qualifications, certifications, and experience..."
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Choose which email notifications you want to receive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <NotificationToggle
            label="Report Submitted"
            description="When your report is submitted for review"
            checked={preferences.emailReportSubmitted}
            onChange={(checked) => updatePreference("emailReportSubmitted", checked)}
          />
          <NotificationToggle
            label="Report Approved"
            description="When your report is approved by a reviewer"
            checked={preferences.emailReportApproved}
            onChange={(checked) => updatePreference("emailReportApproved", checked)}
          />
          <NotificationToggle
            label="Revision Required"
            description="When your report needs changes"
            checked={preferences.emailReportRejected}
            onChange={(checked) => updatePreference("emailReportRejected", checked)}
          />
          <NotificationToggle
            label="New Comments"
            description="When someone comments on your report"
            checked={preferences.emailReportComments}
            onChange={(checked) => updatePreference("emailReportComments", checked)}
          />
          <NotificationToggle
            label="Report Finalized"
            description="When your report is finalized"
            checked={preferences.emailReportFinalized}
            onChange={(checked) => updatePreference("emailReportFinalized", checked)}
          />
          <NotificationToggle
            label="New Assignment"
            description="When you're assigned to a new inspection"
            checked={preferences.emailAssignmentNew}
            onChange={(checked) => updatePreference("emailAssignmentNew", checked)}
          />
          <div className="border-t pt-4">
            <NotificationToggle
              label="Weekly Digest"
              description="Receive a weekly summary of your reports and activity"
              checked={preferences.emailWeeklyDigest}
              onChange={(checked) => updatePreference("emailWeeklyDigest", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* UI Preferences */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize how the application looks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <NativeSelect
                id="theme"
                value={preferences.theme}
                onChange={(e) => updatePreference("theme", e.target.value)}
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultListView">Default View</Label>
              <NativeSelect
                id="defaultListView"
                value={preferences.defaultListView}
                onChange={(e) => updatePreference("defaultListView", e.target.value)}
              >
                <option value="grid">Grid</option>
                <option value="list">List</option>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemsPerPage">Items Per Page</Label>
              <NativeSelect
                id="itemsPerPage"
                value={preferences.itemsPerPage.toString()}
                onChange={(e) => updatePreference("itemsPerPage", parseInt(e.target.value))}
              >
                <option value="6">6</option>
                <option value="12">12</option>
                <option value="24">24</option>
                <option value="48">48</option>
              </NativeSelect>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Default Report Settings
            </CardTitle>
            <CardDescription>
              Pre-fill these values when creating new reports.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultInspectionType">Default Inspection Type</Label>
              <NativeSelect
                id="defaultInspectionType"
                value={preferences.defaultInspectionType || ""}
                onChange={(e) =>
                  updatePreference("defaultInspectionType", e.target.value || null)
                }
              >
                {INSPECTION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultRegion">Default Region</Label>
              <NativeSelect
                id="defaultRegion"
                value={preferences.defaultRegion || ""}
                onChange={(e) =>
                  updatePreference("defaultRegion", e.target.value || null)
                }
              >
                {NZ_REGIONS.map((region) => (
                  <option key={region.value} value={region.value}>
                    {region.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Role:</span>
              <Badge variant={profile.role === "ADMIN" ? "default" : "secondary"}>
                {profile.role}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge variant="outline" className="text-green-600 border-green-600">
                Active
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        {saved && (
          <div className="flex items-center text-sm text-green-600">
            <Check className="mr-2 h-4 w-4" />
            Changes saved
          </div>
        )}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
}

interface NotificationToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function NotificationToggle({
  label,
  description,
  checked,
  onChange,
}: NotificationToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label className="text-base">{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          checked ? "bg-[var(--ranz-blue-500)]" : "bg-gray-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
