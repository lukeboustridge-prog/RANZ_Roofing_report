-- CreateEnum: ComplianceStatus
CREATE TYPE "ComplianceStatus" AS ENUM ('PASS', 'FAIL', 'PARTIAL', 'NOT_ASSESSED');

-- AlterTable: Add complianceStatus to Report
ALTER TABLE "Report" ADD COLUMN "complianceStatus" "ComplianceStatus" NOT NULL DEFAULT 'NOT_ASSESSED';

-- CreateIndex: complianceStatus on Report
CREATE INDEX "Report_complianceStatus_idx" ON "Report"("complianceStatus");

-- AlterTable: Add searchVector to Report
ALTER TABLE "Report" ADD COLUMN "searchVector" tsvector;

-- CreateIndex: GIN index on searchVector for full-text search
CREATE INDEX "Report_searchVector_idx" ON "Report" USING GIN ("searchVector");

-- Create trigger function to auto-populate searchVector
CREATE OR REPLACE FUNCTION report_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW."propertyAddress", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW."clientName", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW."reportNumber", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW."propertyCity", '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW."propertyRegion", '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW."clientEmail", '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW."limitations", '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on Report insert/update
CREATE TRIGGER report_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "Report"
  FOR EACH ROW
  EXECUTE FUNCTION report_search_vector_update();

-- Backfill searchVector for existing reports
UPDATE "Report" SET "searchVector" =
  setweight(to_tsvector('english', coalesce("propertyAddress", '')), 'A') ||
  setweight(to_tsvector('english', coalesce("clientName", '')), 'A') ||
  setweight(to_tsvector('english', coalesce("reportNumber", '')), 'A') ||
  setweight(to_tsvector('english', coalesce("propertyCity", '')), 'B') ||
  setweight(to_tsvector('english', coalesce("propertyRegion", '')), 'B') ||
  setweight(to_tsvector('english', coalesce("clientEmail", '')), 'C') ||
  setweight(to_tsvector('english', coalesce("limitations", '')), 'D');

-- CreateTable: EmailEvent
CREATE TABLE "EmailEvent" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: EmailEvent indexes
CREATE INDEX "EmailEvent_messageId_idx" ON "EmailEvent"("messageId");
CREATE INDEX "EmailEvent_email_idx" ON "EmailEvent"("email");
CREATE INDEX "EmailEvent_type_idx" ON "EmailEvent"("type");
CREATE INDEX "EmailEvent_timestamp_idx" ON "EmailEvent"("timestamp");
