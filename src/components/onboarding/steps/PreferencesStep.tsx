"use client";

/**
 * Preferences Step
 * Default settings and notification preferences
 */

import { Settings, Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OnboardingData } from "../OnboardingWizard";

interface PreferencesStepProps {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const INSPECTION_TYPES = [
  { value: "FULL_INSPECTION", label: "Full Inspection" },
  { value: "VISUAL_ONLY", label: "Visual Only" },
  { value: "NON_INVASIVE", label: "Non-Invasive" },
  { value: "DISPUTE_RESOLUTION", label: "Dispute Resolution" },
  { value: "PRE_PURCHASE", label: "Pre-Purchase" },
  { value: "MAINTENANCE_REVIEW", label: "Maintenance Review" },
];

const NZ_REGIONS = [
  { value: "northland", label: "Northland" },
  { value: "auckland", label: "Auckland" },
  { value: "waikato", label: "Waikato" },
  { value: "bay-of-plenty", label: "Bay of Plenty" },
  { value: "gisborne", label: "Gisborne" },
  { value: "hawkes-bay", label: "Hawke's Bay" },
  { value: "taranaki", label: "Taranaki" },
  { value: "manawatu-whanganui", label: "Manawatū-Whanganui" },
  { value: "wellington", label: "Wellington" },
  { value: "tasman", label: "Tasman" },
  { value: "nelson", label: "Nelson" },
  { value: "marlborough", label: "Marlborough" },
  { value: "west-coast", label: "West Coast" },
  { value: "canterbury", label: "Canterbury" },
  { value: "otago", label: "Otago" },
  { value: "southland", label: "Southland" },
];

export function PreferencesStep({
  data,
  onUpdate,
  onNext,
  onBack,
}: PreferencesStepProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <Card className="bg-white/10 backdrop-blur-sm border-white/20">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-white">Preferences</CardTitle>
            <p className="text-sm text-white/60">
              Set your defaults and notifications
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Default Inspection Type */}
          <div className="space-y-2">
            <Label className="text-white">Default Inspection Type</Label>
            <Select
              value={data.defaultInspectionType}
              onValueChange={(value) =>
                onUpdate({ defaultInspectionType: value })
              }
            >
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Select default type" />
              </SelectTrigger>
              <SelectContent>
                {INSPECTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-white/40">
              This will be pre-selected when creating new reports
            </p>
          </div>

          {/* Default Region */}
          <div className="space-y-2">
            <Label className="text-white">Primary Service Region</Label>
            <Select
              value={data.defaultRegion}
              onValueChange={(value) => onUpdate({ defaultRegion: value })}
            >
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Select your region" />
              </SelectTrigger>
              <SelectContent>
                {NZ_REGIONS.map((region) => (
                  <SelectItem key={region.value} value={region.value}>
                    {region.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Email Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-white/60" />
              <Label className="text-white">Notifications</Label>
            </div>

            <div className="space-y-3 bg-white/5 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">Email Notifications</p>
                  <p className="text-xs text-white/40">
                    Receive updates about reports and assignments
                  </p>
                </div>
                <Switch
                  checked={data.emailNotifications}
                  onCheckedChange={(checked) =>
                    onUpdate({ emailNotifications: checked })
                  }
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
            </div>

            <p className="text-xs text-white/40">
              You can customize individual notification preferences later in
              Settings
            </p>
          </div>

          {/* Navigation */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              className="flex-1 text-white/60 hover:text-white hover:bg-white/10"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-white text-[var(--ranz-charcoal)] hover:bg-white/90"
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default PreferencesStep;
