import type {
  Report,
  User,
  Photo,
  Defect,
  RoofElement,
  ReportStatus,
  PropertyType,
  InspectionType,
  DefectClass,
  DefectSeverity,
  PriorityLevel,
  PhotoType,
  ElementType,
  ConditionRating,
} from "@prisma/client";

// Re-export Prisma types
export type {
  Report,
  User,
  Photo,
  Defect,
  RoofElement,
  ReportStatus,
  PropertyType,
  InspectionType,
  DefectClass,
  DefectSeverity,
  PriorityLevel,
  PhotoType,
  ElementType,
  ConditionRating,
};

// Extended types with relations
export type ReportWithRelations = Report & {
  inspector: User;
  photos: Photo[];
  defects: Defect[];
  roofElements: RoofElement[];
};

export type DefectWithPhotos = Defect & {
  photos: Photo[];
};

// Form types
export interface CreateReportInput {
  propertyAddress: string;
  propertyCity: string;
  propertyRegion: string;
  propertyPostcode: string;
  propertyType: PropertyType;
  buildingAge?: number;
  inspectionDate: Date;
  inspectionType: InspectionType;
  weatherConditions?: string;
  accessMethod?: string;
  limitations?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
}

export interface CreateDefectInput {
  title: string;
  description: string;
  location: string;
  classification: DefectClass;
  severity: DefectSeverity;
  observation: string;
  analysis?: string;
  opinion?: string;
  codeReference?: string;
  copReference?: string;
  recommendation?: string;
  priorityLevel?: PriorityLevel;
  roofElementId?: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Dashboard stats
export interface DashboardStats {
  totalReports: number;
  draftReports: number;
  inProgressReports: number;
  pendingReviewReports: number;
  completedReports: number;
}
