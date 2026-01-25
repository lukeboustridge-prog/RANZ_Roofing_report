"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SeverityBadge } from "@/components/badges/SeverityBadge";
import { ClassificationBadge } from "@/components/badges/ClassificationBadge";
import {
  Loader2,
  Lock,
  MapPin,
  Calendar,
  User,
  Building2,
  AlertTriangle,
  Download,
  FileText,
  Camera,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import type { DefectSeverity, DefectClass } from "@prisma/client";

interface SharedReport {
  share: {
    accessLevel: string;
    expiresAt: string | null;
    recipientName: string | null;
  };
  report: {
    reportNumber: string;
    status: string;
    propertyAddress: string;
    propertyCity: string;
    propertyRegion: string;
    propertyPostcode: string;
    propertyType: string;
    buildingAge: number | null;
    inspectionDate: string;
    inspectionType: string;
    weatherConditions: string | null;
    accessMethod: string | null;
    limitations: string | null;
    clientName: string;
    scopeOfWorks: unknown;
    methodology: unknown;
    equipment: unknown;
    executiveSummary: {
      keyFindings?: string[];
      majorDefects?: string;
      overallCondition?: string;
      criticalRecommendations?: string[];
    } | null;
    conclusions: unknown;
    recommendations: unknown;
    declarationSigned: boolean;
    signedAt: string | null;
    pdfUrl: string | null;
    inspector: {
      name: string;
      email: string;
      company: string | null;
      qualifications: string | null;
      lbpNumber: string | null;
    };
    defects: Array<{
      id: string;
      defectNumber: number;
      title: string;
      description: string;
      location: string;
      classification: string;
      severity: string;
      observation: string;
      analysis: string | null;
      opinion: string | null;
      codeReference: string | null;
      copReference: string | null;
      recommendation: string | null;
      priorityLevel: string | null;
      photos: Array<{
        id: string;
        url: string;
        thumbnailUrl: string | null;
        caption: string | null;
        photoType: string;
      }>;
    }>;
    roofElements: Array<{
      id: string;
      elementType: string;
      location: string;
      claddingType: string | null;
      material: string | null;
      conditionRating: string | null;
      conditionNotes: string | null;
    }>;
    photos: Array<{
      id: string;
      url: string;
      thumbnailUrl: string | null;
      caption: string | null;
      photoType: string;
    }>;
  };
}

export default function SharedReportPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [data, setData] = useState<SharedReport | null>(null);

  const fetchReport = async (pwd?: string) => {
    try {
      setLoading(true);
      setError("");

      const url = pwd
        ? `/api/shared/${token}?password=${encodeURIComponent(pwd)}`
        : `/api/shared/${token}`;

      const response = await fetch(url);
      const result = await response.json();

      if (!response.ok) {
        if (result.requiresPassword) {
          setRequiresPassword(true);
          setLoading(false);
          return;
        }
        throw new Error(result.error || "Failed to load report");
      }

      setData(result);
      setRequiresPassword(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [token]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    await fetchReport(password);
    setVerifying(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[var(--ranz-blue-500)] mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="mt-4 text-xl font-semibold">Unable to Access Report</h2>
            <p className="mt-2 text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <Lock className="h-12 w-12 text-[var(--ranz-blue-500)] mx-auto" />
            <CardTitle className="mt-4">Password Protected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground mb-6">
              This report is protected. Please enter the password to view.
            </p>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={verifying}>
                {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Access Report
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { share, report } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[var(--ranz-blue-700)] text-white py-6">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">RANZ Roofing Inspection Report</h1>
              <p className="text-white/80 mt-1">{report.reportNumber}</p>
            </div>
            {share.accessLevel === "VIEW_DOWNLOAD" && report.pdfUrl && (
              <Button
                variant="secondary"
                onClick={() => window.open(report.pdfUrl!, "_blank")}
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Sharing info banner */}
        {share.recipientName && (
          <div className="bg-[var(--ranz-blue-50)] border border-[var(--ranz-blue-200)] rounded-lg p-4 flex items-center gap-3">
            <User className="h-5 w-5 text-[var(--ranz-blue-500)]" />
            <span>
              Shared with <strong>{share.recipientName}</strong>
            </span>
            {share.expiresAt && (
              <span className="ml-auto text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Expires {new Date(share.expiresAt).toLocaleDateString()}
              </span>
            )}
          </div>
        )}

        {/* Executive Summary */}
        {report.executiveSummary && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {report.executiveSummary.keyFindings &&
                report.executiveSummary.keyFindings.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Key Findings</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {report.executiveSummary.keyFindings.map((finding, i) => (
                        <li key={i}>{finding}</li>
                      ))}
                    </ul>
                  </div>
                )}
              {report.executiveSummary.overallCondition && (
                <div>
                  <h4 className="font-medium mb-2">Overall Condition</h4>
                  <p className="text-sm">{report.executiveSummary.overallCondition}</p>
                </div>
              )}
              {report.executiveSummary.criticalRecommendations &&
                report.executiveSummary.criticalRecommendations.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Critical Recommendations</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {report.executiveSummary.criticalRecommendations.map(
                        (rec, i) => (
                          <li key={i}>{rec}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}
            </CardContent>
          </Card>
        )}

        {/* Property Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Property Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">
                  {report.propertyAddress}
                  <br />
                  {report.propertyCity}, {report.propertyRegion}{" "}
                  {report.propertyPostcode}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Property Type</p>
                <p className="font-medium">
                  {report.propertyType.replace(/_/g, " ")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Client</p>
                <p className="font-medium">{report.clientName}</p>
              </div>
              {report.buildingAge && (
                <div>
                  <p className="text-sm text-muted-foreground">Building Age</p>
                  <p className="font-medium">{report.buildingAge} years</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Inspection Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Inspection Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Inspection Date</p>
                <p className="font-medium">
                  {new Date(report.inspectionDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inspection Type</p>
                <p className="font-medium">
                  {report.inspectionType.replace(/_/g, " ")}
                </p>
              </div>
              {report.weatherConditions && (
                <div>
                  <p className="text-sm text-muted-foreground">Weather</p>
                  <p className="font-medium">{report.weatherConditions}</p>
                </div>
              )}
              {report.accessMethod && (
                <div>
                  <p className="text-sm text-muted-foreground">Access Method</p>
                  <p className="font-medium">{report.accessMethod}</p>
                </div>
              )}
            </div>
            {report.limitations && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">Limitations</p>
                <p className="text-sm mt-1">{report.limitations}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inspector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Inspector
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="font-medium text-lg">{report.inspector.name}</p>
                {report.inspector.company && (
                  <p className="text-sm text-muted-foreground">
                    {report.inspector.company}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                {report.inspector.lbpNumber && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">LBP:</span>{" "}
                    {report.inspector.lbpNumber}
                  </p>
                )}
                {report.inspector.qualifications && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Qualifications:</span>{" "}
                    {report.inspector.qualifications}
                  </p>
                )}
              </div>
            </div>
            {report.declarationSigned && (
              <div className="mt-4 flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">
                  Expert declaration signed{" "}
                  {report.signedAt &&
                    `on ${new Date(report.signedAt).toLocaleDateString()}`}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Defects */}
        {report.defects.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Defects ({report.defects.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {report.defects.map((defect) => (
                <div
                  key={defect.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-muted-foreground">
                          #{defect.defectNumber}
                        </span>
                        <h4 className="font-semibold">{defect.title}</h4>
                        <SeverityBadge severity={defect.severity as DefectSeverity} />
                        <ClassificationBadge
                          classification={defect.classification as DefectClass}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {defect.location}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase">
                        Observation
                      </p>
                      <p className="text-sm">{defect.observation}</p>
                    </div>
                    {defect.analysis && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase">
                          Analysis
                        </p>
                        <p className="text-sm">{defect.analysis}</p>
                      </div>
                    )}
                    {defect.opinion && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase">
                          Opinion
                        </p>
                        <p className="text-sm italic">{defect.opinion}</p>
                      </div>
                    )}
                    {defect.recommendation && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase">
                          Recommendation
                        </p>
                        <p className="text-sm">{defect.recommendation}</p>
                        {defect.priorityLevel && (
                          <Badge variant="outline" className="mt-1">
                            {defect.priorityLevel.replace(/_/g, " ")}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {defect.photos.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-2">
                      {defect.photos.map((photo) => (
                        <div
                          key={photo.id}
                          className="relative w-20 h-20 rounded overflow-hidden bg-muted"
                        >
                          <Image
                            src={photo.thumbnailUrl || photo.url}
                            alt={photo.caption || "Defect photo"}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* General Photos */}
        {report.photos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Photos ({report.photos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {report.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square rounded-lg overflow-hidden bg-muted"
                  >
                    <Image
                      src={photo.thumbnailUrl || photo.url}
                      alt={photo.caption || "Report photo"}
                      fill
                      className="object-cover"
                    />
                    {photo.caption && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 truncate">
                        {photo.caption}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground py-8 border-t">
          <p>
            This report was generated by{" "}
            <strong>RANZ Roofing Inspection Report Platform</strong>
          </p>
          <p className="mt-1">
            Report Number: {report.reportNumber} | Status:{" "}
            {report.status.replace(/_/g, " ")}
          </p>
        </div>
      </main>
    </div>
  );
}
