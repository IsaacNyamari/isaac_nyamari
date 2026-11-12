-- AlterTable
ALTER TABLE "site_settings" ADD COLUMN "googleVerification" TEXT NOT NULL DEFAULT '',
ADD COLUMN "bingVerification" TEXT NOT NULL DEFAULT '',
ADD COLUMN "twitterHandle" TEXT NOT NULL DEFAULT '';
