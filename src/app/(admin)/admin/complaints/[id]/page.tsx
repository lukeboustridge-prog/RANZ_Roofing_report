"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  FileText,
  MapPin,
  User,
  ArrowLeft,
  Save,
  Send,
  CheckCircle,
  XCircle,
  Download,
  Clock,
  AlertCircle,
  Loader2,
  PenLine,
} from "lucide-react";
import type { LBPComplaintStatus } from "@prisma/client";

const statusConfig: Record<LBPComplaintStatus, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-800" },
  PENDING_REVIEW: { label: "Pending Review", color: "bg-yellow-100 text-yellow-800" },
  READY_TO_SUBMIT: { label: "Ready to Submit", color: "bg-green-100 text-green-800" },
  SUBMITTED: { label: "Submitted", color: "bg-blue-100 text-blue-800" },
  ACKNOWLEDGED: { label: "Acknowledged", color: "bg-blue-100 text-blue-800" },
  UNDER_INVESTIGATION: { label: "Under Investigation", color: "bg-purple-100 text-purple-800" },
  HEARING_SCHEDULED: { label: "Hearing Scheduled", color: "bg-purple-100 text-purple-800" },
  DECIDED: { label: "Decided", color: "bg-green-100 text-green-800" },
  CLOSED: { label: "Closed", color: "bg-gray-100 text-gray-800" },
  WITHDRAWN: { label: "Withdrawn", color: "bg-red-100 text-red-800" },
};

interface Complaint {
  id: string;
  complaintNumber: string;
  status: LBPComplaintStatus;
  subjectLbpNumber: string;
  subjectLbpName: string;
  subjectLbpEmail: string | null;
  subjectLbpPhone: string | null;
  subjectLbpCompany: string | null;
  subjectLbpAddress: string | null;
  subjectLbpLicenseTypes: string[];
  subjectSightedLicense: boolean;
  subjectWorkType: string | null;
  workAddress: string;
  workSuburb: string | null;
  workCity: string | null;
  workStartDate: string | null;
  workEndDate: string | null;
  workDescription: string;
  buildingConsentNumber: string | null;
  buildingConsentDate: string | null;
  groundsForDiscipline: string[];
  conductDescription: string;
  evidenceSummary: string;
  stepsToResolve: string | null;
  attachedPhotoIds: string[];
  attachedDefectIds: string[];
  witnesses: unknown[] | null;
  signedAt: string | null;
  signatureData: string | null;
  submittedAt: string | null;
  bpbReferenceNumber: string | null;
  bpbAcknowledgedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
  report: {
    id: string;
    reportNumber: string;
    propertyAddress: string;
    propertyCity: string;
    photos: { id: string; url: string; caption: string | null }[];
    defects: { id: string; title: string; description: string }[];
    inspector: { id: string; name: string };
  };
}

