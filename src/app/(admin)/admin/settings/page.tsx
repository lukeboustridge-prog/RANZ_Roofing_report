"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Settings,
  Bell,
  Shield,
  Mail,
  Loader2,
  Save,
} from "lucide-react";

interface SettingsState {
  // Notification settings
  emailNotifications: boolean;
  newReportNotification: boolean;
  reviewRequestNotification: boolean;
  approvalNotification: boolean;

  // Security settings
  requireTwoFactor: boolean;
  sessionTimeout: number;

  // General settings
  companyName: string;
  supportEmail: string;
  defaultReviewerEmail: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsState>({
    emailNotifications: true,
    newReportNotification: true,
    reviewRequestNotification: true,
    approvalNotification: true,
    requireTwoFactor: false,
    sessionTimeout: 30,
    companyName: "RANZ",
    supportEmail: "support@ranz.co.nz",
    defaultReviewerEmail: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const updateSetting = <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href="/admin"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Back to Admin
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage platform settings and preferences.
        </p>
      </div>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <CardTitle>Notification Settings</CardTitle>
          </div>
          <CardDescription>
            Configure email notifications for platform events.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="emailNotifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Enable or disable all email notifications.
              </p>
            </div>
            <Checkbox
              id="emailNotifications"
              checked={settings.emailNotifications}
              onCheckedChange={(checked) =>
                updateSetting("emailNotifications", checked === true)
              }
              aria-describedby="emailNotifications-description"
            />
          </div>

          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="newReportNotification">New Report Submitted</Label>
              <Checkbox
                id="newReportNotification"
                checked={settings.newReportNotification}
                onCheckedChange={(checked) =>
                  updateSetting("newReportNotification", checked === true)
                }
                disabled={!settings.emailNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="reviewRequestNotification">Review Requested</Label>
              <Checkbox
                id="reviewRequestNotification"
                checked={settings.reviewRequestNotification}
                onCheckedChange={(checked) =>
                  updateSetting("reviewRequestNotification", checked === true)
                }
                disabled={!settings.emailNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="approvalNotification">Report Approved/Rejected</Label>
              <Checkbox
                id="approvalNotification"
                checked={settings.approvalNotification}
                onCheckedChange={(checked) =>
                  updateSetting("approvalNotification", checked === true)
                }
                disabled={!settings.emailNotifications}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <CardTitle>Security Settings</CardTitle>
          </div>
          <CardDescription>
            Configure security and authentication settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="requireTwoFactor">Require Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Require all users to enable 2FA for their accounts.
              </p>
            </div>
            <Checkbox
              id="requireTwoFactor"
              checked={settings.requireTwoFactor}
              onCheckedChange={(checked) =>
                updateSetting("requireTwoFactor", checked === true)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
            <Input
              id="sessionTimeout"
              type="number"
              min="5"
              max="120"
              value={settings.sessionTimeout}
              onChange={(e) =>
                updateSetting("sessionTimeout", parseInt(e.target.value) || 30)
              }
              className="max-w-xs"
              aria-describedby="sessionTimeout-help"
            />
            <p id="sessionTimeout-help" className="text-sm text-muted-foreground">
              Automatically log users out after this period of inactivity.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <CardTitle>General Settings</CardTitle>
          </div>
          <CardDescription>
            Configure general platform settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={settings.companyName}
              onChange={(e) => updateSetting("companyName", e.target.value)}
              className="max-w-md"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supportEmail">Support Email</Label>
            <div className="flex items-center gap-2 max-w-md">
              <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="supportEmail"
                type="email"
                value={settings.supportEmail}
                onChange={(e) => updateSetting("supportEmail", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultReviewerEmail">Default Reviewer Email</Label>
            <Input
              id="defaultReviewerEmail"
              type="email"
              value={settings.defaultReviewerEmail}
              onChange={(e) => updateSetting("defaultReviewerEmail", e.target.value)}
              placeholder="reviewer@example.com"
              className="max-w-md"
            />
            <p className="text-sm text-muted-foreground">
              Default email to receive review requests when no specific reviewer is assigned.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" aria-hidden="true" />
              Save Settings
            </>
          )}
        </Button>
        {saved && (
          <span className="text-sm text-green-600" role="status">
            Settings saved successfully
          </span>
        )}
      </div>
    </div>
  );
}
