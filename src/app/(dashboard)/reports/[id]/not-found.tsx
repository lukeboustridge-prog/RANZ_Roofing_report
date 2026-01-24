import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileX, FileText, ArrowLeft } from "lucide-react";

export default function ReportNotFound() {
  return (
    <div className="flex items-center justify-center py-12">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <FileX className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          </div>
          <CardTitle className="text-xl">Report Not Found</CardTitle>
          <CardDescription>
            This report doesn&apos;t exist or you don&apos;t have permission to view it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="flex-1">
              <Link href="/reports">
                <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                View All Reports
              </Link>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
