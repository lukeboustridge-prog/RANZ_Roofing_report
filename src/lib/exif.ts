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

export async function processPhoto(buffer: Buffer): Promise<ProcessedPhoto> {
  // Generate SHA-256 hash BEFORE any processing (for evidence integrity)
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");

  // Try to use Sharp for thumbnail generation
  let thumbnail: Buffer;
  const exif: ExifData = {};

  try {
    const sharp = (await import("sharp")).default;

    // Extract metadata
    const metadata = await sharp(buffer).metadata();

    // Parse EXIF data if available
    if (metadata.exif) {
      try {
        // Sharp provides limited EXIF access via metadata
        // For full EXIF, we'd need exif-parser or similar
        // Just note that EXIF exists for now
        exif.cameraMake = metadata.exif ? undefined : undefined;
        exif.cameraModel = undefined;
      } catch (e) {
        console.error("Error parsing EXIF:", e);
      }
    }

    // Generate thumbnail (300x300, cover fit)
    thumbnail = await sharp(buffer)
      .resize(300, 300, { fit: "cover" })
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch (error) {
    console.warn("Sharp not available or failed, using original image as thumbnail:", error);
    // Fallback: use original image as thumbnail (not ideal but functional)
    thumbnail = buffer;
  }

  return { hash, exif, thumbnail };
}

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

export function generateHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
