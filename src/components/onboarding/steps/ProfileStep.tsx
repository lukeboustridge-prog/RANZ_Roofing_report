"use client";

/**
 * Profile Step
 * Basic profile information collection
 */

import { User, Phone, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OnboardingData } from "../OnboardingWizard";

interface ProfileStepProps {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function ProfileStep({ data, onUpdate, onNext, onBack }: ProfileStepProps) {
  const isValid = data.name.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onNext();
    }
  };

  return (
    <Card className="bg-white/10 backdrop-blur-sm border-white/20">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-white">Your Profile</CardTitle>
            <p className="text-sm text-white/60">
              Tell us a bit about yourself
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white">
              Full Name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              value={data.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="Enter your full name"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40"
              required
            />
            <p className="text-xs text-white/40">
              This will appear on your inspection reports
            </p>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-white">
              Phone Number
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                id="phone"
                type="tel"
                value={data.phone}
                onChange={(e) => onUpdate({ phone: e.target.value })}
                placeholder="021 123 4567"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 pl-10"
              />
            </div>
            <p className="text-xs text-white/40">
              For client contact and assignment notifications
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
              disabled={!isValid}
              className="flex-1 bg-white text-[var(--ranz-charcoal)] hover:bg-white/90 disabled:opacity-50"
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

export default ProfileStep;
