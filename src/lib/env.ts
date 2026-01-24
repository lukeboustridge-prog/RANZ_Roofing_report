/**
 * Environment variable validation
 * Ensures all required environment variables are set at build/startup time
 */

const requiredEnvVars = [
  "DATABASE_URL",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
] as const;

const optionalEnvVars = [
  "NEXT_PUBLIC_APP_URL",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_ACCOUNT_ID",
  "RESEND_API_KEY",
] as const;

type RequiredEnvVar = (typeof requiredEnvVars)[number];
type OptionalEnvVar = (typeof optionalEnvVars)[number];

interface EnvConfig {
  // Required
  DATABASE_URL: string;
  CLERK_SECRET_KEY: string;
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: string;

  // Optional with defaults
  NEXT_PUBLIC_APP_URL: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  R2_ACCOUNT_ID?: string;
  RESEND_API_KEY?: string;

  // Computed
  isProduction: boolean;
  isDevelopment: boolean;
}

function validateEnv(): EnvConfig {
  const missingVars: string[] = [];

  // Check required variables
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missingVars.map((v) => `  - ${v}`).join("\n")}\n\nPlease add these to your .env file.`
    );
  }

  return {
    // Required (already validated)
    DATABASE_URL: process.env.DATABASE_URL!,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY!,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,

    // Optional with defaults
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    RESEND_API_KEY: process.env.RESEND_API_KEY,

    // Computed
    isProduction: process.env.NODE_ENV === "production",
    isDevelopment: process.env.NODE_ENV === "development",
  };
}

// Validate on import (will throw if missing required vars)
export const env = validateEnv();

// Type-safe getter for optional vars
export function getEnvVar(name: OptionalEnvVar): string | undefined {
  return process.env[name];
}

// Check if storage is configured
export function isStorageConfigured(): boolean {
  return !!(
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_ACCOUNT_ID
  );
}

// Check if email is configured
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
