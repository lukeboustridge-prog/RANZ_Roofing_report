"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import {
  Search,
  X,
  Filter,
  SortAsc,
  SortDesc,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Download,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ReportStatus, InspectionType, PropertyType } from "@prisma/client";

// Status display config
const statusBadgeVariants: Record<
  ReportStatus,
  "draft" | "inProgress" | "pendingReview" | "approved" | "finalised"
> = {
  DRAFT: "draft",
  IN_PROGRESS: "inProgress",
  PENDING_REVIEW: "pendingReview",
  UNDER_REVIEW: "pendingReview",
  REVISION_REQUIRED: "draft",
  APPROVED: "approved",
  FINALISED: "finalised",
  ARCHIVED: "finalised",
};

const statusLabels: Record<ReportStatus, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In Progress",
  PENDING_REVIEW: "Pending Review",
  UNDER_REVIEW: "Under Review",
  REVISION_REQUIRED: "Revision Required",
  APPROVED: "Approved",
  FINALISED: "Finalised",
  ARCHIVED: "Archived",
};

const inspectionTypeLabels: Record<InspectionType, string> = {
  FULL_INSPECTION: "Full Inspection",
  VISUAL_ONLY: "Visual Only",
  NON_INVASIVE: "Non-Invasive",
  INVASIVE: "Invasive",
  DISPUTE_RESOLUTION: "Dispute Resolution",
  PRE_PURCHASE: "Pre-Purchase",
  MAINTENANCE_REVIEW: "Maintenance Review",
  WARRANTY_CLAIM: "Warranty Claim",
};

const propertyTypeLabels: Record<PropertyType, string> = {
  RESIDENTIAL_1: "Residential (Single)",
  RESIDENTIAL_2: "Residential (2-3 Storey)",
  RESIDENTIAL_3: "Residential (4+ Storey)",
  COMMERCIAL_LOW: "Commercial (1-2 Storey)",
  COMMERCIAL_HIGH: "Commercial (3+ Storey)",
  INDUSTRIAL: "Industrial",
};

