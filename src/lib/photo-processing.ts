/**
 * Photo Processing Utilities
 *
 * Reusable utilities for server-side photo processing:
 * - Thumbnail generation
 * - SHA-256 hash computation
 * - Hash verification
 * - Image metadata extraction
 *
 * Used by confirm-upload endpoint and potentially other photo-handling routes.
 */

import crypto from "crypto";
import sharp from "sharp";

/**
 * Thumbnail configuration constants
 */
export const THUMBNAIL_CONFIG = {
  width: 200,
  height: 200,
  quality: 70,
  format: "jpeg" as const,
} as const;

/**
 * Result of thumbnail generation
 */
export interface ThumbnailResult {
  buffer: Buffer;
  width: number;
  height: number;
  size: number;
  format: string;
}

/**
 * Result of hash verification
 */
export interface HashVerificationResult {
  matches: boolean;
  computedHash: string;
}

/**
 * Image metadata extracted from buffer
 */
export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  hasAlpha?: boolean;
  space?: string;
}

/**
 * Combined result from processPhotoForStorage
 */
export interface PhotoProcessingResult {
  thumbnail: ThumbnailResult | null;
  hash: string;
  hashVerified: boolean;
  metadata: ImageMetadata;
}

/**
 * Generate a thumbnail from an image buffer.
 *
 * @param buffer - The source image buffer
 * @param options - Optional override for thumbnail config
 * @returns ThumbnailResult with buffer and dimensions
 */
export async function generateThumbnail(
  buffer: Buffer,
  options?: Partial<typeof THUMBNAIL_CONFIG>
): Promise<ThumbnailResult> {
  const config = { ...THUMBNAIL_CONFIG, ...options };

  const thumbnailBuffer = await sharp(buffer)
    .resize(config.width, config.height, {
      fit: "cover",
      position: "centre",
    })
    .jpeg({ quality: config.quality })
    .toBuffer();

  // Get metadata of the generated thumbnail
  const metadata = await sharp(thumbnailBuffer).metadata();

  return {
    buffer: thumbnailBuffer,
    width: metadata.width ?? config.width,
    height: metadata.height ?? config.height,
    size: thumbnailBuffer.length,
    format: config.format,
  };
}

/**
 * Compute SHA-256 hash of a buffer.
 *
 * @param buffer - The data to hash
 * @returns Lowercase hexadecimal hash string
 */
export function computePhotoHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex").toLowerCase();
}

/**
 * Verify a photo's hash against an expected value.
 * Comparison is case-insensitive for robustness.
 *
 * @param buffer - The photo buffer to verify
 * @param expectedHash - The expected hash value
 * @returns Object with match result and computed hash
 */
export function verifyPhotoHash(
  buffer: Buffer,
  expectedHash: string
): HashVerificationResult {
  const computedHash = computePhotoHash(buffer);
  const matches =
    computedHash.toLowerCase() === expectedHash.toLowerCase();

  return {
    matches,
    computedHash,
  };
}

/**
 * Extract metadata from an image buffer.
 *
 * @param buffer - The image buffer
 * @returns ImageMetadata with dimensions, format, and size
 */
export async function extractImageMetadata(
  buffer: Buffer
): Promise<ImageMetadata> {
  const metadata = await sharp(buffer).metadata();

  return {
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    format: metadata.format ?? "unknown",
    size: buffer.length,
    hasAlpha: metadata.hasAlpha,
    space: metadata.space,
  };
}

/**
 * Process a photo for storage in a single pass.
 * Combines thumbnail generation, hash computation, and metadata extraction.
 *
 * This is the primary function to use for photo upload confirmation,
 * as it efficiently processes the image once.
 *
 * @param buffer - The photo buffer to process
 * @param expectedHash - Optional expected hash for verification
 * @returns PhotoProcessingResult with all processing outputs
 */
export async function processPhotoForStorage(
  buffer: Buffer,
  expectedHash?: string
): Promise<PhotoProcessingResult> {
  // Compute hash (synchronous, fast)
  const hash = computePhotoHash(buffer);

  // Verify hash if expected value provided
  let hashVerified = true;
  if (expectedHash) {
    hashVerified = hash.toLowerCase() === expectedHash.toLowerCase();
  }

  // Extract metadata (async)
  const metadata = await extractImageMetadata(buffer);

  // Generate thumbnail (async, may fail)
  let thumbnail: ThumbnailResult | null = null;
  try {
    thumbnail = await generateThumbnail(buffer);
  } catch (error) {
    // Thumbnail generation is non-blocking
    // Log error but continue with null thumbnail
    console.error("Thumbnail generation failed:", error);
  }

  return {
    thumbnail,
    hash,
    hashVerified,
    metadata,
  };
}
