-- AlterTable
ALTER TABLE `expense_overview_snapshots`
  ADD COLUMN `taxonomyVersion` VARCHAR(191) NOT NULL DEFAULT 'expense-taxonomy-canonical-v2',
  ADD COLUMN `classifierVersion` VARCHAR(191) NOT NULL DEFAULT 'expense-classifier-db-title-v2';

-- Purge legacy snapshots generated before the canonical taxonomy refresh.
DELETE FROM `expense_overview_snapshots`;