interface Report {
  id: string;
  reportNumber: string;
  propertyAddress: string;
  propertyCity: string;
  propertyRegion: string;
  status: ReportStatus;
  inspectionDate: string;
  inspectionType: InspectionType;
  clientName: string;
  updatedAt: string;
  inspector?: {
    name: string;
  };
  _count: {
    defects: number;
    photos: number;
    roofElements: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface SearchFilters {
  search: string;
  status: string;
  inspectionType: string;
  propertyType: string;
  dateFrom: string;
  dateTo: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

const defaultFilters: SearchFilters = {
  search: "",
  status: "",
  inspectionType: "",
  propertyType: "",
  dateFrom: "",
  dateTo: "",
  sortBy: "createdAt",
  sortOrder: "desc",
};

export function ReportSearch() {
  const [reports, setReports] = useState<Report[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch reports from API
  const fetchReports = useCallback(
    async (page: number = 1) => {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "20");

      if (filters.search) params.set("search", filters.search);
      if (filters.status) params.set("status", filters.status);
      if (filters.inspectionType) params.set("inspectionType", filters.inspectionType);
      if (filters.propertyType) params.set("propertyType", filters.propertyType);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      params.set("sortBy", filters.sortBy);
      params.set("sortOrder", filters.sortOrder);

      try {
        const response = await fetch(`/api/reports?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to fetch reports");
        }
        const data = await response.json();
        setReports(data.reports);
        setPagination(data.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch reports");
      } finally {
        setIsLoading(false);
      }
    },
    [filters]
  );

  // Initial load and filter changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      startTransition(() => {
        fetchReports(1);
      });
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [fetchReports]);

  // Handle filter changes
  const updateFilter = (key: keyof SearchFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  // Check if any filters are active
  const hasActiveFilters =
    filters.search ||
    filters.status ||
    filters.inspectionType ||
    filters.propertyType ||
    filters.dateFrom ||
    filters.dateTo;

  // Toggle sort order
  const toggleSortOrder = () => {
    setFilters((prev) => ({
      ...prev,
      sortOrder: prev.sortOrder === "asc" ? "desc" : "asc",
    }));
  };

  // Page navigation
  const goToPage = (page: number) => {
    startTransition(() => {
      fetchReports(page);
    });
  };

  // Export reports
  const handleExport = async (type: "reports" | "defects") => {
    setIsExporting(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("type", type);

    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (filters.inspectionType) params.set("inspectionType", filters.inspectionType);
    if (filters.propertyType) params.set("propertyType", filters.propertyType);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);

    try {
      const response = await fetch(`/api/reports/export?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to export");
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `ranz-${type}-export.csv`;

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reports, addresses, clients..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-9"
          />
          {filters.search && (
            <button
              onClick={() => updateFilter("search", "")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                Active
              </Badge>
            )}
          </Button>

          <Select value={filters.sortBy} onValueChange={(v) => updateFilter("sortBy", v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Created</SelectItem>
              <SelectItem value="updatedAt">Updated</SelectItem>
              <SelectItem value="inspectionDate">Inspection</SelectItem>
              <SelectItem value="reportNumber">Report #</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={toggleSortOrder}>
            {filters.sortOrder === "asc" ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("reports")}>
                Export Reports (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("defects")}>
                Export Defects (CSV)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={filters.status} onValueChange={(v) => updateFilter("status", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Inspection Type</label>
                <Select
                  value={filters.inspectionType}
                  onValueChange={(v) => updateFilter("inspectionType", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All types</SelectItem>
                    {Object.entries(inspectionTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Property Type</label>
                <Select
                  value={filters.propertyType}
                  onValueChange={(v) => updateFilter("propertyType", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All properties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All properties</SelectItem>
                    {Object.entries(propertyTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => updateFilter("dateFrom", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => updateFilter("dateTo", e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-4 flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Clear all filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      {pagination && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {reports.length} of {pagination.totalCount} reports
          </span>
          {isPending && (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating...
            </span>
          )}
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="py-6 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && !reports.length && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">Loading reports...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && reports.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">
                {hasActiveFilters ? "No matching reports" : "No reports yet"}
              </h3>
              <p className="mt-2 text-muted-foreground">
                {hasActiveFilters
                  ? "Try adjusting your filters or search terms."
                  : "Get started by creating your first inspection report."}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports List */}
      {reports.length > 0 && (
        <div className="grid gap-4">
          {reports.map((report) => (
            <Link key={report.id} href={`/reports/${report.id}`}>
              <Card className="cursor-pointer transition-colors hover:bg-secondary/50">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">{report.reportNumber}</span>
                        <Badge variant={statusBadgeVariants[report.status]}>
                          {statusLabels[report.status]}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">
                        {report.propertyAddress}, {report.propertyCity}, {report.propertyRegion}
                      </p>
                      <p className="text-sm text-muted-foreground">Client: {report.clientName}</p>
                      {report.inspector && (
                        <p className="text-sm text-muted-foreground">
                          Inspector: {report.inspector.name}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Inspected: {formatDate(new Date(report.inspectionDate))}</p>
                      <p className="mt-1">
                        {report._count.defects} defects &bull; {report._count.photos} photos
                      </p>
                      <p className="mt-1 text-xs">
                        {inspectionTypeLabels[report.inspectionType]}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(pagination.page - 1)}
            disabled={!pagination.hasPrevPage || isPending}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              let pageNum: number;
              if (pagination.totalPages <= 5) {
                pageNum = i + 1;
              } else if (pagination.page <= 3) {
                pageNum = i + 1;
              } else if (pagination.page >= pagination.totalPages - 2) {
                pageNum = pagination.totalPages - 4 + i;
              } else {
                pageNum = pagination.page - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={pagination.page === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => goToPage(pageNum)}
                  disabled={isPending}
                  className="w-9"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(pagination.page + 1)}
            disabled={!pagination.hasNextPage || isPending}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
