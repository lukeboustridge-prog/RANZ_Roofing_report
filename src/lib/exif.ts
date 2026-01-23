/**
 * EXIF Extraction Utility for Legal-Grade Evidence
 *
 * This module extracts forensic-quality photo metadata required for:
 * - Evidence Act 2006 Section 137 compliance
 * - High Court Rules Schedule 4 requirements
 * - Chain of custody documentation
 *
 * All fields are critical for establishing photo authenticity in court proceedings.
 */

import exifr from "exifr";
import crypto from "crypto";

/**
 * Complete EXIF data structure for forensic evidence
 */
export interface ExifData {
  // Timestamp data - proves when photo was taken
  capturedAt?: Date; // DateTimeOriginal
  digitizedAt?: Date; // DateTimeDigitized

  // GPS data - proves location of photo capture
  gpsLat?: number; // Decimal degrees format
  gpsLng?: number; // Decimal degrees format
  gpsAltitude?: number; // Meters above sea level

  // Device identification - proves which device took the photo
  cameraMake?: string; // Manufacturer (e.g., "Apple", "Samsung")
  cameraModel?: string; // Model (e.g., "iPhone 14 Pro")
  cameraSerial?: string; // Serial number (critical for evidence chain)
  software?: string; // Firmware version

  // Image settings - proves photo was not artificially generated
  exposureTime?: string; // Shutter speed (e.g., "1/125")
  fNumber?: number; // Aperture (e.g., 2.8)
  iso?: number; // ISO sensitivity
  focalLength?: number; // Focal length in mm
  flash?: string; // Flash status

  // Image integrity fields
  imageUniqueId?: string; // Unique identifier assigned by camera
  whiteBalance?: string; // White balance mode

  // Processing information
  colorSpace?: string; // Color space (sRGB, Adobe RGB)
  orientation?: number; // Image orientation (1-8)

  // Lens information
  lensModel?: string;
  lensMake?: string;

  // Forensic assessment
  hasCompleteExif: boolean; // Whether critical forensic fields are present
  missingCriticalFields: string[]; // List of missing critical fields
}

/**
 * Chain of custody data - subset of EXIF used for proof of authenticity
 */
export interface ChainOfCustodyData {
  capturedAt?: Date;
  gpsLat?: number;
  gpsLng?: number;
  cameraMake?: string;
  cameraModel?: string;
  cameraSerial?: string;
  imageUniqueId?: string;
  originalHash: string;
}

/**
 * Processed photo result including hash and thumbnail
 */
export interface ProcessedPhoto {
  hash: string;
  exif: ExifData;
  thumbnail: Buffer;
}

// Critical fields that should be present for legal evidence
const CRITICAL_FORENSIC_FIELDS = [
  "capturedAt",
  "gpsLat",
  "gpsLng",
  "cameraMake",
  "cameraModel",
];

/**
 * Extract EXIF data from a File object (browser/web upload)
 */
export async function extractExifFromFile(file: File): Promise<ExifData> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    return extractExifFromBuffer(Buffer.from(arrayBuffer));
  } catch (error) {
    console.warn("Failed to extract EXIF from file:", error);
    return createEmptyExifData();
  }
}

/**
 * Extract EXIF data from a Buffer (server-side/mobile)
 */
export async function extractExifFromBuffer(buffer: Buffer): Promise<ExifData> {
  try {
    // Parse all available EXIF data
    const rawExif = await exifr.parse(buffer, {
      // Request all relevant tags
      tiff: true,
      exif: true,
      gps: true,
      ifd1: true, // Thumbnail IFD
      // Specific tags we need
      pick: [
        // Timestamps
        "DateTimeOriginal",
        "DateTimeDigitized",
        "CreateDate",
        // GPS
        "GPSLatitude",
        "GPSLongitude",
        "GPSAltitude",
        "GPSLatitudeRef",
        "GPSLongitudeRef",
        // Device
        "Make",
        "Model",
        "SerialNumber",
        "BodySerialNumber",
        "CameraSerialNumber",
        "Software",
        // Settings
        "ExposureTime",
        "FNumber",
        "ISO",
        "ISOSpeedRatings",
        "FocalLength",
        "Flash",
        // Integrity
        "ImageUniqueID",
        "WhiteBalance",
        // Processing
        "ColorSpace",
        "Orientation",
        // Lens
        "LensModel",
        "LensMake",
      ],
    });

    if (!rawExif) {
      console.warn("No EXIF data found in image");
      return createEmptyExifData();
    }

    // Build typed EXIF data object
    const exifData: ExifData = {
      // Timestamps
      capturedAt: parseExifDate(rawExif.DateTimeOriginal || rawExif.CreateDate),
      digitizedAt: parseExifDate(rawExif.DateTimeDigitized),

      // GPS - exifr automatically converts to decimal degrees
      gpsLat: rawExif.GPSLatitude ?? rawExif.latitude,
      gpsLng: rawExif.GPSLongitude ?? rawExif.longitude,
      gpsAltitude: rawExif.GPSAltitude,

      // Device identification
      cameraMake: rawExif.Make,
      cameraModel: rawExif.Model,
      cameraSerial:
        rawExif.SerialNumber ||
        rawExif.BodySerialNumber ||
        rawExif.CameraSerialNumber,
      software: rawExif.Software,

      // Image settings
      exposureTime: rawExif.ExposureTime
        ? formatExposureTime(rawExif.ExposureTime)
        : undefined,
      fNumber: rawExif.FNumber,
      iso: rawExif.ISO || rawExif.ISOSpeedRatings,
      focalLength: rawExif.FocalLength,
      flash: rawExif.Flash ? formatFlashStatus(rawExif.Flash) : undefined,

      // Integrity
      imageUniqueId: rawExif.ImageUniqueID,
      whiteBalance: rawExif.WhiteBalance
        ? String(rawExif.WhiteBalance)
        : undefined,

      // Processing
      colorSpace: rawExif.ColorSpace ? formatColorSpace(rawExif.ColorSpace) : undefined,
      orientation: rawExif.Orientation,

      // Lens
      lensModel: rawExif.LensModel,
      lensMake: rawExif.LensMake,

      // Forensic assessment
      hasCompleteExif: false,
      missingCriticalFields: [],
    };

    // Assess forensic completeness
    const missingFields: string[] = [];
    for (const field of CRITICAL_FORENSIC_FIELDS) {
      if (exifData[field as keyof ExifData] === undefined) {
        missingFields.push(field);
      }
    }

    exifData.missingCriticalFields = missingFields;
    exifData.hasCompleteExif = missingFields.length === 0;

    // Log warning if critical fields missing
    if (missingFields.length > 0) {
      console.warn(
        `Photo missing critical forensic EXIF fields: ${missingFields.join(", ")}`
      );
    }

    return exifData;
  } catch (error) {
    console.error("Error extracting EXIF data:", error);
    return createEmptyExifData();
  }
}

