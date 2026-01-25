"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { ShareReportDialog } from "./ShareReportDialog";

interface ShareReportButtonProps {
  reportId: string;
  reportNumber: string;
  disabled?: boolean;
}

export function ShareReportButton({
  reportId,
  reportNumber,
  disabled,
}: ShareReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
      >
        <Share2 className="mr-2 h-4 w-4" />
        Share
      </Button>

      <ShareReportDialog
        reportId={reportId}
        reportNumber={reportNumber}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
