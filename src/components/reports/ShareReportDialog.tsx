"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Share2,
  Copy,
  Check,
  Trash2,
  Loader2,
  Link as LinkIcon,
  Mail,
  Lock,
  Clock,
  Eye,
  Download,
  X,
} from "lucide-react";

interface Share {
  id: string;
  token: string;
  shareUrl: string;
  recipientEmail: string | null;
  recipientName: string | null;
  accessLevel: string;
  expiresAt: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  downloadCount: number;
  isActive: boolean;
  createdAt: string;
}

interface ShareReportDialogProps {
  reportId: string;
  reportNumber: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareReportDialog({
  reportId,
  reportNumber,
  isOpen,
  onClose,
}: ShareReportDialogProps) {
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [accessLevel, setAccessLevel] = useState("VIEW_ONLY");
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchShares();
    }
  }, [isOpen, reportId]);

  const fetchShares = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reports/${reportId}/shares`);
      if (!response.ok) throw new Error("Failed to fetch shares");
      const data = await response.json();
      setShares(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");

    try {
      const response = await fetch(`/api/reports/${reportId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: recipientEmail || undefined,
          recipientName: recipientName || undefined,
          accessLevel,
          expiresInDays: expiresInDays ? parseInt(expiresInDays) : undefined,
          password: password || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create share link");
      }

      await fetchShares();
      setShowCreateForm(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (shareId: string) => {
    if (!confirm("Are you sure you want to revoke this share link?")) return;

    try {
      const response = await fetch(
        `/api/reports/${reportId}/shares/${shareId}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to revoke share");
      await fetchShares();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const copyToClipboard = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const resetForm = () => {
    setRecipientEmail("");
    setRecipientName("");
    setAccessLevel("VIEW_ONLY");
    setExpiresInDays("30");
    setPassword("");
  };

  if (!isOpen) return null;

  const activeShares = shares.filter((s) => s.isActive);
  const revokedShares = shares.filter((s) => !s.isActive);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-[var(--ranz-blue-500)]" />
            <h2 className="text-lg font-semibold">Share Report</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Share <strong>{reportNumber}</strong> with clients via secure links.
          </p>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Create new share */}
          {!showCreateForm ? (
            <Button onClick={() => setShowCreateForm(true)} className="w-full">
              <LinkIcon className="mr-2 h-4 w-4" />
              Create Share Link
            </Button>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4 border rounded-lg p-4">
              <h3 className="font-medium">New Share Link</h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="recipientName">Recipient Name</Label>
                  <Input
                    id="recipientName"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <Label htmlFor="recipientEmail">Recipient Email</Label>
                  <Input
                    id="recipientEmail"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="accessLevel">Access Level</Label>
                  <NativeSelect
                    id="accessLevel"
                    value={accessLevel}
                    onChange={(e) => setAccessLevel(e.target.value)}
                  >
                    <option value="VIEW_ONLY">View Only</option>
                    <option value="VIEW_DOWNLOAD">View + Download PDF</option>
                  </NativeSelect>
                </div>
                <div>
                  <Label htmlFor="expiresInDays">Expires In</Label>
                  <NativeSelect
                    id="expiresInDays"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value)}
                  >
                    <option value="">Never</option>
                    <option value="7">7 days</option>
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="365">1 year</option>
                  </NativeSelect>
                </div>
              </div>

              <div>
                <Label htmlFor="password">Password (Optional)</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank for no password"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Link
                </Button>
              </div>
            </form>
          )}

          {/* Active shares */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activeShares.length > 0 ? (
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground">
                Active Share Links ({activeShares.length})
              </h3>
              {activeShares.map((share) => (
                <ShareCard
                  key={share.id}
                  share={share}
                  onCopy={() => copyToClipboard(share.shareUrl, share.id)}
                  onRevoke={() => handleRevoke(share.id)}
                  copied={copiedId === share.id}
                />
              ))}
            </div>
          ) : !showCreateForm ? (
            <div className="text-center py-8 text-muted-foreground">
              <LinkIcon className="mx-auto h-8 w-8 mb-2" />
              <p>No active share links</p>
              <p className="text-sm">Create one to share this report with clients</p>
            </div>
          ) : null}

          {/* Revoked shares */}
          {revokedShares.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground">
                Revoked ({revokedShares.length})
              </h3>
              {revokedShares.map((share) => (
                <div
                  key={share.id}
                  className="p-3 border rounded-lg bg-muted/30 opacity-60"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      {share.recipientName || share.recipientEmail || "Anonymous"}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Revoked
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ShareCardProps {
  share: Share;
  onCopy: () => void;
  onRevoke: () => void;
  copied: boolean;
}

function ShareCard({ share, onCopy, onRevoke, copied }: ShareCardProps) {
  const isExpired = share.expiresAt ? new Date(share.expiresAt) < new Date() : false;

  return (
    <div className="p-3 border rounded-lg space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {share.recipientName || share.recipientEmail ? (
              <span className="font-medium truncate">
                {share.recipientName || share.recipientEmail}
              </span>
            ) : (
              <span className="text-muted-foreground">Anonymous</span>
            )}
            {share.accessLevel === "VIEW_DOWNLOAD" ? (
              <Badge variant="outline" className="text-xs shrink-0">
                <Download className="mr-1 h-3 w-3" />
                View + Download
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs shrink-0">
                <Eye className="mr-1 h-3 w-3" />
                View Only
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            {share.expiresAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {isExpired
                  ? "Expired"
                  : `Expires ${new Date(share.expiresAt).toLocaleDateString()}`}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {share.viewCount} views
            </span>
          </div>
        </div>

        <div className="flex gap-1 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onCopy}
            disabled={isExpired}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRevoke}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Input
          readOnly
          value={share.shareUrl}
          className="text-xs bg-muted h-8"
        />
      </div>
    </div>
  );
}
