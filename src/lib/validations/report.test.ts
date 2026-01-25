import { describe, it, expect } from "vitest";
import {
  CreateReportSchema,
  UpdateReportSchema,
  PropertyTypeEnum,
  InspectionTypeEnum,
} from "./report";

describe("Report Validation Schemas", () => {
  describe("PropertyTypeEnum", () => {
    it("should accept valid property types", () => {
      expect(PropertyTypeEnum.parse("RESIDENTIAL_1")).toBe("RESIDENTIAL_1");
      expect(PropertyTypeEnum.parse("COMMERCIAL_LOW")).toBe("COMMERCIAL_LOW");
      expect(PropertyTypeEnum.parse("INDUSTRIAL")).toBe("INDUSTRIAL");
    });

    it("should reject invalid property types", () => {
      expect(() => PropertyTypeEnum.parse("INVALID")).toThrow();
      expect(() => PropertyTypeEnum.parse("")).toThrow();
    });
  });

  describe("InspectionTypeEnum", () => {
    it("should accept valid inspection types", () => {
      expect(InspectionTypeEnum.parse("FULL_INSPECTION")).toBe("FULL_INSPECTION");
      expect(InspectionTypeEnum.parse("PRE_PURCHASE")).toBe("PRE_PURCHASE");
      expect(InspectionTypeEnum.parse("DISPUTE_RESOLUTION")).toBe("DISPUTE_RESOLUTION");
    });

    it("should reject invalid inspection types", () => {
      expect(() => InspectionTypeEnum.parse("INVALID_TYPE")).toThrow();
    });
  });

  describe("CreateReportSchema", () => {
    const validReport = {
      propertyAddress: "123 Test Street",
      propertyCity: "Auckland",
      propertyRegion: "Auckland",
      propertyPostcode: "1010",
      propertyType: "RESIDENTIAL_1",
      inspectionDate: "2025-01-15",
      inspectionType: "FULL_INSPECTION",
      clientName: "Test Client",
    };

    it("should accept valid report data", () => {
      const result = CreateReportSchema.parse(validReport);
      expect(result.propertyAddress).toBe("123 Test Street");
      expect(result.propertyType).toBe("RESIDENTIAL_1");
      expect(result.inspectionDate).toBeInstanceOf(Date);
    });

    it("should accept report with optional fields", () => {
      const reportWithOptionals = {
        ...validReport,
        clientEmail: "client@example.com",
        clientPhone: "021-123-4567",
        weatherConditions: "Sunny, 22°C",
        accessMethod: "Ladder",
      };
      const result = CreateReportSchema.parse(reportWithOptionals);
      expect(result.clientEmail).toBe("client@example.com");
      expect(result.weatherConditions).toBe("Sunny, 22°C");
    });

    it("should reject missing required fields", () => {
      const invalidReport = {
        propertyAddress: "123 Test Street",
        // Missing other required fields
      };
      expect(() => CreateReportSchema.parse(invalidReport)).toThrow();
    });

    it("should reject empty property address", () => {
      const invalidReport = {
        ...validReport,
        propertyAddress: "",
      };
      expect(() => CreateReportSchema.parse(invalidReport)).toThrow();
    });

    it("should reject invalid email format", () => {
      const invalidReport = {
        ...validReport,
        clientEmail: "not-an-email",
      };
      expect(() => CreateReportSchema.parse(invalidReport)).toThrow();
    });

    it("should accept empty string for email (optional)", () => {
      const reportWithEmptyEmail = {
        ...validReport,
        clientEmail: "",
      };
      // Empty string should be accepted as it's allowed
      const result = CreateReportSchema.parse(reportWithEmptyEmail);
      expect(result.clientEmail).toBe("");
    });

    it("should coerce date strings to Date objects", () => {
      const result = CreateReportSchema.parse(validReport);
      expect(result.inspectionDate).toBeInstanceOf(Date);
      expect(result.inspectionDate.toISOString()).toContain("2025-01-15");
    });
  });

  describe("UpdateReportSchema", () => {
    it("should accept partial updates", () => {
      const update = {
        propertyAddress: "456 New Street",
        status: "IN_PROGRESS",
      };
      const result = UpdateReportSchema.parse(update);
      expect(result.propertyAddress).toBe("456 New Street");
      expect(result.status).toBe("IN_PROGRESS");
    });

    it("should accept empty object (no updates)", () => {
      const result = UpdateReportSchema.parse({});
      expect(Object.keys(result).length).toBe(0);
    });

    it("should accept nullable fields", () => {
      const update = {
        weatherConditions: null,
        temperature: null,
        gpsLat: null,
      };
      const result = UpdateReportSchema.parse(update);
      expect(result.weatherConditions).toBeNull();
      expect(result.temperature).toBeNull();
    });

    it("should accept JSON fields", () => {
      const update = {
        scopeOfWorks: { areas: ["roof", "gutters"] },
        methodology: { steps: ["visual inspection", "measurements"] },
      };
      const result = UpdateReportSchema.parse(update);
      expect(result.scopeOfWorks).toEqual({ areas: ["roof", "gutters"] });
    });

    it("should validate GPS coordinates range", () => {
      const validGps = {
        gpsLat: -36.8485,
        gpsLng: 174.7633,
      };
      const result = UpdateReportSchema.parse(validGps);
      expect(result.gpsLat).toBe(-36.8485);

      const invalidGps = {
        gpsLat: 100, // Invalid: > 90
      };
      expect(() => UpdateReportSchema.parse(invalidGps)).toThrow();
    });
  });
});
