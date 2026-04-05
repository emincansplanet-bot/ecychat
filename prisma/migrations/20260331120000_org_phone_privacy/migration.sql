-- AlterTable
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "privacyPhoneRevealRoles" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "privacyRevealWaIdOverride" BOOLEAN NOT NULL DEFAULT false;
