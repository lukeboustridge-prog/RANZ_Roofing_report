"use client";

/**
 * Company Step
 * Business information collection
 */

import { Building2, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OnboardingData } from "../OnboardingWizard";

interface CompanyStepProps {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function CompanyStep({
  data,
  onUpdate,
  onNext,
  onBack,
}: CompanyStepProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <Card className="bg-white/10 backdrop-blur-sm border-white/20">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-white">Company Details</CardTitle>
            <p className="text-sm text-white/60">
              Your business information (optional)
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="company" className="text-white">
              Company / Trading Name
            </Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                id="company"
                type="text"
                value={data.company}
                onChange={(e) => onUpdate({ company: e.target.value })}
                placeholder="e.g., ABC Roofing Inspections Ltd"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 pl-10"
              />
            </div>
          </div>

          {/* Business Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-white">
              Business Address
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-white/40" />
              <Textarea
                id="address"
                value={data.address}
                onChange={(e) => onUpdate({ address: e.target.value })}
                placeholder="Enter your business address..."
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 min-h-[80px] pl-10"
              />
            </div>
            <p className="text-xs text-white/40">
              This can appear on your reports if required
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4">
            <p className="text-sm text-blue-100">
              <strong>Note:</strong> Company details are optional. If you
              operate as a sole trader, you can leave these fields blank or
              enter your personal details.
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

export default CompanyStep;
