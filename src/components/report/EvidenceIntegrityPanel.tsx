"use client";

/**
 * EvidenceIntegrityPanel Component
 * Displays photo evidence integrity metrics and chain of custody information
 * Critical for court-ready reports to demonstrate evidence authenticity
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Camera,
  MapPin,
  Clock,
  Hash,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Smartphone,
  FileImage,
  Link2,
} from "lucide-react";

interface EvidenceIntegrityResult {
  summary: {
    totalPhotos: number;
    withHash: number;
    hashVerified: number;
    withExif: number;
    withGps: number;
    withCamera: number;
    withTimestamp: number;
    edited: number;
    integrityScore: number;
  };
  photos: Array<{
    id: string;
    filename: string;
    hasHash: boolean;
    hashVerified: boolean;
    hasExif: boolean;
    hasGps: boolean;
    hasCamera: boolean;
    hasTimestamp: boolean;
    isEdited: boolean;
    capturedAt: string | null;
    uploadedAt: string;
    cameraMake: string | null;
    cameraModel: string | null;
    gpsLat: number | null;
    gpsLng: number | null;
  }>;
  chainOfCustody: {
    firstUpload: string | null;
    lastUpload: string | null;
    uniqueDevices: string[];
    uploadEvents: Array<{
      action: string;
      timestamp: string;
      user: string;
      details: string | null;
    }>;
  };
}

interface EvidenceIntegrityPanelProps {
  reportId: string;
  compact?: boolean;
  className?: string;
}

export function EvidenceIntegrityPanel({
  reportId,
  compact = false,
  className = "",
}: EvidenceIntegrityPanelProps) {
  const [data, setData] = useState<EvidenceIntegrityResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/reports/${reportId}/evidence-integrity`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch evidence integrity");
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load evidence integrity");
    } finally {
      setIsLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 text-muted-foreground ${className}`}>
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading evidence integrity...</span>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const { summary, photos, chainOfCustody } = data;

  // Determine integrity level
  const getIntegrityLevel = (score: number) => {
    if (score >= 90) return { label: "Excellent", color: "text-green-600", bg: "bg-green-50", border: "border-green-200" };
    if (score >= 70) return { label: "Good", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" };
    if (score >= 50) return { label: "Fair", color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200" };
    return { label: "Poor", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" };
  };

  const integrity = getIntegrityLevel(summary.integrityScore);

  // Compact badge mode
  if (compact) {
    return (
      <Badge
        variant="outline"
        className={`gap-1 ${integrity.color} ${integrity.border} ${integrity.bg} ${className}`}
      >
        {summary.integrityScore >= 70 ? (
          <ShieldCheck className="h-3 w-3" />
        ) : (
          <ShieldAlert className="h-3 w-3" />
        )}
        {summary.integrityScore}% Integrity
      </Badge>
    );
  }

  // Calculate percentages
  const pctHash = summary.totalPhotos > 0 ? Math.round((summary.withHash / summary.totalPhotos) * 100) : 0;
  const pctGps = summary.totalPhotos > 0 ? Math.round((summary.withGps / summary.totalPhotos) * 100) : 0;
  const pctExif = summary.totalPhotos > 0 ? Math.round((summary.withExif / summary.totalPhotos) * 100) : 0;
  const pctTimestamp = summary.totalPhotos > 0 ? Math.round((summary.withTimestamp / summary.totalPhotos) * 100) : 0;

  // Find photos missing key data
  const photosMissingGps = photos.filter((p) => !p.hasGps);
  const photosMissingTimestamp = photos.filter((p) => !p.hasTimestamp);
  const photosMissingHash = photos.filter((p) => !p.hasHash);

  return (
    <Card className={`${className} ${integrity.border} ${integrity.bg}/30`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-blue-600" />
            Evidence Integrity
            <Badge
              variant="outline"
              className={`${integrity.color} ${integrity.border} ${integrity.bg}`}
            >
              {integrity.label}
            </Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Chain of custody and photo evidence verification for {summary.totalPhotos} photos
        </CardDescription>

        {/* Overall Score */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Integrity Score</span>
            <span className="font-medium">{summary.integrityScore}%</span>
          </div>
          <Progress
            value={summary.integrityScore}
            className={`h-2 ${
              summary.integrityScore >= 70
                ? "[&>div]:bg-green-500"
                : summary.integrityScore >= 50
                ? "[&>div]:bg-yellow-500"
                : "[&>div]:bg-red-500"
            }`}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background border">
            <Hash className={`h-4 w-4 ${pctHash === 100 ? "text-green-500" : "text-muted-foreground"}`} />
            <div className="text-sm">
              <span className="font-medium">{summary.withHash}/{summary.totalPhotos}</span>
              <span className="text-muted-foreground ml-1">with hash</span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background border">
            <MapPin className={`h-4 w-4 ${pctGps === 100 ? "text-green-500" : pctGps >= 80 ? "text-yellow-500" : "text-red-500"}`} />
            <div className="text-sm">
              <span className="font-medium">{summary.withGps}/{summary.totalPhotos}</span>
              <span className="text-muted-foreground ml-1">with GPS</span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background border">
            <Clock className={`h-4 w-4 ${pctTimestamp === 100 ? "text-green-500" : "text-muted-foreground"}`} />
            <div className="text-sm">
              <span className="font-medium">{summary.withTimestamp}/{summary.totalPhotos}</span>
              <span className="text-muted-foreground ml-1">with timestamp</span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background border">
            <Camera className={`h-4 w-4 ${summary.withCamera === summary.totalPhotos ? "text-green-500" : "text-muted-foreground"}`} />
            <div className="text-sm">
              <span className="font-medium">{summary.withCamera}/{summary.totalPhotos}</span>
              <span className="text-muted-foreground ml-1">with camera</span>
            </div>
          </div>
        </div>

        {/* Warnings */}
        {(photosMissingGps.length > 0 || photosMissingTimestamp.length > 0) && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-700 font-medium text-sm mb-2">
              <AlertTriangle className="h-4 w-4" />
              Evidence Gaps
            </div>
            <ul className="space-y-1 text-xs text-yellow-600">
              {photosMissingGps.length > 0 && (
                <li className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  {photosMissingGps.length} photo(s) missing GPS coordinates
                </li>
              )}
              {photosMissingTimestamp.length > 0 && (
                <li className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  {photosMissingTimestamp.length} photo(s) missing capture timestamp
                </li>
              )}
              {photosMissingHash.length > 0 && (
                <li className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  {photosMissingHash.length} photo(s) missing integrity hash
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Chain of Custody Summary */}
        <div className="p-3 bg-background border rounded-lg">
          <div className="flex items-center gap-2 font-medium text-sm mb-2">
            <Link2 className="h-4 w-4 text-blue-600" />
            Chain of Custody
          </div>
          <div className="space-y-2 text-xs text-muted-foreground">
            {chainOfCustody.firstUpload && (
              <div className="flex justify-between">
                <span>First Upload:</span>
                <span className="font-medium text-foreground">
                  {new Date(chainOfCustody.firstUpload).toLocaleString("en-NZ")}
                </span>
              </div>
            )}
            {chainOfCustody.lastUpload && (
              <div className="flex justify-between">
                <span>Last Upload:</span>
                <span className="font-medium text-foreground">
                  {new Date(chainOfCustody.lastUpload).toLocaleString("en-NZ")}
                </span>
              </div>
            )}
            {chainOfCustody.uniqueDevices.length > 0 && (
              <div className="flex justify-between">
                <span>Devices Used:</span>
                <span className="font-medium text-foreground">
                  {chainOfCustody.uniqueDevices.length}
                </span>
              </div>
            )}
            {summary.edited > 0 && (
              <div className="flex justify-between text-yellow-600">
                <span>Annotated Photos:</span>
                <span className="font-medium">{summary.edited}</span>
              </div>
            )}
          </div>
        </div>

        {/* Expandable Details */}
        <button
          className="w-full flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="text-sm font-medium">View Detailed Breakdown</span>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {expanded && (
          <div className="space-y-4 pt-2">
            {/* Devices Used */}
            {chainOfCustody.uniqueDevices.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Smartphone className="h-4 w-4 text-gray-600" />
                  Capture Devices
                </h4>
                <div className="flex flex-wrap gap-2">
                  {chainOfCustody.uniqueDevices.map((device, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {device}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Upload Events */}
            {chainOfCustody.uploadEvents.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <FileImage className="h-4 w-4 text-gray-600" />
                  Recent Activity ({chainOfCustody.uploadEvents.length} events)
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {chainOfCustody.uploadEvents.slice(0, 10).map((event, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        {event.action === "PHOTO_ADDED" ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span>{event.action.replace("_", " ")}</span>
                        {event.details && (
                          <span className="text-muted-foreground truncate max-w-[100px]">
                            {event.details}
                          </span>
                        )}
                      </div>
                      <span className="text-muted-foreground">
                        {new Date(event.timestamp).toLocaleDateString("en-NZ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Individual Photo Status */}
            <button
              className="w-full flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition-colors border"
              onClick={() => setShowPhotos(!showPhotos)}
            >
              <span className="text-sm">Individual Photo Status</span>
              {showPhotos ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {showPhotos && (
              <div className="max-h-60 overflow-y-auto space-y-1">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded border"
                  >
                    <span className="truncate max-w-[120px] font-medium">
                      {photo.filename}
                    </span>
                    <div className="flex items-center gap-1">
                      <span
                        className={photo.hasHash ? "text-green-500" : "text-red-500"}
                        title="Hash"
                      >
                        <Hash className="h-3 w-3" />
                      </span>
                      <span
                        className={photo.hasGps ? "text-green-500" : "text-red-500"}
                        title="GPS"
                      >
                        <MapPin className="h-3 w-3" />
                      </span>
                      <span
                        className={photo.hasTimestamp ? "text-green-500" : "text-red-500"}
                        title="Timestamp"
                      >
                        <Clock className="h-3 w-3" />
                      </span>
                      <span
                        className={photo.hasCamera ? "text-green-500" : "text-gray-300"}
                        title="Camera"
                      >
                        <Camera className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Legal Note */}
            <div className="pt-3 border-t text-xs text-muted-foreground">
              <p>
                <strong>Evidence Act 2006, s.137:</strong> Digital evidence integrity
                is established through hash verification and metadata preservation.
                Photos with complete EXIF data and GPS coordinates have higher
                evidentiary value.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default EvidenceIntegrityPanel;
