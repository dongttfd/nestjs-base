-- AlterTable
ALTER TABLE `consumptions` ADD COLUMN `categoryKey` VARCHAR(30) NULL DEFAULT 'other';

-- CreateIndex
CREATE INDEX `consumptions_userId_categoryKey_idx` ON `consumptions`(`userId`, `categoryKey`);
