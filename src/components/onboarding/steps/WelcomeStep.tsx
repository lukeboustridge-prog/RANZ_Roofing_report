"use client";

/**
 * Welcome Step
 * First step of onboarding - introduces the platform
 */

import { Sparkles, FileText, Shield, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface WelcomeStepProps {
  userName: string;
  onContinue: () => void;
  onSkip: () => void;
}

const FEATURES = [
  {
    icon: FileText,
    title: "Professional Reports",
    description: "Create legally defensible, ISO-compliant inspection reports",
  },
  {
    icon: Shield,
    title: "Evidence Integrity",
    description: "SHA-256 hash verification for all photographic evidence",
  },
  {
    icon: Smartphone,
    title: "Mobile-First",
    description: "Capture photos and data on-site with offline support",
  },
];

export function WelcomeStep({ userName, onContinue, onSkip }: WelcomeStepProps) {
  return (
    <Card className="bg-white/10 backdrop-blur-sm border-white/20">
      <CardContent className="pt-8 pb-6 px-6 sm:px-10">
        {/* Welcome Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome, {userName}!
          </h1>
          <p className="text-white/70 text-lg">
            Let&apos;s set up your RANZ Inspector profile
          </p>
        </div>

        {/* Features */}
        <div className="space-y-4 mb-8">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="flex items-start gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <feature.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{feature.title}</h3>
                <p className="text-sm text-white/60">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={onContinue}
            className="w-full bg-white text-[var(--ranz-charcoal)] hover:bg-white/90 font-semibold py-6"
          >
            Get Started
          </Button>
          <Button
            variant="ghost"
            onClick={onSkip}
            className="w-full text-white/60 hover:text-white hover:bg-white/10"
          >
            Skip for now
          </Button>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          This will only take a few minutes
        </p>
      </CardContent>
    </Card>
  );
}

export default WelcomeStep;
