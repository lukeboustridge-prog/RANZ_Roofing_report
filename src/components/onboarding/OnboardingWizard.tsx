"use client";

/**
 * Onboarding Wizard
 * Multi-step wizard component for new inspector onboarding
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Step components
import { WelcomeStep } from "./steps/WelcomeStep";
import { ProfileStep } from "./steps/ProfileStep";
import { QualificationsStep } from "./steps/QualificationsStep";
import { CompanyStep } from "./steps/CompanyStep";
import { PreferencesStep } from "./steps/PreferencesStep";
import { CompleteStep } from "./steps/CompleteStep";

export interface OnboardingData {
  // Profile
  name: string;
  phone: string;
  // Qualifications
  qualifications: string;
  lbpNumber: string;
  yearsExperience: number | null;
  specialisations: string[];
  // Company
  company: string;
  address: string;
  // Preferences
  defaultInspectionType: string;
  defaultRegion: string;
  emailNotifications: boolean;
}

interface OnboardingWizardProps {
  initialStep?: number;
  userData?: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    address?: string;
    qualifications?: string;
    lbpNumber?: string;
    yearsExperience?: number;
    specialisations?: string[];
    onboardingStep: number;
    onboardingCompleted: boolean;
  } | null;
  clerkUser?: {
    firstName: string | null;
    lastName: string | null;
    email: string | undefined;
    imageUrl: string;
  };
}

const STEPS = [
  { id: "welcome", title: "Welcome", description: "Get started" },
  { id: "profile", title: "Profile", description: "Your details" },
  { id: "qualifications", title: "Qualifications", description: "Credentials" },
  { id: "company", title: "Company", description: "Business info" },
  { id: "preferences", title: "Preferences", description: "Settings" },
  { id: "complete", title: "Complete", description: "All done!" },
];

export function OnboardingWizard({
  initialStep = 0,
  userData,
  clerkUser,
}: OnboardingWizardProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form data state
  const [formData, setFormData] = useState<OnboardingData>({
    name:
      userData?.name ||
      `${clerkUser?.firstName || ""} ${clerkUser?.lastName || ""}`.trim(),
    phone: userData?.phone || "",
    qualifications: userData?.qualifications || "",
    lbpNumber: userData?.lbpNumber || "",
    yearsExperience: userData?.yearsExperience || null,
    specialisations: userData?.specialisations || [],
    company: userData?.company || "",
    address: userData?.address || "",
    defaultInspectionType: "",
    defaultRegion: "",
    emailNotifications: true,
  });

  const updateFormData = useCallback(
    (updates: Partial<OnboardingData>) => {
      setFormData((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const saveProgress = async (step: number) => {
    try {
      await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step,
          ...formData,
        }),
      });
    } catch (error) {
      console.error("Failed to save progress:", error);
    }
  };

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1) {
      const nextStep = currentStep + 1;
      await saveProgress(nextStep);
      setCurrentStep(nextStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to complete onboarding");
      }

      // Try to create welcome notification (ignore errors)
      try {
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "ONBOARDING_COMPLETE",
            title: "Welcome to RANZ!",
            message:
              "Your profile is complete. You can now start creating inspection reports.",
          }),
        });
      } catch {
        // Notification creation is non-critical
      }

      toast({
        title: "Onboarding Complete!",
        description: "Welcome to RANZ. Redirecting to your dashboard...",
      });

      // Use full page reload to ensure session claims are refreshed
      // router.push doesn't refresh Clerk session tokens, causing
      // middleware to redirect back to onboarding
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1500);
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    // Skip onboarding by completing with current/minimal data
    // This prevents middleware from redirecting back to onboarding
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          // Ensure required field has a value
          name: formData.name || "Inspector",
        }),
      });

      if (!response.ok) {
        // If API fails, show error but still try to navigate
        console.error("Failed to save skip state");
      }

      // Use full page reload to refresh session claims
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Skip error:", error);
      // Still try to navigate even if save failed
      window.location.href = "/dashboard";
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <WelcomeStep
            userName={formData.name || clerkUser?.firstName || "there"}
            onContinue={handleNext}
            onSkip={handleSkip}
            isSkipping={isSubmitting}
          />
        );
      case 1:
        return (
          <ProfileStep
            data={formData}
            onUpdate={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 2:
        return (
          <QualificationsStep
            data={formData}
            onUpdate={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <CompanyStep
            data={formData}
            onUpdate={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <PreferencesStep
            data={formData}
            onUpdate={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 5:
        return (
          <CompleteStep
            data={formData}
            onComplete={handleComplete}
            onBack={handleBack}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Progress Steps */}
      {currentStep > 0 && currentStep < STEPS.length - 1 && (
        <div className="px-4">
          <nav aria-label="Progress">
            <ol className="flex items-center justify-center gap-2">
              {STEPS.slice(1, -1).map((step, index) => {
                const stepIndex = index + 1; // Offset by 1 since we skip welcome
                const isActive = currentStep === stepIndex;
                const isCompleted = currentStep > stepIndex;

                return (
                  <li key={step.id} className="flex items-center">
                    <div
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                        isActive &&
                          "bg-white text-[var(--ranz-charcoal)]",
                        isCompleted &&
                          "bg-green-500 text-white",
                        !isActive &&
                          !isCompleted &&
                          "bg-white/10 text-white/60"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        stepIndex
                      )}
                    </div>
                    {index < STEPS.length - 3 && (
                      <div
                        className={cn(
                          "w-8 h-0.5 mx-1",
                          isCompleted ? "bg-green-500" : "bg-white/10"
                        )}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
            <p className="text-center mt-3 text-white/60 text-sm">
              Step {currentStep} of {STEPS.length - 2}:{" "}
              <span className="text-white">{STEPS[currentStep].title}</span>
            </p>
          </nav>
        </div>
      )}

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      {/* Skip link for intermediate steps */}
      {currentStep > 0 && currentStep < STEPS.length - 1 && (
        <div className="text-center mt-4">
          <button
            onClick={handleSkip}
            disabled={isSubmitting}
            className="text-sm text-white/40 hover:text-white/60 underline underline-offset-2 disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Skip and complete later"}
          </button>
        </div>
      )}
    </div>
  );
}

export default OnboardingWizard;
