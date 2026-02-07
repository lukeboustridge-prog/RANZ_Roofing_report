"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const ComplianceContent = dynamic(() => import("./compliance-content"), {
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

export default function CompliancePage() {
  return <ComplianceContent />;
}
