"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Award,
  Calendar,
  FileText,
  CheckCircle2,
  Shield,
  Briefcase,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";

interface InspectorProfile {
  id: string;
  name: string;
  qualifications: string | null;
  lbpNumber: string | null;
  yearsExperience: number | null;
  specialisations: string[];
  memberSince: string;
  memberYears: number;
  stats: {
    completedReports: number;
    avgDefectsPerReport: string;
    inspectionTypes: Array<{ type: string; count: number }>;
  };
}

const INSPECTION_TYPE_LABELS: Record<string, string> = {
  FULL_INSPECTION: "Full Inspection",
  VISUAL_ONLY: "Visual Only",
  NON_INVASIVE: "Non-Invasive",
  INVASIVE: "Invasive",
  DISPUTE_RESOLUTION: "Dispute Resolution",
  PRE_PURCHASE: "Pre-Purchase",
  MAINTENANCE_REVIEW: "Maintenance Review",
  WARRANTY_CLAIM: "Warranty Claim",
};

const SPECIALISATION_LABELS: Record<string, string> = {
  metal: "Metal Roofing",
  tile: "Tile Roofing",
  membrane: "Membrane Roofing",
  slate: "Slate Roofing",
  shingle: "Shingle Roofing",
  commercial: "Commercial Buildings",
  residential: "Residential Buildings",
  industrial: "Industrial Buildings",
};

export default function InspectorProfilePage() {
  const params = useParams();
  const inspectorId = params.id as string;

  const [profile, setProfile] = useState<InspectorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProfile();
  }, [inspectorId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/inspectors/${inspectorId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Inspector not found");
        }
        throw new Error("Failed to fetch inspector profile");
      }
      const data = await response.json();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--ranz-blue-500)]" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Inspector Not Found</h2>
            <p className="text-muted-foreground mb-6">
              {error || "The inspector profile you're looking for doesn't exist or is not available."}
            </p>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[var(--ranz-charcoal)] text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-white/70 hover:text-white mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to RANZ
          </Link>

          <div className="flex items-start gap-6">
            {/* Avatar placeholder */}
            <div className="h-24 w-24 rounded-full bg-[var(--ranz-charcoal-light)] flex items-center justify-center flex-shrink-0">
              <span className="text-3xl font-bold text-white">
                {profile.name.charAt(0).toUpperCase()}
              </span>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{profile.name}</h1>
                <Badge className="bg-[var(--ranz-yellow)] text-[var(--ranz-charcoal)]">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Verified Inspector
                </Badge>
              </div>

              {profile.lbpNumber && (
                <p className="text-white/70 mb-3">
                  LBP #: {profile.lbpNumber}
                </p>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-white/70">
                {profile.yearsExperience && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    {profile.yearsExperience}+ years experience
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Member since {new Date(profile.memberSince).getFullYear()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-[var(--ranz-blue-50)] rounded-lg">
                  <FileText className="h-5 w-5 text-[var(--ranz-blue-600)]" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{profile.stats.completedReports}</p>
                  <p className="text-sm text-muted-foreground">Reports Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{profile.stats.avgDefectsPerReport}</p>
                  <p className="text-sm text-muted-foreground">Avg Defects/Report</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Award className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{profile.memberYears}+</p>
                  <p className="text-sm text-muted-foreground">Years as Member</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Qualifications */}
        {profile.qualifications && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Qualifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{profile.qualifications}</p>
            </CardContent>
          </Card>
        )}

        {/* Specialisations */}
        {profile.specialisations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Specialisations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.specialisations.map((spec, index) => (
                  <Badge key={index} variant="secondary">
                    {SPECIALISATION_LABELS[spec] || spec}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inspection Experience */}
        {profile.stats.inspectionTypes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Inspection Experience
              </CardTitle>
              <CardDescription>
                Breakdown of completed inspection types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {profile.stats.inspectionTypes.map((type, index) => {
                  const percentage = profile.stats.completedReports > 0
                    ? Math.round((type.count / profile.stats.completedReports) * 100)
                    : 0;
                  return (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">
                          {INSPECTION_TYPE_LABELS[type.type] || type.type.replace(/_/g, " ")}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {type.count} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--ranz-blue-500)] rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* RANZ Verification */}
        <Card className="border-[var(--ranz-blue-200)] bg-[var(--ranz-blue-50)]/50">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-white rounded-lg">
                <Image
                  src="/logo.png"
                  alt="RANZ Logo"
                  width={40}
                  height={40}
                  className="h-10 w-10"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--ranz-blue-900)] mb-1">
                  RANZ Verified Inspector
                </h3>
                <p className="text-sm text-[var(--ranz-blue-700)]">
                  This inspector has been verified by the Roofing Association of New Zealand (RANZ)
                  and meets all requirements for professional roofing inspections.
                </p>
                <a
                  href="https://www.ranz.co.nz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-[var(--ranz-blue-600)] hover:text-[var(--ranz-blue-800)] mt-2"
                >
                  Learn more about RANZ
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="border-t bg-white py-6">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            This profile is provided by the RANZ Roofing Inspection Report Platform.
          </p>
          <p className="mt-1">
            For more information, visit{" "}
            <a
              href="https://www.ranz.co.nz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--ranz-blue-600)] hover:underline"
            >
              ranz.co.nz
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
