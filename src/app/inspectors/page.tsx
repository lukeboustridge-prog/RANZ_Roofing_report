"use client";

/**
 * Inspector Directory Page
 * Public page for searching and finding RANZ inspectors
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  MapPin,
  Award,
  Briefcase,
  FileText,
  CheckCircle2,
  Loader2,
  Users,
  Filter,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Inspector {
  id: string;
  name: string;
  company: string | null;
  lbpNumber: string | null;
  yearsExperience: number | null;
  specialisations: string[];
  serviceAreas: string[];
  availabilityStatus: string;
  publicBio: string | null;
  completedReports: number;
  memberSince: string;
}

interface InspectorsResponse {
  inspectors: Inspector[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

const NZ_REGIONS = [
  { value: "northland", label: "Northland" },
  { value: "auckland", label: "Auckland" },
  { value: "waikato", label: "Waikato" },
  { value: "bay-of-plenty", label: "Bay of Plenty" },
  { value: "gisborne", label: "Gisborne" },
  { value: "hawkes-bay", label: "Hawke's Bay" },
  { value: "taranaki", label: "Taranaki" },
  { value: "manawatu-whanganui", label: "Manawatu-Whanganui" },
  { value: "wellington", label: "Wellington" },
  { value: "tasman", label: "Tasman" },
  { value: "nelson", label: "Nelson" },
  { value: "marlborough", label: "Marlborough" },
  { value: "west-coast", label: "West Coast" },
  { value: "canterbury", label: "Canterbury" },
  { value: "otago", label: "Otago" },
  { value: "southland", label: "Southland" },
];

const SPECIALISATIONS = [
  { value: "metal", label: "Metal Roofing" },
  { value: "tile", label: "Tile Roofing" },
  { value: "membrane", label: "Membrane Roofing" },
  { value: "slate", label: "Slate Roofing" },
  { value: "shingle", label: "Shingle Roofing" },
  { value: "commercial", label: "Commercial" },
  { value: "heritage", label: "Heritage Buildings" },
  { value: "disputes", label: "Dispute Resolution" },
];

const AVAILABILITY_STATUS = [
  { value: "AVAILABLE", label: "Available", color: "bg-green-500" },
  { value: "BUSY", label: "Busy", color: "bg-amber-500" },
  { value: "ON_LEAVE", label: "On Leave", color: "bg-gray-500" },
];

export default function InspectorDirectoryPage() {
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");
  const [specialisation, setSpecialisation] = useState("");
  const [availability, setAvailability] = useState("");

  const fetchInspectors = useCallback(
    async (reset = false) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (region) params.set("region", region);
        if (specialisation) params.set("specialisation", specialisation);
        if (availability) params.set("availability", availability);
        if (!reset) params.set("offset", String(inspectors.length));

        const response = await fetch(`/api/inspectors?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch");

        const data: InspectorsResponse = await response.json();

        if (reset) {
          setInspectors(data.inspectors);
        } else {
          setInspectors((prev) => [...prev, ...data.inspectors]);
        }
        setTotalCount(data.pagination.total);
        setHasMore(data.pagination.hasMore);
      } catch (error) {
        console.error("Error fetching inspectors:", error);
      } finally {
        setLoading(false);
      }
    },
    [search, region, specialisation, availability, inspectors.length]
  );

  // Initial fetch and filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInspectors(true);
    }, 300); // Debounce search

    return () => clearTimeout(timer);
  }, [search, region, specialisation, availability]);

  const clearFilters = () => {
    setSearch("");
    setRegion("");
    setSpecialisation("");
    setAvailability("");
  };

  const hasFilters = search || region || specialisation || availability;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[var(--ranz-charcoal)] text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <Users className="h-8 w-8 text-[var(--ranz-yellow)]" />
            <h1 className="text-3xl font-bold">Find an Inspector</h1>
          </div>
          <p className="text-white/70 max-w-2xl">
            Browse our directory of RANZ-verified roofing inspectors across New Zealand.
            All inspectors are qualified professionals committed to delivering high-quality inspection reports.
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger className="w-[160px]">
                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Regions</SelectItem>
                  {NZ_REGIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={specialisation} onValueChange={setSpecialisation}>
                <SelectTrigger className="w-[180px]">
                  <Award className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Specialisation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Specialisations</SelectItem>
                  {SPECIALISATIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={availability} onValueChange={setAvailability}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any Status</SelectItem>
                  {AVAILABILITY_STATUS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasFilters && (
                <Button variant="ghost" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Results count */}
          <div className="mt-3 text-sm text-muted-foreground">
            {loading ? (
              "Searching..."
            ) : (
              <>
                Found <strong>{totalCount}</strong> inspector
                {totalCount !== 1 ? "s" : ""}
                {hasFilters && " matching your criteria"}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading && inspectors.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : inspectors.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Inspectors Found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search criteria or clearing filters.
              </p>
              {hasFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {inspectors.map((inspector) => (
                <InspectorCard key={inspector.id} inspector={inspector} />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="text-center mt-8">
                <Button
                  variant="outline"
                  onClick={() => fetchInspectors(false)}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* CTA */}
      <div className="bg-[var(--ranz-blue-50)] border-t">
        <div className="max-w-6xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold text-[var(--ranz-blue-900)] mb-4">
            Need an Inspection?
          </h2>
          <p className="text-[var(--ranz-blue-700)] mb-6 max-w-xl mx-auto">
            Can&apos;t find the right inspector? Submit a request and we&apos;ll help match
            you with a qualified RANZ inspector in your area.
          </p>
          <Link href="/request-inspection">
            <Button size="lg" className="bg-[var(--ranz-blue-600)] hover:bg-[var(--ranz-blue-700)]">
              Request an Inspection
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function InspectorCard({ inspector }: { inspector: Inspector }) {
  const availabilityInfo = AVAILABILITY_STATUS.find(
    (s) => s.value === inspector.availabilityStatus
  ) || AVAILABILITY_STATUS[0];

  const regionLabels = inspector.serviceAreas
    .slice(0, 3)
    .map((area) => NZ_REGIONS.find((r) => r.value === area)?.label || area);

  return (
    <Link href={`/inspectors/${inspector.id}`}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="h-14 w-14 rounded-full bg-[var(--ranz-charcoal)] flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-white">
                {inspector.name.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{inspector.name}</h3>
                <span
                  className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    availabilityInfo.color
                  )}
                  title={availabilityInfo.label}
                />
              </div>

              {inspector.company && (
                <p className="text-sm text-muted-foreground truncate">
                  {inspector.company}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                {inspector.yearsExperience && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5" />
                    {inspector.yearsExperience}+ yrs
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  {inspector.completedReports} reports
                </span>
                {inspector.lbpNumber && (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    LBP
                  </span>
                )}
              </div>

              {/* Service Areas */}
              {regionLabels.length > 0 && (
                <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">
                    {regionLabels.join(", ")}
                    {inspector.serviceAreas.length > 3 && ` +${inspector.serviceAreas.length - 3}`}
                  </span>
                </div>
              )}

              {/* Specialisations */}
              {inspector.specialisations.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {inspector.specialisations.slice(0, 3).map((spec) => (
                    <Badge key={spec} variant="secondary" className="text-xs">
                      {SPECIALISATIONS.find((s) => s.value === spec)?.label || spec}
                    </Badge>
                  ))}
                  {inspector.specialisations.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{inspector.specialisations.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Arrow */}
            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
