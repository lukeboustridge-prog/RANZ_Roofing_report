"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ArrowLeft,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  MapPin,
  Calendar,
  Hash,
  RefreshCw,
  FileText,
  Download,
} from "lucide-react";

interface Photo {
  id: string;
  filename: string;
  originalFilename: string;
  url: string;
  thumbnailUrl: string | null;
  photoType: string;
  originalHash: string;
  hashVerified: boolean;
  isEdited: boolean;
  capturedAt: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  cameraMake: string | null;
  cameraModel: string | null;
  createdAt: string;
}

interface VerificationResult {
  photoId: string;
  filename: string;
  verified: boolean;
  originalHash: string | null;
  currentHash: string | null;
  hashMatch: boolean;
  metadata: {
    capturedAt: string | null;
    gpsLat: number | null;
    gpsLng: number | null;
    cameraMake: string | null;
    cameraModel: string | null;
    isEdited: boolean;
  };
  chainOfCustody: {
    uploadedAt: string;
    lastVerifiedAt: string;
    accessCount: number;
  };
}

export default function EvidenceIntegrityPage() {
  const params = useParams();
  const reportId = params.id as string;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [verificationResults, setVerificationResults] = useState<Map<string, VerificationResult>>(new Map());
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPhotos();
  }, [reportId]);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/photos?reportId=${reportId}`);
      if (!response.ok) throw new Error("Failed to fetch photos");
      const data = await response.json();
      setPhotos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const verifyPhoto = async (photoId: string) => {
    try {
      setVerifying((prev) => new Set(prev).add(photoId));
      const response = await fetch(`/api/photos/${photoId}/verify`);
      if (!response.ok) throw new Error("Failed to verify photo");
      const result = await response.json();
      setVerificationResults((prev) => new Map(prev).set(photoId, result));
    } catch (err) {
      console.error("Verification error:", err);
    } finally {
      setVerifying((prev) => {
        const next = new Set(prev);
        next.delete(photoId);
        return next;
      });
    }
  };

  const verifyAllPhotos = async () => {
    for (const photo of photos) {
      await verifyPhoto(photo.id);
    }
  };

  const getVerificationStatus = (photo: Photo) => {
    const result = verificationResults.get(photo.id);
    if (result) {
      return result.verified ? "verified" : "failed";
    }
    return photo.hashVerified ? "previously-verified" : "unverified";
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Unknown";
    return new Date(dateStr).toLocaleString();
  };

  const verifiedCount = photos.filter(
    (p) => getVerificationStatus(p) === "verified" || getVerificationStatus(p) === "previously-verified"
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Link
            href={`/reports/${reportId}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Report
          </Link>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Evidence Integrity
          </h1>
          <p className="text-muted-foreground">
            Verify the integrity and chain of custody for all photos in this report.
          </p>
        </div>
        <Button onClick={verifyAllPhotos} disabled={verifying.size > 0}>
          {verifying.size > 0 ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Verify All Photos
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Camera className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{photos.length}</p>
                <p className="text-sm text-muted-foreground">Total Photos</p>
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
                <p className="text-2xl font-bold">{verifiedCount}</p>
                <p className="text-sm text-muted-foreground">Verified</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {photos.filter((p) => p.isEdited).length}
                </p>
                <p className="text-sm text-muted-foreground">Annotated</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-50 rounded-lg">
                <MapPin className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {photos.filter((p) => p.gpsLat && p.gpsLng).length}
                </p>
                <p className="text-sm text-muted-foreground">With GPS</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Photo Evidence List */}
      {photos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Photos</h3>
            <p className="text-muted-foreground">
              This report has no photos to verify.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {photos.map((photo) => {
            const status = getVerificationStatus(photo);
            const result = verificationResults.get(photo.id);
            const isVerifying = verifying.has(photo.id);

            return (
              <Card key={photo.id}>
                <CardContent className="pt-6">
                  <div className="flex gap-6">
                    {/* Thumbnail */}
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {photo.thumbnailUrl || photo.url ? (
                        <Image
                          src={photo.thumbnailUrl || photo.url}
                          alt={photo.originalFilename}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold truncate">{photo.originalFilename}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{photo.photoType.replace("_", " ")}</Badge>
                            {photo.isEdited && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                Annotated
                              </Badge>
                            )}
                            {status === "verified" && (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                            {status === "previously-verified" && (
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Previously Verified
                              </Badge>
                            )}
                            {status === "failed" && (
                              <Badge className="bg-red-100 text-red-800">
                                <XCircle className="h-3 w-3 mr-1" />
                                Verification Failed
                              </Badge>
                            )}
                            {status === "unverified" && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Not Verified
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => verifyPhoto(photo.id)}
                          disabled={isVerifying}
                        >
                          {isVerifying ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Verify
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Captured
                          </span>
                          <p className="font-medium">{formatDate(photo.capturedAt)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            GPS
                          </span>
                          <p className="font-medium">
                            {photo.gpsLat && photo.gpsLng
                              ? `${photo.gpsLat.toFixed(4)}, ${photo.gpsLng.toFixed(4)}`
                              : "Not available"}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Camera className="h-3 w-3" />
                            Camera
                          </span>
                          <p className="font-medium">
                            {photo.cameraMake || photo.cameraModel
                              ? `${photo.cameraMake || ""} ${photo.cameraModel || ""}`.trim()
                              : "Unknown"}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            Hash
                          </span>
                          <p className="font-mono text-xs truncate" title={photo.originalHash}>
                            {photo.originalHash ? `${photo.originalHash.slice(0, 16)}...` : "N/A"}
                          </p>
                        </div>
                      </div>

                      {/* Verification Result Details */}
                      {result && (
                        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm">
                          <h4 className="font-medium mb-2">Verification Details</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div>
                              <span className="text-muted-foreground">Hash Match</span>
                              <p className={result.hashMatch ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                                {result.hashMatch ? "Yes" : "No"}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Uploaded</span>
                              <p>{formatDate(result.chainOfCustody.uploadedAt)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Last Verified</span>
                              <p>{formatDate(result.chainOfCustody.lastVerifiedAt)}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Evidence Certificate */}
      <Card className="border-[var(--ranz-blue-200)] bg-[var(--ranz-blue-50)]/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Evidence Integrity Certificate
          </CardTitle>
          <CardDescription>
            Generate a certificate documenting the integrity status of all photos in this report.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <p>
                <strong>{verifiedCount}</strong> of <strong>{photos.length}</strong> photos verified
              </p>
              <p className="text-muted-foreground">
                All photos with valid hash verification will be included in the certificate.
              </p>
            </div>
            <Button variant="outline" disabled={verifiedCount === 0}>
              <Download className="h-4 w-4 mr-2" />
              Generate Certificate
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
