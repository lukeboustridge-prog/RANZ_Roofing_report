"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Play, Loader2 } from "lucide-react";

interface ReviewActionsProps {
  reportId: string;
  currentStatus: string;
}

export function ReviewActions({ reportId, currentStatus }: ReviewActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approveComments, setApproveComments] = useState("");
  const [finalise, setFinalise] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleStartReview = async () => {
    if (currentStatus !== "PENDING_REVIEW") return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/reports/${reportId}/review`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to start review");
      }

      toast({
        title: "Review started",
        description: "The report is now marked as under review.",
      });

      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start review",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/reports/${reportId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comments: approveComments || undefined,
          finalise,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to approve report");
      }

      toast({
        title: finalise ? "Report approved and finalised" : "Report approved",
        description: "The inspector will be notified.",
      });

      setApproveDialogOpen(false);
      router.push("/admin/reviews");
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve report",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason || rejectReason.length < 10) {
      toast({
        title: "Reason required",
        description: "Please provide a detailed reason for requesting revisions.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/reports/${reportId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: rejectReason,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to reject report");
      }

      toast({
        title: "Revision requested",
        description: "The inspector will be notified of the required changes.",
      });

      setRejectDialogOpen(false);
      router.push("/admin/reviews");
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject report",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        {currentStatus === "PENDING_REVIEW" && (
          <Button variant="outline" onClick={handleStartReview} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Start Review
          </Button>
        )}

        <Button
          variant="outline"
          className="text-orange-600 border-orange-200 hover:bg-orange-50"
          onClick={() => setRejectDialogOpen(true)}
          disabled={isLoading}
        >
          <XCircle className="mr-2 h-4 w-4" />
          Request Revision
        </Button>

        <Button
          className="bg-green-600 hover:bg-green-700"
          onClick={() => setApproveDialogOpen(true)}
          disabled={isLoading}
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Approve
        </Button>
      </div>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Report</DialogTitle>
            <DialogDescription>
              Confirm that this report meets all quality standards and is ready for the client.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="comments">Comments (optional)</Label>
              <Textarea
                id="comments"
                placeholder="Add any comments for the inspector..."
                value={approveComments}
                onChange={(e) => setApproveComments(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="finalise"
                checked={finalise}
                onCheckedChange={(checked) => setFinalise(checked as boolean)}
              />
              <Label htmlFor="finalise" className="text-sm font-normal">
                Also finalise report (locks for editing and generates PDF)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              {finalise ? "Approve & Finalise" : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Revision</DialogTitle>
            <DialogDescription>
              Explain what changes are needed before this report can be approved.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for revision *</Label>
              <Textarea
                id="reason"
                placeholder="Please describe the issues that need to be addressed..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Minimum 10 characters required
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="bg-orange-600 hover:bg-orange-700"
              onClick={handleReject}
              disabled={isLoading || rejectReason.length < 10}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Request Revision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
