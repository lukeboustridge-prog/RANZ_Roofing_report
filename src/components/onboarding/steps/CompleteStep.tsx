"use client";

/**
 * Complete Step
 * Final review and completion
 */

import {
  CheckCircle2,
  ChevronLeft,
  Loader2,
  User,
  Award,
  Building2,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OnboardingData } from "../OnboardingWizard";

interface CompleteStepProps {
  data: OnboardingData;
  onComplete: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export function CompleteStep({
  data,
  onComplete,
  onBack,
  isSubmitting,
}: CompleteStepProps) {
  const sections = [
    {
      icon: User,
      title: "Profile",
      items: [
        { label: "Name", value: data.name },
        { label: "Phone", value: data.phone || "Not provided" },
      ],
    },
    {
      icon: Award,
      title: "Qualifications",
      items: [
        { label: "LBP Number", value: data.lbpNumber || "Not provided" },
        {
          label: "Experience",
          value: data.yearsExperience
            ? `${data.yearsExperience} years`
            : "Not provided",
        },
        {
          label: "Specialisations",
          value:
            data.specialisations.length > 0
              ? data.specialisations.join(", ")
              : "None selected",
        },
      ],
    },
    {
      icon: Building2,
      title: "Company",
      items: [
        { label: "Company", value: data.company || "Not provided" },
        { label: "Address", value: data.address || "Not provided" },
      ],
    },
    {
      icon: Settings,
      title: "Preferences",
      items: [
        {
          label: "Default Inspection",
          value: data.defaultInspectionType || "Not set",
        },
        { label: "Region", value: data.defaultRegion || "Not set" },
        {
          label: "Email Notifications",
          value: data.emailNotifications ? "Enabled" : "Disabled",
        },
      ],
    },
  ];

  return (
    <Card className="bg-white/10 backdrop-blur-sm border-white/20">
      <CardHeader className="pb-4 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>
        <CardTitle className="text-white text-2xl">
          You&apos;re all set!
        </CardTitle>
        <p className="text-white/60">Review your details before completing</p>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="space-y-4 mb-6">
          {sections.map((section) => (
            <div
              key={section.title}
              className="bg-white/5 rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <section.icon className="w-4 h-4 text-white/60" />
                <h3 className="font-medium text-white">{section.title}</h3>
              </div>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-white/40">{item.label}</span>
                    <span className="text-white truncate ml-4 max-w-[60%] text-right">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-100">
            You can update any of these details later from your{" "}
            <strong>Profile</strong> and <strong>Settings</strong> pages.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            disabled={isSubmitting}
            className="flex-1 text-white/60 hover:text-white hover:bg-white/10"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={onComplete}
            disabled={isSubmitting}
            className="flex-1 bg-green-500 text-white hover:bg-green-600"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Completing...
              </>
            ) : (
              <>
                Complete Setup
                <CheckCircle2 className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default CompleteStep;
