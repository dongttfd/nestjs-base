/*
  Warnings:

  - A unique constraint covering the columns `[id]` on the table `expense_overview_snapshots` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `expense_overview_snapshots` MODIFY `lastSuccessfulRefreshAt` TIMESTAMP(3) NULL,
    MODIFY `lastAttemptAt` TIMESTAMP(3) NULL,
    MODIFY `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updatedAt` TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `expense_overview_snapshots_id_key` ON `expense_overview_snapshots`(`id`);
