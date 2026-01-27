"use client";

/**
 * Onboarding Page
 * Multi-step wizard for new inspector onboarding
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const router = useRouter();
  const [initialStep, setInitialStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<{
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
  } | null>(null);

  useEffect(() => {
    async function checkOnboardingStatus() {
      if (!isUserLoaded || !user) return;

      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();

          // If onboarding is already completed, redirect to dashboard
          if (data.onboardingCompleted) {
            router.push("/dashboard");
            return;
          }

          setUserData(data);
          setInitialStep(data.onboardingStep || 0);
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    checkOnboardingStatus();
  }, [isUserLoaded, user, router]);

  if (!isUserLoaded || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mb-4" />
          <p className="text-white/60">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/sign-in");
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <OnboardingWizard
        initialStep={initialStep}
        userData={userData}
        clerkUser={{
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.primaryEmailAddress?.emailAddress,
          imageUrl: user.imageUrl,
        }}
      />
    </div>
  );
}
