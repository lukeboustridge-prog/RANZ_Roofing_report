"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Download,
  Loader2,
  FileText,
  AlertCircle,
  Eye,
  ExternalLink,
  X,
  Maximize2,
} from "lucide-react";

export default function PdfContent() {
  const params = useParams();
  const reportId = params.id as string;

  const [generating, setGenerating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState("");

  const generatePdfBlob = useCallback(async () => {
    const response = await fetch(`/api/reports/${reportId}/pdf`);

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to generate PDF");
    }

    return await response.blob();
  }, [reportId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");

    try {
      const blob = await generatePdfBlob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate PDF");
    } finally {
      setGenerating(false);
    }
  };

  const handlePreview = async () => {
    setPreviewing(true);
    setError("");

    try {
      const blob = await generatePdfBlob();

      // Clean up old preview URL if exists
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
      }

      // Create blob URL for preview
      const url = window.URL.createObjectURL(blob);
      setPreviewUrl(url);
      setShowPreview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate preview");
    } finally {
      setPreviewing(false);
    }
  };

  const handlePreviewNewTab = async () => {
    setPreviewing(true);
    setError("");

    try {
      const blob = await generatePdfBlob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate preview");
    } finally {
      setPreviewing(false);
    }
  };

  const closePreview = () => {
    setShowPreview(false);
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href={`/reports/${reportId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Report
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Generate PDF</h1>
        <p className="text-muted-foreground">
          Generate a professional PDF report for download or printing.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Generation options */}
        <Card>
          <CardHeader>
            <CardTitle>PDF Generation</CardTitle>
            <CardDescription>
              Generate a complete inspection report in PDF format.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Report includes:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Cover page with RANZ branding</li>
                <li>• Executive summary</li>
                <li>• Property and inspection details</li>
                <li>• Roof elements assessment</li>
                <li>• Defects register with photos</li>
                <li>• Conclusions and recommendations</li>
                <li>• Photo appendix</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleGenerate}
                disabled={generating || previewing}
                className="w-full"
                size="lg"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-5 w-5" />
                    Generate & Download PDF
                  </>
                )}
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handlePreview}
                  disabled={generating || previewing}
                  className="flex-1"
                >
                  {previewing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handlePreviewNewTab}
                  disabled={generating || previewing}
                  className="flex-1"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in New Tab
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              PDF Format
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The generated PDF follows the RANZ standard report format and is
              designed to be:
            </p>
            <ul className="text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Court-ready and legally defensible</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>ISO 17020 compliant structure</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Professional RANZ branding</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>High-quality photo reproduction</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Evidence integrity verification</span>
              </li>
            </ul>

            <div className="p-3 bg-[var(--ranz-blue-50)] rounded-lg text-sm">
              <p className="font-medium text-[var(--ranz-blue-700)]">
                Tip: Ensure all defects have photos and descriptions before
                generating the final PDF.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inline PDF Preview */}
      {showPreview && previewUrl && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                PDF Preview
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(previewUrl, "_blank")}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closePreview}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription>
              Preview of the generated PDF report
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden bg-gray-100">
              <iframe
                src={previewUrl}
                className="w-full h-[600px]"
                title="PDF Preview"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={closePreview}>
                Close Preview
              </Button>
              <Button onClick={handleGenerate} disabled={generating}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
