-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'NOBETCI';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "onDutySchedule" JSONB;
