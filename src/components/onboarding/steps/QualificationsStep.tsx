"use client";

/**
 * Qualifications Step
 * LBP and professional qualifications
 */

import { Award, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { OnboardingData } from "../OnboardingWizard";

interface QualificationsStepProps {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const SPECIALISATIONS = [
  { id: "metal", label: "Metal Roofing" },
  { id: "tile", label: "Concrete/Clay Tile" },
  { id: "membrane", label: "Membrane Roofing" },
  { id: "shingle", label: "Shingles" },
  { id: "slate", label: "Slate" },
  { id: "commercial", label: "Commercial Systems" },
  { id: "heritage", label: "Heritage Buildings" },
  { id: "disputes", label: "Dispute Resolution" },
];

export function QualificationsStep({
  data,
  onUpdate,
  onNext,
  onBack,
}: QualificationsStepProps) {
  const toggleSpecialisation = (id: string) => {
    const current = data.specialisations || [];
    if (current.includes(id)) {
      onUpdate({ specialisations: current.filter((s) => s !== id) });
    } else {
      onUpdate({ specialisations: [...current, id] });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <Card className="bg-white/10 backdrop-blur-sm border-white/20">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-white">Qualifications</CardTitle>
            <p className="text-sm text-white/60">
              Your professional credentials
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* LBP Number */}
          <div className="space-y-2">
            <Label htmlFor="lbpNumber" className="text-white">
              LBP Number
            </Label>
            <Input
              id="lbpNumber"
              type="text"
              value={data.lbpNumber}
              onChange={(e) => onUpdate({ lbpNumber: e.target.value })}
              placeholder="e.g., BP123456"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40"
            />
            <p className="text-xs text-white/40">
              Your Licensed Building Practitioner number (if applicable)
            </p>
          </div>

          {/* Years of Experience */}
          <div className="space-y-2">
            <Label htmlFor="yearsExperience" className="text-white">
              Years of Experience
            </Label>
            <Input
              id="yearsExperience"
              type="number"
              min="0"
              max="60"
              value={data.yearsExperience || ""}
              onChange={(e) =>
                onUpdate({
                  yearsExperience: e.target.value
                    ? parseInt(e.target.value)
                    : null,
                })
              }
              placeholder="e.g., 15"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40"
            />
          </div>

          {/* Qualifications */}
          <div className="space-y-2">
            <Label htmlFor="qualifications" className="text-white">
              Qualifications & Certifications
            </Label>
            <Textarea
              id="qualifications"
              value={data.qualifications}
              onChange={(e) => onUpdate({ qualifications: e.target.value })}
              placeholder="List your relevant qualifications, certifications, and training..."
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 min-h-[100px]"
            />
            <p className="text-xs text-white/40">
              This information will appear in the &ldquo;Inspector Credentials&rdquo;
              section of your reports
            </p>
          </div>

          {/* Specialisations */}
          <div className="space-y-3">
            <Label className="text-white">Specialisations</Label>
            <div className="grid grid-cols-2 gap-2">
              {SPECIALISATIONS.map((spec) => {
                const isSelected = data.specialisations?.includes(spec.id);
                return (
                  <button
                    key={spec.id}
                    type="button"
                    onClick={() => toggleSpecialisation(spec.id)}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border text-left transition-colors",
                      isSelected
                        ? "bg-white/20 border-white/40 text-white"
                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      className="border-white/40 data-[state=checked]:bg-white data-[state=checked]:text-[var(--ranz-charcoal)]"
                    />
                    <span className="text-sm">{spec.label}</span>
                  </button>
                );
              })}
            </div>
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

export default QualificationsStep;
