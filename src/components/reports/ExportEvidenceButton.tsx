"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Package, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface ExportEvidenceButtonProps {
  reportId: string;
}

export function ExportEvidenceButton({ reportId }: ExportEvidenceButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleExport = async () => {
    setIsLoading(true);
    setStatus("idle");
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/reports/${reportId}/export`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate evidence package");
      }

      const data = await response.json();

      // Open the download URL in a new tab
      window.open(data.url, "_blank");

      setStatus("success");

      // Reset success status after 3 seconds
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to generate evidence package"
      );

      // Reset error status after 5 seconds
      setTimeout(() => {
        setStatus("idle");
        setErrorMessage(null);
      }, 5000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={handleExport}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Exporting...
          </>
        ) : status === "success" ? (
          <>
            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
            Exported
          </>
        ) : status === "error" ? (
          <>
            <AlertCircle className="mr-2 h-4 w-4 text-destructive" />
            Export Failed
          </>
        ) : (
          <>
            <Package className="mr-2 h-4 w-4" />
            Export Evidence Package
          </>
        )}
      </Button>
      {errorMessage && status === "error" && (
        <div className="absolute top-full mt-1 right-0 z-10 w-64 rounded-md border bg-destructive/10 p-2 text-xs text-destructive shadow-sm">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