export default function ComplaintDetailPage() {
  const params = useParams();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [reviewApproved, setReviewApproved] = useState(true);
  const [reviewNotes, setReviewNotes] = useState("");
  const [userRole, setUserRole] = useState<string>("");

  // Editable fields
  const [formData, setFormData] = useState({
    subjectLbpNumber: "",
    subjectLbpName: "",
    subjectLbpEmail: "",
    subjectLbpPhone: "",
    subjectLbpCompany: "",
    subjectLbpAddress: "",
    workAddress: "",
    workDescription: "",
    conductDescription: "",
    evidenceSummary: "",
    stepsToResolve: "",
  });

  useEffect(() => {
    fetchComplaint();
    fetchUserRole();
  }, [params.id]);

  const fetchUserRole = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUserRole(data.user?.role || "");
      }
    } catch {
      // Ignore
    }
  };

  const fetchComplaint = async () => {
    try {
      const res = await fetch(`/api/admin/complaints/${params.id}`);
      if (!res.ok) throw new Error("Failed to fetch complaint");
      const data = await res.json();
      setComplaint(data.complaint);
      setFormData({
        subjectLbpNumber: data.complaint.subjectLbpNumber || "",
        subjectLbpName: data.complaint.subjectLbpName || "",
        subjectLbpEmail: data.complaint.subjectLbpEmail || "",
        subjectLbpPhone: data.complaint.subjectLbpPhone || "",
        subjectLbpCompany: data.complaint.subjectLbpCompany || "",
        subjectLbpAddress: data.complaint.subjectLbpAddress || "",
        workAddress: data.complaint.workAddress || "",
        workDescription: data.complaint.workDescription || "",
        conductDescription: data.complaint.conductDescription || "",
        evidenceSummary: data.complaint.evidenceSummary || "",
        stepsToResolve: data.complaint.stepsToResolve || "",
      });
    } catch {
      toast({ title: "Error", description: "Failed to load complaint", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/complaints/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast({ title: "Success", description: "Complaint saved", variant: "success" });
      fetchComplaint();
    } catch {
      toast({ title: "Error", description: "Failed to save complaint", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    try {
      const res = await fetch(`/api/admin/complaints/${params.id}/submit-for-review`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to submit");
      toast({ title: "Success", description: "Submitted for review", variant: "success" });
      fetchComplaint();
    } catch {
      toast({ title: "Error", description: "Failed to submit for review", variant: "destructive" });
    }
  };

  const handleSign = async () => {
    if (!declarationAccepted) {
      toast({ title: "Error", description: "You must accept the declaration", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(`/api/admin/complaints/${params.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatureData: "digital-signature-placeholder",
          declarationAccepted: true,
        }),
      });
      if (!res.ok) throw new Error("Failed to sign");
      toast({ title: "Success", description: "Complaint signed", variant: "success" });
      setShowSignDialog(false);
      fetchComplaint();
    } catch {
      toast({ title: "Error", description: "Failed to sign complaint", variant: "destructive" });
    }
  };

  const handleReview = async () => {
    try {
      const res = await fetch(`/api/admin/complaints/${params.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approved: reviewApproved,
          reviewNotes: reviewNotes,
        }),
      });
      if (!res.ok) throw new Error("Failed to review");
      toast({
        title: "Success",
        description: reviewApproved ? "Complaint approved" : "Complaint returned for revision",
        variant: "success",
      });
      setShowReviewDialog(false);
      fetchComplaint();
    } catch {
      toast({ title: "Error", description: "Failed to review complaint", variant: "destructive" });
    }
  };

  const handleSubmitToBPB = async () => {
    try {
      const res = await fetch(`/api/admin/complaints/${params.id}/submit`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to submit");
      toast({ title: "Success", description: "Complaint submitted to Building Practitioners Board", variant: "success" });
      setShowSubmitDialog(false);
      fetchComplaint();
    } catch {
      toast({ title: "Error", description: "Failed to submit to BPB", variant: "destructive" });
    }
  };

  const handleDownloadPdf = async () => {
    window.open(`/api/admin/complaints/${params.id}/pdf`, "_blank");
  };

  const handleDownloadEvidence = async () => {
    try {
      const res = await fetch(`/api/admin/complaints/${params.id}/evidence`);
      if (!res.ok) throw new Error("Failed to get evidence");
      const data = await res.json();
      window.open(data.downloadUrl, "_blank");
    } catch {
      toast({ title: "Error", description: "Failed to download evidence package", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Complaint not found</h3>
        <Button asChild className="mt-4">
          <Link href="/admin/complaints">Back to Complaints</Link>
        </Button>
      </div>
    );
  }

  const canEdit = ["DRAFT", "PENDING_REVIEW"].includes(complaint.status);
  const canSubmitForReview = complaint.status === "DRAFT" && complaint.signedAt;
  const canSign = complaint.status === "DRAFT" && !complaint.signedAt;
  const canReview = complaint.status === "PENDING_REVIEW" && userRole === "SUPER_ADMIN";
  const canSubmitToBPB = complaint.status === "READY_TO_SUBMIT" && userRole === "SUPER_ADMIN";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/complaints">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{complaint.complaintNumber}</h1>
            <p className="text-muted-foreground">
              LBP Complaint - {complaint.subjectLbpName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusConfig[complaint.status]?.color}>
            {statusConfig[complaint.status]?.label || complaint.status}
          </Badge>
        </div>
      </div>

      {/* Action buttons */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            )}
            {canSign && (
              <Button variant="outline" onClick={() => setShowSignDialog(true)}>
                <PenLine className="mr-2 h-4 w-4" />
                Sign Complaint
              </Button>
            )}
            {canSubmitForReview && (
              <Button variant="outline" onClick={handleSubmitForReview}>
                <Send className="mr-2 h-4 w-4" />
                Submit for Review
              </Button>
            )}
            {canReview && (
              <Button variant="outline" onClick={() => setShowReviewDialog(true)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Review Complaint
              </Button>
            )}
            {canSubmitToBPB && (
              <Button onClick={() => setShowSubmitDialog(true)}>
                <Send className="mr-2 h-4 w-4" />
                Submit to BPB
              </Button>
            )}
            <Button variant="outline" onClick={handleDownloadPdf}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            <Button variant="outline" onClick={handleDownloadEvidence}>
              <Download className="mr-2 h-4 w-4" />
              Evidence Package
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Complaint Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Badge className={`${statusConfig[complaint.status]?.color} px-4 py-2`}>
              {statusConfig[complaint.status]?.label || complaint.status}
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Created</Label>
              <p className="mt-1 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {new Date(complaint.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Last Updated</Label>
              <p className="mt-1 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {new Date(complaint.updatedAt).toLocaleDateString()}
              </p>
            </div>
            {complaint.signedAt && (
              <div>
                <Label className="text-muted-foreground">Signed</Label>
                <p className="mt-1 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  {new Date(complaint.signedAt).toLocaleDateString()}
                </p>
              </div>
            )}
            {complaint.submittedAt && (
              <div>
                <Label className="text-muted-foreground">Submitted</Label>
                <p className="mt-1 flex items-center gap-2">
                  <Send className="h-4 w-4 text-blue-600" />
                  {new Date(complaint.submittedAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
          {complaint.bpbReferenceNumber && (
            <>
              <Separator />
              <div>
                <Label className="text-muted-foreground">BPB Reference Number</Label>
                <p className="mt-1 font-mono">{complaint.bpbReferenceNumber}</p>
              </div>
            </>
          )}
          {complaint.reviewNotes && (
            <>
              <Separator />
              <div>
                <Label className="text-muted-foreground">Review Notes</Label>
                <p className="mt-1 p-3 bg-muted rounded-lg">{complaint.reviewNotes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Subject LBP */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Subject LBP Information
          </CardTitle>
          <CardDescription>Details of the practitioner being complained about</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>LBP Number</Label>
              {canEdit ? (
                <Input
                  value={formData.subjectLbpNumber}
                  onChange={(e) => setFormData({ ...formData, subjectLbpNumber: e.target.value })}
                />
              ) : (
                <p className="mt-1 font-medium">{complaint.subjectLbpNumber}</p>
              )}
            </div>
            <div>
              <Label>Name</Label>
              {canEdit ? (
                <Input
                  value={formData.subjectLbpName}
                  onChange={(e) => setFormData({ ...formData, subjectLbpName: e.target.value })}
                />
              ) : (
                <p className="mt-1 font-medium">{complaint.subjectLbpName}</p>
              )}
            </div>
            <div>
              <Label>Email</Label>
              {canEdit ? (
                <Input
                  type="email"
                  value={formData.subjectLbpEmail}
                  onChange={(e) => setFormData({ ...formData, subjectLbpEmail: e.target.value })}
                />
              ) : (
                <p className="mt-1">{complaint.subjectLbpEmail || "Not provided"}</p>
              )}
            </div>
            <div>
              <Label>Phone</Label>
              {canEdit ? (
                <Input
                  value={formData.subjectLbpPhone}
                  onChange={(e) => setFormData({ ...formData, subjectLbpPhone: e.target.value })}
                />
              ) : (
                <p className="mt-1">{complaint.subjectLbpPhone || "Not provided"}</p>
              )}
            </div>
            <div>
              <Label>Company</Label>
              {canEdit ? (
                <Input
                  value={formData.subjectLbpCompany}
                  onChange={(e) => setFormData({ ...formData, subjectLbpCompany: e.target.value })}
                />
              ) : (
                <p className="mt-1">{complaint.subjectLbpCompany || "Not provided"}</p>
              )}
            </div>
            <div>
              <Label>Address</Label>
              {canEdit ? (
                <Input
                  value={formData.subjectLbpAddress}
                  onChange={(e) => setFormData({ ...formData, subjectLbpAddress: e.target.value })}
                />
              ) : (
                <p className="mt-1">{complaint.subjectLbpAddress || "Not provided"}</p>
              )}
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>License Types</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {complaint.subjectLbpLicenseTypes.map((type) => (
                  <Badge key={type} variant="secondary">{type}</Badge>
                ))}
              </div>
            </div>
            <div>
              <Label>License Sighted</Label>
              <p className="mt-1">{complaint.subjectSightedLicense ? "Yes" : "No"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Work Details
          </CardTitle>
          <CardDescription>Details of the building work</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Work Address</Label>
            {canEdit ? (
              <Input
                value={formData.workAddress}
                onChange={(e) => setFormData({ ...formData, workAddress: e.target.value })}
              />
            ) : (
              <p className="mt-1">
                {complaint.workAddress}
                {complaint.workCity && `, ${complaint.workCity}`}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Work Start Date</Label>
              <p className="mt-1">
                {complaint.workStartDate
                  ? new Date(complaint.workStartDate).toLocaleDateString()
                  : "Not specified"}
              </p>
            </div>
            <div>
              <Label>Work End Date</Label>
              <p className="mt-1">
                {complaint.workEndDate
                  ? new Date(complaint.workEndDate).toLocaleDateString()
                  : "Not specified"}
              </p>
            </div>
          </div>
          <div>
            <Label>Work Description</Label>
            {canEdit ? (
              <Textarea
                value={formData.workDescription}
                onChange={(e) => setFormData({ ...formData, workDescription: e.target.value })}
                rows={4}
              />
            ) : (
              <p className="mt-1 whitespace-pre-wrap">{complaint.workDescription}</p>
            )}
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Building Consent Number</Label>
              <p className="mt-1">{complaint.buildingConsentNumber || "Not provided"}</p>
            </div>
            <div>
              <Label>Building Consent Date</Label>
              <p className="mt-1">
                {complaint.buildingConsentDate
                  ? new Date(complaint.buildingConsentDate).toLocaleDateString()
                  : "Not provided"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Complaint Details */}
      <Card>
        <CardHeader>
          <CardTitle>Grounds for Discipline</CardTitle>
          <CardDescription>Reasons for the complaint</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {complaint.groundsForDiscipline.map((ground) => (
              <Badge key={ground} variant="outline">
                {ground}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Description of Conduct</CardTitle>
        </CardHeader>
        <CardContent>
          {canEdit ? (
            <Textarea
              value={formData.conductDescription}
              onChange={(e) => setFormData({ ...formData, conductDescription: e.target.value })}
              rows={6}
              placeholder="Describe the conduct or acts complained of..."
            />
          ) : (
            <p className="whitespace-pre-wrap">{complaint.conductDescription}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Evidence Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {canEdit ? (
            <Textarea
              value={formData.evidenceSummary}
              onChange={(e) => setFormData({ ...formData, evidenceSummary: e.target.value })}
              rows={4}
              placeholder="Summary of evidence supporting the complaint..."
            />
          ) : (
            <p className="whitespace-pre-wrap">{complaint.evidenceSummary}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Steps Taken to Resolve</CardTitle>
        </CardHeader>
        <CardContent>
          {canEdit ? (
            <Textarea
              value={formData.stepsToResolve}
              onChange={(e) => setFormData({ ...formData, stepsToResolve: e.target.value })}
              rows={3}
              placeholder="What steps have been taken to resolve the issue..."
            />
          ) : (
            <p className="whitespace-pre-wrap">{complaint.stepsToResolve || "None specified"}</p>
          )}
        </CardContent>
      </Card>

      {/* Evidence */}
      <Card>
        <CardHeader>
          <CardTitle>Evidence</CardTitle>
          <CardDescription>
            {complaint.attachedPhotoIds.length} photos and {complaint.attachedDefectIds.length} defects attached
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {complaint.attachedPhotoIds.length > 0 && (
            <div>
              <Label>Attached Photos</Label>
              <div className="grid grid-cols-4 gap-4 mt-2">
                {complaint.report.photos
                  .filter((p) => complaint.attachedPhotoIds.includes(p.id))
                  .slice(0, 8)
                  .map((photo) => (
                    <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-muted">
                      <img
                        src={photo.url}
                        alt={photo.caption || "Evidence photo"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
              </div>
              {complaint.attachedPhotoIds.length > 8 && (
                <p className="text-sm text-muted-foreground mt-2">
                  +{complaint.attachedPhotoIds.length - 8} more photos
                </p>
              )}
            </div>
          )}
          {complaint.attachedDefectIds.length > 0 && (
            <div>
              <Label>Referenced Defects</Label>
              <div className="space-y-2 mt-2">
                {complaint.report.defects
                  .filter((d) => complaint.attachedDefectIds.includes(d.id))
                  .map((defect) => (
                    <div key={defect.id} className="p-3 border rounded-lg">
                      <p className="font-medium">{defect.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {defect.description}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Related Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Related Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div>
              <p className="font-medium">{complaint.report.reportNumber}</p>
              <p className="text-sm text-muted-foreground">
                {complaint.report.propertyAddress}, {complaint.report.propertyCity}
              </p>
            </div>
            <Button variant="outline" asChild className="ml-auto">
              <Link href={`/reports/${complaint.report.id}`}>View Report</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sign Dialog */}
      <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Complaint</DialogTitle>
            <DialogDescription>
              By signing, you confirm that the information in this complaint is accurate to the best of your knowledge.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="declaration"
                checked={declarationAccepted}
                onChange={(e) => setDeclarationAccepted(e.target.checked)}
                className="mt-1"
              />
              <label htmlFor="declaration" className="text-sm">
                I declare that the information provided in this complaint is true and correct to the best of my knowledge and belief. I understand that making a false declaration is an offence.
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSign} disabled={!declarationAccepted}>
              <PenLine className="mr-2 h-4 w-4" />
              Sign Complaint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Complaint</DialogTitle>
            <DialogDescription>
              Approve or reject this complaint for submission to the Building Practitioners Board.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Button
                variant={reviewApproved ? "default" : "outline"}
                onClick={() => setReviewApproved(true)}
                className="flex-1"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button
                variant={!reviewApproved ? "destructive" : "outline"}
                onClick={() => setReviewApproved(false)}
                className="flex-1"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Return for Revision
              </Button>
            </div>
            <div>
              <Label>Review Notes</Label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={reviewApproved ? "Optional notes..." : "Please explain what needs to be revised..."}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleReview}>
              {reviewApproved ? "Approve" : "Return for Revision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit to BPB Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit to Building Practitioners Board</DialogTitle>
            <DialogDescription>
              This will send the complaint and all evidence to the BPB via email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <AlertCircle className="inline h-4 w-4 mr-2" />
                This action cannot be undone. The complaint will be officially submitted to the Building Practitioners Board.
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                A PDF of the complaint and evidence package will be attached to the submission email.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitToBPB}>
              <Send className="mr-2 h-4 w-4" />
              Submit to BPB
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