/**
 * Validate EXIF integrity for legal evidence
 * Returns true if the photo has sufficient metadata for court use
 */
export function validateExifIntegrity(exifData: ExifData): boolean {
  // Must have timestamp
  if (!exifData.capturedAt) {
    return false;
  }

  // Must have device identification
  if (!exifData.cameraMake || !exifData.cameraModel) {
    return false;
  }

  // GPS is highly recommended but not strictly required
  // (some inspections may be done without GPS-enabled devices)

  return true;
}

/**
 * Extract only the fields needed for chain of custody documentation
 */
export function getExifForChainOfCustody(
  exifData: ExifData,
  originalHash: string
): ChainOfCustodyData {
  return {
    capturedAt: exifData.capturedAt,
    gpsLat: exifData.gpsLat,
    gpsLng: exifData.gpsLng,
    cameraMake: exifData.cameraMake,
    cameraModel: exifData.cameraModel,
    cameraSerial: exifData.cameraSerial,
    imageUniqueId: exifData.imageUniqueId,
    originalHash,
  };
}

/**
 * Process a photo: extract EXIF, generate hash, create thumbnail
 */
export async function processPhoto(buffer: Buffer): Promise<ProcessedPhoto> {
  // Generate SHA-256 hash BEFORE any processing (for evidence integrity)
  // This hash proves the image hasn't been modified since capture
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");

  // Extract EXIF data
  const exif = await extractExifFromBuffer(buffer);

  // Generate thumbnail
  let thumbnail: Buffer;
  try {
    const sharp = (await import("sharp")).default;
    thumbnail = await sharp(buffer)
      .resize(300, 300, { fit: "cover" })
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch (error) {
    console.warn("Sharp not available, using original as thumbnail:", error);
    thumbnail = buffer;
  }

  return { hash, exif, thumbnail };
}

/**
 * Generate SHA-256 hash of image buffer
 */
export function generateHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Generate thumbnail using Sharp
 */
export async function generateThumbnail(
  buffer: Buffer,
  width = 300,
  height = 300
): Promise<Buffer> {
  try {
    const sharp = (await import("sharp")).default;
    return sharp(buffer)
      .resize(width, height, { fit: "cover" })
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch (error) {
    console.warn("Sharp not available, returning original:", error);
    return buffer;
  }
}

// Helper functions

function createEmptyExifData(): ExifData {
  return {
    hasCompleteExif: false,
    missingCriticalFields: [...CRITICAL_FORENSIC_FIELDS],
  };
}

function parseExifDate(value: unknown): Date | undefined {
  if (!value) return undefined;

  // If already a Date object (exifr sometimes returns these)
  if (value instanceof Date) {
    return value;
  }

  // If string, parse it
  if (typeof value === "string") {
    // EXIF date format: "YYYY:MM:DD HH:MM:SS"
    const match = value.match(
      /(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/
    );
    if (match) {
      const [, year, month, day, hour, minute, second] = match;
      return new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseInt(second)
      );
    }

    // Try standard ISO parsing
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return undefined;
}

function formatExposureTime(value: number): string {
  if (value >= 1) {
    return `${value}s`;
  }
  // Convert decimal to fraction
  const denominator = Math.round(1 / value);
  return `1/${denominator}`;
}

function formatFlashStatus(value: number | string): string {
  if (typeof value === "string") return value;

  // Common flash values
  const flashModes: Record<number, string> = {
    0: "No Flash",
    1: "Flash Fired",
    5: "Flash Fired, Strobe Return Light Not Detected",
    7: "Flash Fired, Strobe Return Light Detected",
    9: "Flash Fired, Compulsory",
    13: "Flash Fired, Compulsory, Return Light Not Detected",
    15: "Flash Fired, Compulsory, Return Light Detected",
    16: "No Flash Function",
    24: "No Flash, Auto",
    25: "Flash Fired, Auto",
    29: "Flash Fired, Auto, Return Light Not Detected",
    31: "Flash Fired, Auto, Return Light Detected",
  };

  return flashModes[value] || `Flash Code: ${value}`;
}

function formatColorSpace(value: number | string): string {
  if (typeof value === "string") return value;

  const colorSpaces: Record<number, string> = {
    1: "sRGB",
    2: "Adobe RGB",
    65535: "Uncalibrated",
  };

  return colorSpaces[value] || `Color Space: ${value}`;
}
