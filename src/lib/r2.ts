import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs/promises";
import path from "path";

const isLocalStorage = !process.env.R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID === "your-account-id";

// Local storage directory for development
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export const r2 = isLocalStorage
  ? null
  : new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });

async function ensureLocalDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // Directory might already exist
  }
}

export async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  if (isLocalStorage) {
    // Local file storage for development
    const filePath = path.join(LOCAL_UPLOAD_DIR, key);
    await ensureLocalDir(path.dirname(filePath));
    await fs.writeFile(filePath, buffer);
    return `/uploads/${key}`;
  }

  await r2!.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

export async function deleteFromR2(key: string): Promise<void> {
  if (isLocalStorage) {
    const filePath = path.join(LOCAL_UPLOAD_DIR, key);
    try {
      await fs.unlink(filePath);
    } catch {
      // File might not exist
    }
    return;
  }

  await r2!.send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    })
  );
}

export function generatePhotoKey(reportId: string, filename: string): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `reports/${reportId}/photos/${timestamp}-${sanitizedFilename}`;
}

export function generateFileKey(reportId: string, filename: string, folder: string = "files"): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `reports/${reportId}/${folder}/${timestamp}-${sanitizedFilename}`;
}

export function generateThumbnailKey(photoKey: string): string {
  return photoKey.replace("/photos/", "/thumbnails/");
}

export function generateAnnotatedKey(photoKey: string): string {
  return photoKey.replace("/photos/", "/annotated/");
}

/**
 * Generate a presigned URL for direct upload from mobile devices
 * @param key The R2 object key
 * @param contentType The content type of the file
 * @param expiresIn Expiration time in seconds (default: 1 hour)
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  if (isLocalStorage) {
    // For local development, return a direct upload endpoint
    return `/api/photos/direct-upload?key=${encodeURIComponent(key)}`;
  }

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(r2!, command, { expiresIn });
}
