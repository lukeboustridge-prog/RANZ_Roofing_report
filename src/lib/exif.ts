import sharp from "sharp";
import crypto from "crypto";

export interface ExifData {
  capturedAt?: Date;
  gpsLat?: number;
  gpsLng?: number;
  cameraMake?: string;
  cameraModel?: string;
}

export interface ProcessedPhoto {
  hash: string;
  exif: ExifData;
  thumbnail: Buffer;
}

function parseExifDate(dateString: string | undefined): Date | undefined {
  if (!dateString) return undefined;
  // EXIF date format: "YYYY:MM:DD HH:MM:SS"
  const match = dateString.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  if (!match) return undefined;
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

function convertGpsCoordinate(
  coordinate: number[] | undefined,
  ref: string | undefined
): number | undefined {
  if (!coordinate || !ref || coordinate.length < 3) return undefined;
  const [degrees, minutes, seconds] = coordinate;
  let decimal = degrees + minutes / 60 + seconds / 3600;
  if (ref === "S" || ref === "W") {
    decimal = -decimal;
  }
  return decimal;
}

export async function processPhoto(buffer: Buffer): Promise<ProcessedPhoto> {
  // Generate SHA-256 hash BEFORE any processing (for evidence integrity)
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");

  // Extract metadata
  const metadata = await sharp(buffer).metadata();

  // Parse EXIF data
  const exif: ExifData = {};

  if (metadata.exif) {
    try {
      // Sharp provides raw EXIF buffer, we need to parse it
      // For now, extract what we can from sharp metadata
      exif.cameraMake = metadata.exif ? "See EXIF" : undefined;
      exif.cameraModel = metadata.exif ? "See EXIF" : undefined;
    } catch (e) {
      console.error("Error parsing EXIF:", e);
    }
  }

  // Generate thumbnail (300x300, cover fit)
  const thumbnail = await sharp(buffer)
    .resize(300, 300, { fit: "cover" })
    .jpeg({ quality: 80 })
    .toBuffer();

  return { hash, exif, thumbnail };
}

export async function generateThumbnail(
  buffer: Buffer,
  width = 300,
  height = 300
): Promise<Buffer> {
  return sharp(buffer)
    .resize(width, height, { fit: "cover" })
    .jpeg({ quality: 80 })
    .toBuffer();
}

export function generateHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
